import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { telegraphService } from './server/telegraph/index.ts';
import { deFiRiskEngine, InputIntelligenceBundle, SubjectTarget } from './server/risk-engine/index.ts';

const WINDOW_MS = 60 * 60 * 1000;
const MAX_ANALYSES_PER_IP = Math.max(1, Number(process.env.MAX_ANALYSES_PER_IP_PER_HOUR) || 8);
const MAX_GLOBAL_ANALYSES = Math.max(1, Number(process.env.MAX_GLOBAL_ANALYSES_PER_HOUR) || 60);
const ipUsage = new Map<string, { count: number; resetAt: number }>();
let globalUsage = { count: 0, resetAt: Date.now() + WINDOW_MS };

function consumeAnalysisSlot(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();

  if (now >= globalUsage.resetAt) {
    globalUsage = { count: 0, resetAt: now + WINDOW_MS };
  }

  const current = ipUsage.get(ip);
  if (!current || now >= current.resetAt) {
    ipUsage.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else if (current.count >= MAX_ANALYSES_PER_IP) {
    return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
  } else {
    current.count += 1;
  }

  if (globalUsage.count >= MAX_GLOBAL_ANALYSES) {
    return { allowed: false, retryAfterSeconds: Math.ceil((globalUsage.resetAt - now) / 1000) };
  }

  globalUsage.count += 1;

  // Keep the in-memory limiter bounded on long-lived Render instances.
  if (ipUsage.size > 1000) {
    for (const [key, value] of ipUsage) {
      if (value.resetAt <= now) ipUsage.delete(key);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '32kb' }));

  // -------------------------------------------------------------
  // Backend API Endpoints (All operations proxy real Telegraph data)
  // -------------------------------------------------------------

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Telegraph DeFi Guardian Backend',
      timestamp: new Date().toISOString(),
      version: '2.1.0',
    });
  });

  app.get('/api/telegraph/overview', async (req, res) => {
    try {
      const overview = await telegraphService.getNetworkOverview();
      res.json({
        success: true,
        data: overview,
      });
    } catch (err: any) {
      console.error('Failed to fetch network overview:', err.message);
      res.status(502).json({
        success: false,
        error: 'Failed to retrieve Telegraph node overview: ' + err.message,
      });
    }
  });

  app.get('/api/telegraph/events', async (req, res) => {
    try {
      const events = await telegraphService['client'].getLiveSubnetResponses();
      res.json({
        success: true,
        count: events.length,
        data: events,
      });
    } catch (err: any) {
      console.error('Failed to fetch live events:', err.message);
      res.status(502).json({
        success: false,
        error: 'Failed to retrieve live SubnetResponse events: ' + err.message,
      });
    }
  });

  app.get('/api/telegraph/miners', async (req, res) => {
    try {
      const miners = await telegraphService['client'].getMinerIntegrations();
      res.json({
        success: true,
        count: miners.length,
        data: miners,
      });
    } catch (err: any) {
      console.error('Failed to fetch miner integrations:', err.message);
      res.status(502).json({
        success: false,
        error: 'Failed to retrieve Telegraph miner registry: ' + err.message,
      });
    }
  });

  app.post('/api/telegraph/analyze', async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const slot = consumeAnalysisSlot(ip);
    if (!slot.allowed) {
      res.setHeader('Retry-After', String(slot.retryAfterSeconds));
      return res.status(429).json({
        success: false,
        error: 'Analysis rate limit reached. Please try again later.',
        retryAfterSeconds: slot.retryAfterSeconds,
      });
    }

    try {
      const {
        target,
        analysisType = 'quick',
        chain = 'eth',
        contractAddress,
        domain,
      } = req.body;

      if (!target || typeof target !== 'string' || target.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Target parameter (token symbol, protocol name, or wallet address) is required.',
        });
      }

      const trimmedTarget = target.trim().slice(0, 200);
      const isEvmAddress = /^0x[a-fA-F0-9]{40}$/.test(trimmedTarget);

      let subjectType: 'token' | 'protocol' | 'wallet' | 'composite' = 'token';
      if (isEvmAddress) {
        subjectType = 'wallet';
      } else if (analysisType === 'protocol') {
        subjectType = 'protocol';
      } else if (analysisType === 'asset') {
        subjectType = 'token';
      } else {
        subjectType = 'composite';
      }

      const subject: SubjectTarget = {
        id: trimmedTarget.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
        name: trimmedTarget.toUpperCase(),
        symbol: isEvmAddress ? `${trimmedTarget.substring(0, 6)}...${trimmedTarget.substring(38)}` : trimmedTarget.toUpperCase(),
        type: subjectType,
        chain: chain || 'eth',
        contractAddress: isEvmAddress ? trimmedTarget : contractAddress,
      };

      const bundle: InputIntelligenceBundle = {};
      const intentPromises: Promise<any>[] = [];
      let successfulIntentCount = 0;

      if (isEvmAddress || analysisType === 'wallet') {
        intentPromises.push(
          telegraphService
            .assessWallet(isEvmAddress ? trimmedTarget : contractAddress || trimmedTarget, chain)
            .then((sig) => {
              successfulIntentCount += 1;
              bundle.walletRisk = sig;
            })
            .catch((e) => console.warn(`Wallet assessment intent unavailable for ${trimmedTarget}:`, e.message)),
        );
      }

      if (!isEvmAddress) {
        const coinQuery = trimmedTarget.toLowerCase();
        intentPromises.push(
          telegraphService
            .getCryptoPrice(coinQuery)
            .then((sig) => {
              successfulIntentCount += 1;
              bundle.price = sig;
            })
            .catch((e) => console.warn(`Crypto price intent unavailable for ${coinQuery}:`, e.message)),
        );
      }

      if (!isEvmAddress) {
        const tvlQuery = trimmedTarget.toLowerCase();
        intentPromises.push(
          telegraphService
            .getTVL(tvlQuery)
            .then((sig) => {
              successfulIntentCount += 1;
              bundle.tvl = sig;
            })
            .catch((e) => console.warn(`TVL lookup intent unavailable for ${tvlQuery}:`, e.message)),
        );
      }

      intentPromises.push(
        telegraphService
          .getGasPrice(chain || 'eth')
          .then((sig) => {
            successfulIntentCount += 1;
            bundle.gas = sig;
          })
          .catch((e) => console.warn(`Gas price intent unavailable for ${chain}:`, e.message)),
      );

      const tokenAddressToQuery = contractAddress || (isEvmAddress ? trimmedTarget : null);
      if (tokenAddressToQuery) {
        intentPromises.push(
          telegraphService
            .getTokenHolders(tokenAddressToQuery, chain || 'eth')
            .then((sig) => {
              successfulIntentCount += 1;
              bundle.holders = sig;
            })
            .catch((e) => console.warn('Token holders intent unavailable:', e.message)),
        );
      }

      if (domain || (subjectType === 'protocol' && !trimmedTarget.includes(' '))) {
        const domainToTest = String(domain || `${trimmedTarget.toLowerCase().replace(/[^a-z0-9]/g, '')}.org`).slice(0, 253);
        intentPromises.push(
          telegraphService
            .checkSSL(domainToTest)
            .then((sig) => {
              successfulIntentCount += 1;
              bundle.ssl = sig;
            })
            .catch((e) => console.warn(`SSL check intent unavailable for ${domainToTest}:`, e.message)),
        );
      }

      await Promise.all(intentPromises);

      // Never return a convincing-looking neutral report when every paid/live
      // Telegraph query failed. Partial reports are allowed and expose missing
      // categories through the deterministic risk engine.
      if (successfulIntentCount === 0) {
        return res.status(502).json({
          success: false,
          error: 'Telegraph Engine returned no usable intelligence. Check x402 payment configuration and Engine availability.',
        });
      }

      const report = deFiRiskEngine.analyze(subject, bundle);

      return res.json({
        success: true,
        data: report,
      });
    } catch (err: any) {
      console.error('Error during DeFi Guardian analysis:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to complete risk assessment: ' + err.message,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Telegraph DeFi Guardian] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
