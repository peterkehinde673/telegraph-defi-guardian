import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { telegraphService, TelegraphIntent } from './server/telegraph/index.ts';
import { deFiRiskEngine, InputIntelligenceBundle, SubjectTarget } from './server/risk-engine/index.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // -------------------------------------------------------------
  // Backend API Endpoints (All operations proxy real Telegraph data)
  // -------------------------------------------------------------

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Telegraph DeFi Guardian Backend',
      timestamp: new Date().toISOString(),
      version: '2.1.0',
    });
  });

  // 2. Telegraph Network Overview
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

  // 3. Live On-Chain Signed Events from Telegraph Node
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

  // 4. Miner Dispatcher Registry & Intent Ranking
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

  // 5. Core DeFi Guardian Risk Analysis API
  app.post('/api/telegraph/analyze', async (req, res) => {
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

      const trimmedTarget = target.trim();
      const isEvmAddress = /^0x[a-fA-F0-9]{40}$/.test(trimmedTarget);

      // Determine subject type
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

      // A. Wallet Risk Intent (if wallet address or wallet analysis requested)
      if (isEvmAddress || analysisType === 'wallet') {
        intentPromises.push(
          telegraphService
            .assessWallet(isEvmAddress ? trimmedTarget : contractAddress || trimmedTarget, chain)
            .then((sig) => {
              bundle.walletRisk = sig;
            })
            .catch((e) => console.warn(`Wallet assessment intent unavailable for ${trimmedTarget}:`, e.message)),
        );
      }

      // B. Crypto Price Intent (for assets, protocols, quick queries)
      if (!isEvmAddress) {
        const coinQuery = trimmedTarget.toLowerCase();
        intentPromises.push(
          telegraphService
            .getCryptoPrice(coinQuery)
            .then((sig) => {
              bundle.price = sig;
            })
            .catch((e) => console.warn(`Crypto price intent unavailable for ${coinQuery}:`, e.message)),
        );
      }

      // C. TVL Lookup Intent (for protocols or ecosystem assets)
      if (!isEvmAddress) {
        const tvlQuery = trimmedTarget.toLowerCase();
        intentPromises.push(
          telegraphService
            .getTVL(tvlQuery)
            .then((sig) => {
              bundle.tvl = sig;
            })
            .catch((e) => console.warn(`TVL lookup intent unavailable for ${tvlQuery}:`, e.message)),
        );
      }

      // D. Gas Price Intent (real execution conditions on target chain)
      intentPromises.push(
        telegraphService
          .getGasPrice(chain || 'eth')
          .then((sig) => {
            bundle.gas = sig;
          })
          .catch((e) => console.warn(`Gas price intent unavailable for ${chain}:`, e.message)),
      );

      // E. Token Holder Count Intent (if contract address provided or standard token)
      const tokenAddressToQuery = contractAddress || (isEvmAddress ? trimmedTarget : null);
      if (tokenAddressToQuery) {
        intentPromises.push(
          telegraphService
            .getTokenHolders(tokenAddressToQuery, chain || 'eth')
            .then((sig) => {
              bundle.holders = sig;
            })
            .catch((e) => console.warn(`Token holders intent unavailable:`, e.message)),
        );
      }

      // F. SSL Handshake Intent (if domain provided or known protocol)
      if (domain || (subjectType === 'protocol' && !trimmedTarget.includes(' '))) {
        const domainToTest = domain || `${trimmedTarget.toLowerCase().replace(/[^a-z0-9]/g, '')}.org`;
        intentPromises.push(
          telegraphService
            .checkSSL(domainToTest)
            .then((sig) => {
              bundle.ssl = sig;
            })
            .catch((e) => console.warn(`SSL check intent unavailable for ${domainToTest}:`, e.message)),
        );
      }

      // Wait for all real intent dispatches to complete concurrently
      await Promise.all(intentPromises);

      // Execute deterministic risk assessment on verified normalized intelligence
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

  // -------------------------------------------------------------
  // Vite Middleware / Static Asset Serving
  // -------------------------------------------------------------
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
