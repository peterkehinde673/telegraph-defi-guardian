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

  constructor(config: TelegraphClientConfig = {}) {
    this.nodeUrl = (config.nodeUrl || process.env.TELEGRAPH_NODE_URL || 'https://devnode.telegraphprotocol.com').replace(/\/$/, '');
    this.engineUrl = (config.engineUrl || process.env.TELEGRAPH_ENGINE_URL || 'http://13.237.89.59:8080').replace(/\/$/, '');
    this.daemonUrl = (config.daemonUrl || process.env.TELEGRAPH_DAEMON_URL || 'http://13.237.89.59:8081').replace(/\/$/, '');
    this.evmPrivateKey = config.evmPrivateKey || process.env.TELEGRAPH_EVM_PRIVATE_KEY;
    this.timeoutMs = config.timeoutMs || 15000;
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
   */
  async askEngine(query: string): Promise<any> {
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
        throw new Error(`Telegraph Engine returned HTTP ${res.status}: ${detail}`);
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

