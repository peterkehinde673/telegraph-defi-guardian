import 'dotenv/config';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';
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
  private readonly CACHE_TTL_MS = 60_000; // 60s cache for node registry
  private paymentFetch: typeof fetch | null = null;
  private askQueue: Promise<any> = Promise.resolve();

  constructor(config: TelegraphClientConfig = {}) {
    this.nodeUrl = (config.nodeUrl || process.env.TELEGRAPH_NODE_URL || 'https://devnode.telegraphprotocol.com').replace(/\/$/, '');
    let engineUrl = (config.engineUrl || process.env.TELEGRAPH_ENGINE_URL || 'http://13.237.89.59:7044/engine').replace(/\/$/, '');
    // If port 7044 or devnode is provided without /engine, route to the Engine subrouter /engine
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
   * Returns a payment-aware fetch instance wrapped with @x402/fetch and @x402/evm if a private key is provided.
   */
  private getPaymentFetch(): typeof fetch {
    if (this.paymentFetch) {
      return this.paymentFetch;
    }

    if (this.evmPrivateKey && this.evmPrivateKey.startsWith('0x') && this.evmPrivateKey.length === 66) {
      try {
        const account = privateKeyToAccount(this.evmPrivateKey as `0x${string}`);
        const evmSigner = toClientEvmSigner(account);
        const client = x402Client.fromConfig({
          schemes: [
            {
              network: 'eip155:84532', // Base Sepolia
              client: new ExactEvmScheme(evmSigner),
            },
          ],
        });
        this.paymentFetch = wrapFetchWithPayment(fetch, client);
        return this.paymentFetch;
      } catch (err: any) {
        console.warn('Failed to initialize x402 payment client, falling back to standard fetch:', err.message);
      }
    }

    this.paymentFetch = fetch;
    return this.paymentFetch;
  }

  /**
   * Fetches the current node status, public key, and network identity from the Telegraph Node.
   */
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
      // Retry once if aborted
      try {
        const res2 = await fetch(`${this.nodeUrl}/status`, { signal: AbortSignal.timeout(8000) });
        if (res2.ok) return await res2.json();
      } catch {}
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Fetches the live stream of real cryptographic SubnetResponse on-chain events from the Telegraph Node.
   */
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

  /**
   * Fetches the live registry of all active Telegraph miners from the Telegraph Node miner-dispatcher.
   */
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
   * Submits a query directly to the official Telegraph Engine auto-router (POST /v1/ask).
   * Supports transparent x402 payment handling for paid inference.
   * Requests are serialized via askQueue to prevent nonce collisions / batch_send_failed
   * errors when multiple queries run concurrently against the x402 settlement relayer.
   */
  async askEngine(query: string): Promise<any> {
    const runInQueue = async (): Promise<any> => {
      let attempts = 0;
      const maxAttempts = 2;
      while (attempts < maxAttempts) {
        attempts++;
        try {
          const res = await this.executeAskEngine(query);
          // Brief pause after successful settlement to give the relayer a clean nonce boundary
          await new Promise((resolve) => setTimeout(resolve, 200));
          return res;
        } catch (err: any) {
          const isBatchConflict =
            err?.message?.includes('batch_send_failed') ||
            err?.paymentDetails?.includes('batch_send_failed');
          if (isBatchConflict && attempts < maxAttempts) {
            // Wait 800ms to allow the settlement node's pending batch to settle, then retry
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
              paymentChallengeDetail = ` Accepts: ${decodedReq.accepts?.map((a: any) => `${a.network} (${a.extra?.name || a.asset})`).join(', ')}`;
            } catch {}
          }

          const keyStatus = this.evmPrivateKey
            ? `EVM private key configured, but payment was rejected by settlement node.${paymentResponseDetail}`
            : `No EVM private key configured (TELEGRAPH_EVM_PRIVATE_KEY missing).${paymentChallengeDetail}`;
          const err: any = new Error(`Telegraph Engine returned HTTP 402 (Payment Required): ${detail || 'x402 payment required'}. ${keyStatus}`);
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

  /**
   * Queries the Telegraph Engine auto-router for CRYPTO_PRICE intelligence.
   */
  async requestCryptoPrice(coinId: string): Promise<any> {
    const cleaned = coinId.trim().toLowerCase();
    const query = `What is the real-time USD price, 24h change, and spread for ${cleaned}?`;
    return this.askEngine(query);
  }

  /**
   * Queries the Telegraph Engine auto-router for TVL_LOOKUP intelligence.
   */
  async requestTVLLookup(protocolOrChain: string): Promise<any> {
    const cleaned = protocolOrChain.trim().toLowerCase();
    const query = `What is the current Total Value Locked (TVL) in USD for protocol or chain ${cleaned}?`;
    return this.askEngine(query);
  }

  /**
   * Queries the Telegraph Engine auto-router for GAS_PRICE intelligence.
   */
  async requestGasPrice(chain = 'eth'): Promise<any> {
    const cleaned = chain.trim().toLowerCase();
    const networkName = cleaned === 'eth' ? 'Ethereum' : cleaned;
    const query = `What is the current gas price in Gwei on the ${networkName} network?`;
    return this.askEngine(query);
  }

  /**
   * Queries the Telegraph Engine auto-router for FRAUD_DETECTION (wallet risk) intelligence.
   */
  async requestWalletAssessment(wallet: string, chain = 'eth'): Promise<any> {
    const cleanedWallet = wallet.trim();
    const query = `Assess fraud, exploit cluster, and sanctions risk for wallet address ${cleanedWallet} on ${chain}`;
    return this.askEngine(query);
  }

  /**
   * Queries the Telegraph Engine auto-router for FRAUD_DETECTION (knowledge query) intelligence.
   */
  async requestFraudQuery(query: string): Promise<any> {
    return this.askEngine(query.trim());
  }

  /**
   * Queries the Telegraph Engine auto-router for ONCHAIN_TX_LOOKUP intelligence.
   */
  async requestTxLookup(txHash: string, chain = 'eth'): Promise<any> {
    const query = `Inspect and verify on-chain transaction ${txHash.trim()} on ${chain}`;
    return this.askEngine(query);
  }

  /**
   * Queries the Telegraph Engine auto-router for TOKEN_HOLDER_COUNT intelligence.
   */
  async requestTokenHolders(tokenAddress: string, chain = 'eth'): Promise<any> {
    const cleaned = tokenAddress.trim();
    const query = `How many token holders does contract address ${cleaned} have on ${chain}?`;
    return this.askEngine(query);
  }

  /**
   * Queries the Telegraph Engine auto-router for SSL_VERIFICATION intelligence.
   */
  async requestSSLCheck(domain: string): Promise<any> {
    const query = `Verify TLS/SSL certificate status, expiration, and authority for domain ${domain.trim()}`;
    return this.askEngine(query);
  }
}

export const telegraphClient = new TelegraphClient();

