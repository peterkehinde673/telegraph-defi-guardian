import 'dotenv/config';
import { wrapFetchWithPayment } from '@x402/fetch';
import { x402Client } from '@x402/core/client';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { toClientEvmSigner } from '@x402/evm';
import { privateKeyToAccount } from 'viem/accounts';
import {
  MinerAttribution,
  TelegraphEndpoint,
  TelegraphIntent,
  TelegraphMinerIntegration,
  TelegraphNodeStatus,
  TelegraphSubnetResponseEvent,
} from './types.ts';

export interface TelegraphClientConfig {
  nodeUrl?: string;
  engineUrl?: string;
  daemonUrl?: string;
  evmPrivateKey?: string;
  timeoutMs?: number;
}

export class TelegraphClient {
  private nodeUrl: string;
  private engineUrl: string;
  private daemonUrl: string;
  private evmPrivateKey?: string;
  private timeoutMs: number;
  private cachedMiners: TelegraphMinerIntegration[] | null = null;
  private minersCachedAt = 0;
  private readonly CACHE_TTL_MS = 60_000;
  private paymentFetch: typeof fetch | null = null;
  private askQueue: Promise<any> = Promise.resolve();

  constructor(config: TelegraphClientConfig = {}) {
    this.nodeUrl = (config.nodeUrl || process.env.TELEGRAPH_NODE_URL || 'https://devnode.telegraphprotocol.com').replace(/\/$/, '');
    let engineUrl = (config.engineUrl || process.env.TELEGRAPH_ENGINE_URL || 'http://13.237.89.59:7044/engine').replace(/\/$/, '');
    if ((engineUrl.endsWith(':7044') || engineUrl.includes('devnode.telegraphprotocol.com')) && !engineUrl.endsWith('/engine')) {
      engineUrl = `${engineUrl}/engine`;
    }
    this.engineUrl = engineUrl;
    this.daemonUrl = (config.daemonUrl || process.env.TELEGRAPH_DAEMON_URL || 'http://13.237.89.59:8081').replace(/\/$/, '');
    let rawKey = (config.evmPrivateKey || process.env.TELEGRAPH_EVM_PRIVATE_KEY || '').trim().replace(/^["']|["']$/g, '');
    if (rawKey && !rawKey.startsWith('0x') && rawKey.length === 64) {
      rawKey = `0x${rawKey}`;
    }
    this.evmPrivateKey = rawKey || undefined;
    this.timeoutMs = config.timeoutMs || 30000;
  }

  public getEngineUrl(): string {
    return this.engineUrl;
  }

  public getNodeUrl(): string {
    return this.nodeUrl;
  }

  /**
   * Creates the official x402 fetch wrapper for Base Sepolia exact EVM payments.
   * The payment client is intentionally server-side: the app operator funds the
   * configured wallet and pays for the Telegraph Engine request on each analysis.
   */
  private getPaymentFetch(): typeof fetch {
    if (this.paymentFetch) {
      return this.paymentFetch;
    }

    if (!this.evmPrivateKey) {
      throw new Error('x402 payment wallet is not configured. Set TELEGRAPH_EVM_PRIVATE_KEY on the server.');
    }

    if (!/^0x[0-9a-fA-F]{64}$/.test(this.evmPrivateKey)) {
      throw new Error('TELEGRAPH_EVM_PRIVATE_KEY is present but invalid. It must be a 32-byte EVM private key.');
    }

    try {
      const account = privateKeyToAccount(this.evmPrivateKey as `0x${string}`);
      const evmSigner = toClientEvmSigner(account);
      const client = new x402Client();
      // Telegraph Engine currently advertises Base Sepolia for paid inference.
      // Register the exact scheme using the current x402 v2 client API.
      client.register('eip155:84532', new ExactEvmScheme(evmSigner));
      this.paymentFetch = wrapFetchWithPayment(fetch, client);
      return this.paymentFetch;
    } catch (err: any) {
      throw new Error(`Failed to initialize x402 payment client: ${err?.message || String(err)}`);
    }
  }

  async getNodeStatus(): Promise<TelegraphNodeStatus> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(`${this.nodeUrl}/status`, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Telegraph Node status returned HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      try {
        const res2 = await fetch(`${this.nodeUrl}/status`, { signal: AbortSignal.timeout(8000) });
        if (res2.ok) return await res2.json();
      } catch {}
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getLiveSubnetResponses(): Promise<TelegraphSubnetResponseEvent[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.nodeUrl}/`, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Telegraph Node live events returned HTTP ${res.status}`);
      }
      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async getMinerIntegrations(forceRefresh = false): Promise<TelegraphMinerIntegration[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedMiners && now - this.minersCachedAt < this.CACHE_TTL_MS) {
      return this.cachedMiners;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.nodeUrl}/miner-dispatcher/integrations`, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Telegraph miner-dispatcher returned HTTP ${res.status}`);
      }
      const data: TelegraphMinerIntegration[] = await res.json();
      this.cachedMiners = data;
      this.minersCachedAt = now;
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Submits a query to Telegraph Engine POST /v1/ask. The wrapped fetch handles
   * the x402 402 -> signed payment -> retry flow automatically.
   * Requests are serialized to avoid nonce/settlement collisions when one
   * analysis dispatches several paid intelligence intents.
   */
  async askEngine(query: string): Promise<any> {
    const runInQueue = async (): Promise<any> => {
      let attempts = 0;
      const maxAttempts = 2;
      while (attempts < maxAttempts) {
        attempts++;
        try {
          const res = await this.executeAskEngine(query);
          await new Promise((resolve) => setTimeout(resolve, 200));
          return res;
        } catch (err: any) {
          const isBatchConflict =
            err?.message?.includes('batch_send_failed') ||
            err?.paymentDetails?.includes('batch_send_failed');
          if (isBatchConflict && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 800));
            continue;
          }
          throw err;
        }
      }
    };

    const nextPromise = this.askQueue.then(runInQueue, runInQueue);
    this.askQueue = nextPromise.catch(() => {});
    return nextPromise;
  }

  private async executeAskEngine(query: string): Promise<any> {
    const fetchFn = this.getPaymentFetch();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetchFn(`${this.engineUrl}/v1/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        let detail = errText;
        try {
          const parsed = JSON.parse(errText);
          detail = parsed.error || parsed.message || parsed.detail || errText;
        } catch {}

        if (res.status === 402) {
          let paymentResponseDetail = '';
          const paymentResponseHdr = res.headers.get('payment-response') || res.headers.get('x-payment-response');
          if (paymentResponseHdr) {
            try {
              const decoded = JSON.parse(Buffer.from(paymentResponseHdr, 'base64').toString('utf8'));
              paymentResponseDetail = ` Payment Response: [reason: ${decoded.errorReason || decoded.error || 'unknown'}, payer: ${decoded.payer || 'unknown'}, network: ${decoded.network || 'unknown'}]`;
            } catch {}
          }

          const paymentReqHdr = res.headers.get('payment-required');
          let paymentChallengeDetail = '';
          if (paymentReqHdr) {
            try {
              const decodedReq = JSON.parse(Buffer.from(paymentReqHdr, 'base64').toString('utf8'));
              paymentChallengeDetail = ` Accepts: ${decodedReq.accepts?.map((a: any) => `${a.network} / ${a.scheme} (${a.extra?.name || a.asset})`).join(', ')}`;
            } catch {}
          }

          const err: any = new Error(`Telegraph Engine returned HTTP 402 (Payment Required): ${detail || 'x402 payment required'}.${paymentResponseDetail}${paymentChallengeDetail}`);
          err.statusCode = 402;
          err.paymentDetails = detail || paymentResponseDetail || paymentChallengeDetail;
          throw err;
        }

        if (res.status === 404) {
          const err: any = new Error(`Telegraph Engine returned HTTP 404: Not Found at ${this.engineUrl}/v1/ask`);
          err.statusCode = 404;
          throw err;
        }

        const err: any = new Error(`Telegraph Engine returned HTTP ${res.status}: ${detail}`);
        err.statusCode = res.status;
        throw err;
      }

      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async requestCryptoPrice(coinId: string): Promise<any> {
    const cleaned = coinId.trim().toLowerCase();
    return this.askEngine(`What is the real-time USD price, 24h change, and spread for ${cleaned}?`);
  }

  async requestTVLLookup(protocolOrChain: string): Promise<any> {
    const cleaned = protocolOrChain.trim().toLowerCase();
    return this.askEngine(`What is the current Total Value Locked (TVL) in USD for protocol or chain ${cleaned}?`);
  }

  async requestGasPrice(chain = 'eth'): Promise<any> {
    const cleaned = chain.trim().toLowerCase();
    const networkName = cleaned === 'eth' ? 'Ethereum' : cleaned;
    return this.askEngine(`What is the current gas price in Gwei on the ${networkName} network?`);
  }

  async requestWalletAssessment(wallet: string, chain = 'eth'): Promise<any> {
    const cleanedWallet = wallet.trim();
    return this.askEngine(`Assess fraud, exploit cluster, and sanctions risk for wallet address ${cleanedWallet} on ${chain}`);
  }

  async requestFraudQuery(query: string): Promise<any> {
    return this.askEngine(query.trim());
  }

  async requestTxLookup(txHash: string, chain = 'eth'): Promise<any> {
    return this.askEngine(`Inspect and verify on-chain transaction ${txHash.trim()} on ${chain}`);
  }

  async requestTokenHolders(tokenAddress: string, chain = 'eth'): Promise<any> {
    const cleaned = tokenAddress.trim();
    return this.askEngine(`How many token holders does contract address ${cleaned} have on ${chain}?`);
  }

  async requestSSLCheck(domain: string): Promise<any> {
    return this.askEngine(`Verify TLS/SSL certificate status, expiration, and authority for domain ${domain.trim()}`);
  }
}

export const telegraphClient = new TelegraphClient();
