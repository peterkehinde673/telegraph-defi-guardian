import {
  CryptoPriceSignal,
  GasSignal,
  TelegraphMinerIntegration,
  TelegraphNodeStatus,
  TelegraphSubnetResponseEvent,
  TVLSignal,
} from './types.ts';

export class TelegraphClient {
  private nodeUrl: string;
  private timeoutMs: number;

  constructor(nodeUrl = process.env.TELEGRAPH_NODE_URL || 'https://devnode.telegraphprotocol.com', timeoutMs = 15000) {
    this.nodeUrl = nodeUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
  }

  /**
   * Fetches the current node status, public key, and network identity.
   */
  async getNodeStatus(): Promise<TelegraphNodeStatus> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.nodeUrl}/status`, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Telegraph Node status returned HTTP ${res.status}`);
      }
      return await res.json();
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
   * Fetches the live registry of all active Telegraph miners, their supported intents, rankings, and endpoints.
   */
  async getMinerIntegrations(): Promise<TelegraphMinerIntegration[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.nodeUrl}/miner-dispatcher/integrations`, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Telegraph miner-dispatcher returned HTTP ${res.status}`);
      }
      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Dispatches a real request to the top-ranked Telegraph Miner for CRYPTO_PRICE.
   */
  async requestCryptoPrice(coinId: string): Promise<CryptoPriceSignal> {
    const cleanedCoinId = coinId.trim().toLowerCase();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      // Primary miner for CRYPTO_PRICE: Telegraph Onchain Lookup Miner (Rank 1)
      const primaryUrl = `https://telegraph-onchain-tx-lookup-miner.onrender.com/crypto-price?coin_id=${encodeURIComponent(
        cleanedCoinId,
      )}`;
      const res = await fetch(primaryUrl, { signal: controller.signal });

      if (res.ok) {
        const data = await res.json();
        return {
          ...data,
          miner_id: '99',
          miner_name: 'Telegraph Onchain Lookup & Price Miner',
        };
      }

      // Fallback: AgentFeed Base & Crypto Prices
      const fallbackUrl = `https://x402.ochinimus.app/crypto-price?coin_id=${encodeURIComponent(cleanedCoinId)}`;
      const fbRes = await fetch(fallbackUrl, { signal: controller.signal });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        return {
          ...fbData,
          miner_id: '20260829',
          miner_name: 'AgentFeed Base & Crypto Prices',
        };
      }

      throw new Error(`Telegraph Miners for CRYPTO_PRICE failed with status: ${res.status}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Dispatches a real request to the top-ranked Telegraph Miner for TVL_LOOKUP.
   */
  async requestTVLLookup(protocolOrChain: string): Promise<TVLSignal> {
    const cleaned = protocolOrChain.trim().toLowerCase();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      // Primary miner for TVL_LOOKUP: Telegraph Onchain Lookup Miner (Rank 1)
      const primaryUrl = `https://telegraph-onchain-tx-lookup-miner.onrender.com/tvl?protocol=${encodeURIComponent(
        cleaned,
      )}`;
      const res = await fetch(primaryUrl, { signal: controller.signal });

      if (res.ok) {
        const data = await res.json();
        return {
          ...data,
          miner_id: '99',
          miner_name: 'Telegraph TVL Miner',
        };
      }

      // Fallback: TVL Oracle Wire
      const fallbackUrl = `https://tvlwire.shadrakbessanh.me/tvl?protocol=${encodeURIComponent(cleaned)}`;
      const fbRes = await fetch(fallbackUrl, { signal: controller.signal });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        return {
          ...fbData,
          miner_id: '301',
          miner_name: 'TVL Oracle Wire',
        };
      }

      throw new Error(`Telegraph Miners for TVL_LOOKUP failed with status: ${res.status}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Dispatches a real request to the Telegraph Miner for GAS_PRICE.
   */
  async requestGasPrice(chain = 'eth'): Promise<GasSignal> {
    const cleaned = chain.trim().toLowerCase();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      // Try Telegraph Onchain Lookup Miner
      const primaryUrl = `https://telegraph-onchain-tx-lookup-miner.onrender.com/gas-price?chain=${encodeURIComponent(
        cleaned,
      )}`;
      const res = await fetch(primaryUrl, { signal: controller.signal });

      if (res.ok) {
        const data = await res.json();
        return {
          ...data,
          miner_id: '99',
          miner_name: 'Telegraph Onchain Gas Miner',
        };
      }

      // Fallback: GasWire EVM Fees
      const network = cleaned === 'eth' ? 'ethereum' : cleaned;
      const fbUrl = `https://telegraph-gas.margyn.workers.dev/gas/${encodeURIComponent(network)}`;
      const fbRes = await fetch(fbUrl, { signal: controller.signal });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        return {
          chain: fbData.network || cleaned,
          status: 'ok',
          summary: fbData.summary,
          confidence: fbData.confidence || 0.95,
          gas_price_wei: fbData.gas_price_wei,
          gas_price_gwei: fbData.gas_price_gwei,
          as_of: fbData.as_of || new Date().toISOString(),
          miner_id: '7301',
          miner_name: 'GasWire EVM Fee Oracle',
        };
      }

      throw new Error(`Telegraph Miners for GAS_PRICE failed with status: ${res.status}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const telegraphClient = new TelegraphClient();
