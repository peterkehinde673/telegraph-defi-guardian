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
    this.timeoutMs = config.timeoutMs || 8000;
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
        throw new Error(`Telegraph Engine returned HTTP ${res.status}: ${errText}`);
      }

      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Dynamically filters and ranks registered active Telegraph miners for a given intent.
   */
  async getMinersForIntent(intent: TelegraphIntent): Promise<TelegraphMinerIntegration[]> {
    const miners = await this.getMinerIntegrations();
    const active = miners.filter(
      (m) =>
        (m.activation_status === 'active' || !m.activation_status) &&
        Array.isArray(m.supported_intents) &&
        m.supported_intents.includes(intent),
    );

    // Sort by official Telegraph rank ascending (rank 1 is best)
    active.sort((a, b) => {
      const scoreA = a.scores?.find((s) => s.intent_id === intent)?.rank ?? 9999;
      const scoreB = b.scores?.find((s) => s.intent_id === intent)?.rank ?? 9999;
      return scoreA - scoreB;
    });

    return active;
  }

  /**
   * Selects the most specific endpoint for an intent from a miner's registered endpoints.
   */
  private pickEndpoint(intent: TelegraphIntent, endpoints: TelegraphEndpoint[], isPost: boolean): TelegraphEndpoint | null {
    if (!endpoints || endpoints.length === 0) return null;

    const keywords: Record<TelegraphIntent, string[]> = {
      CRYPTO_PRICE: ['crypto-price', 'price', 'ask'],
      TVL_LOOKUP: ['tvl'],
      GAS_PRICE: ['gas-price', 'gas'],
      FRAUD_DETECTION: ['assess-wallet', 'fraud-query', 'fraud', 'risk'],
      TOKEN_HOLDER_COUNT: ['token-holders', 'holders'],
      SSL_VERIFICATION: ['ssl-check', 'ssl'],
      ONCHAIN_TX_LOOKUP: ['check-tx', 'tx-lookup', 'tx'],
      WALLET_BALANCE_CHECK: ['wallet-balance', 'balance'],
      URL_SCAN: ['url-scan', 'urlscan', 'scan'],
      WEB_SEARCH: ['web-search', 'search'],
      RESEARCH_SYNTHESIS: ['research', 'papers'],
      TEXT_GENERATION: ['chat', 'text', 'completions'],
      AI_TEXT_DETECTION: ['ai-detect', 'ai_detect'],
      STORM_ALERT: ['storm', 'alert'],
      WEATHER_CHECK: ['weather-check', 'wcheck'],
      WEATHER_FORECAST: ['weather-forecast', 'wforecast'],
    };

    const targetKeywords = keywords[intent] || [intent.toLowerCase()];

    for (const kw of targetKeywords) {
      const match = endpoints.find((e) => {
        const pathLower = e.path.toLowerCase();
        const methodMatch = isPost
          ? e.method?.toUpperCase() === 'POST'
          : e.method?.toUpperCase() === 'GET' || !e.method;
        return methodMatch && pathLower.includes(kw);
      });
      if (match) return match;
    }

    return (
      endpoints.find((e) =>
        isPost ? e.method?.toUpperCase() === 'POST' : e.method?.toUpperCase() === 'GET' || !e.method,
      ) || endpoints[0]
    );
  }

  /**
   * Dispatches an intent through the official Telegraph Router / Subnet Dispatcher Proxy.
   * Routes the request via the official Telegraph Node / Engine router with payment handling,
   * preserving authentic miner attribution metadata.
   */
  async dispatchIntent<T = any>(
    intent: TelegraphIntent,
    params: Record<string, any>,
    isPost = false,
  ): Promise<{ raw: T; minerMeta: MinerAttribution }> {
    const miners = await this.getMinersForIntent(intent);

    if (miners.length === 0) {
      throw new Error(`No active Telegraph miners registered for intent: ${intent}`);
    }

    let lastError: Error | null = null;
    const fetchFn = this.getPaymentFetch();

    for (const miner of miners) {
      const endpoint = this.pickEndpoint(intent, miner.endpoints || [], isPost);
      if (!endpoint) continue;

      const rawPath = endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`;

      // Candidates for official Telegraph routing:
      // 1. Official Telegraph Node Subnet Dispatcher Router: /miner-dispatcher/v1/{subnet_id}{endpoint_path}
      // 2. Direct Miner URL as registered in the Telegraph on-chain directory
      const candidateUrls: string[] = [];
      
      // Official Telegraph Node router path
      candidateUrls.push(`${this.nodeUrl}/miner-dispatcher/v1/${miner.id}${rawPath}`);
      
      // If miner has registered base_url, include as secondary endpoint
      if (miner.base_url) {
        const baseUrl = miner.base_url.replace(/\/$/, '');
        candidateUrls.push(`${baseUrl}${rawPath}`);
      }

      for (const targetUrlBase of candidateUrls) {
        let fullUrl = targetUrlBase;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
          const fetchOptions: RequestInit = {
            signal: controller.signal,
          };

          if (isPost || endpoint.method?.toUpperCase() === 'POST') {
            fetchOptions.method = 'POST';
            fetchOptions.headers = {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            };
            fetchOptions.body = JSON.stringify(params);
          } else {
            fetchOptions.method = 'GET';
            fetchOptions.headers = {
              Accept: 'application/json',
            };
            const queryParams = new URLSearchParams();
            for (const [k, v] of Object.entries(params)) {
              if (v !== undefined && v !== null) {
                queryParams.set(k, String(v));
              }
            }
            const qs = queryParams.toString();
            if (qs) {
              fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
            }
          }

          const res = await fetchFn(fullUrl, fetchOptions);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }

          const rawData = await res.json();
          const scoreObj = miner.scores?.find((s) => s.intent_id === intent);

          const minerMeta: MinerAttribution = {
            minerId: miner.id,
            minerName: miner.name,
            slug: miner.slug,
            walletAddress: miner.wallet_address,
            rank: scoreObj?.rank,
            score: scoreObj?.score,
            protocol: miner.protocol || 'telegraph-subnet',
            endpoint: `${endpoint.method?.toUpperCase() || 'GET'} ${rawPath}`,
          };

          return {
            raw: rawData,
            minerMeta,
          };
        } catch (err: any) {
          lastError = err;
          // Continue to next routing candidate / ranked miner
        } finally {
          clearTimeout(timeout);
        }
      }
    }

    throw new Error(
      `All registered Telegraph miners for intent ${intent} failed. Last error: ${lastError?.message || 'Unknown error'}`,
    );
  }

  /**
   * Dispatches CRYPTO_PRICE intent through dynamically resolved Telegraph Miners.
   */
  async requestCryptoPrice(coinId: string): Promise<{ raw: any; minerMeta: MinerAttribution }> {
    const cleaned = coinId.trim().toLowerCase();
    return this.dispatchIntent('CRYPTO_PRICE', {
      coin_id: cleaned,
      query: cleaned,
      symbol: cleaned.toUpperCase(),
    });
  }

  /**
   * Dispatches TVL_LOOKUP intent through dynamically resolved Telegraph Miners.
   */
  async requestTVLLookup(protocolOrChain: string): Promise<{ raw: any; minerMeta: MinerAttribution }> {
    const cleaned = protocolOrChain.trim().toLowerCase();
    return this.dispatchIntent('TVL_LOOKUP', {
      protocol: cleaned,
      query: cleaned,
    });
  }

  /**
   * Dispatches GAS_PRICE intent through dynamically resolved Telegraph Miners.
   */
  async requestGasPrice(chain = 'eth'): Promise<{ raw: any; minerMeta: MinerAttribution }> {
    const cleaned = chain.trim().toLowerCase();
    return this.dispatchIntent('GAS_PRICE', {
      chain: cleaned,
      network: cleaned === 'eth' ? 'ethereum' : cleaned,
    });
  }

  /**
   * Dispatches FRAUD_DETECTION (wallet risk) intent through dynamically resolved Telegraph Miners.
   */
  async requestWalletAssessment(wallet: string, chain = 'eth'): Promise<{ raw: any; minerMeta: MinerAttribution }> {
    const cleanedWallet = wallet.trim();
    return this.dispatchIntent('FRAUD_DETECTION', {
      wallet: cleanedWallet,
      address: cleanedWallet,
      chain,
    });
  }

  /**
   * Dispatches FRAUD_DETECTION (knowledge query) intent through dynamically resolved Telegraph Miners.
   */
  async requestFraudQuery(query: string): Promise<{ raw: any; minerMeta: MinerAttribution }> {
    return this.dispatchIntent(
      'FRAUD_DETECTION',
      {
        query: query.trim(),
      },
      true,
    );
  }

  /**
   * Dispatches ONCHAIN_TX_LOOKUP intent through dynamically resolved Telegraph Miners.
   */
  async requestTxLookup(txHash: string, chain = 'eth'): Promise<{ raw: any; minerMeta: MinerAttribution }> {
    return this.dispatchIntent('ONCHAIN_TX_LOOKUP', {
      tx_hash: txHash.trim(),
      chain,
    });
  }

  /**
   * Dispatches TOKEN_HOLDER_COUNT intent through dynamically resolved Telegraph Miners.
   */
  async requestTokenHolders(tokenAddress: string, chain = 'eth'): Promise<{ raw: any; minerMeta: MinerAttribution }> {
    const cleaned = tokenAddress.trim();
    return this.dispatchIntent('TOKEN_HOLDER_COUNT', {
      token: cleaned,
      address: cleaned,
      chain,
    });
  }

  /**
   * Dispatches SSL_VERIFICATION intent through dynamically resolved Telegraph Miners.
   */
  async requestSSLCheck(domain: string): Promise<{ raw: any; minerMeta: MinerAttribution }> {
    return this.dispatchIntent('SSL_VERIFICATION', {
      domain: domain.trim(),
      query: domain.trim(),
    });
  }
}

export const telegraphClient = new TelegraphClient();

