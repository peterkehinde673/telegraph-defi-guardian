import { telegraphClient, TelegraphClient } from './client.ts';
import { TelegraphNormalizer } from './normalizer.ts';
import {
  NormalizedCryptoPrice,
  NormalizedFraudQuery,
  NormalizedGasPrice,
  NormalizedSignal,
  NormalizedSSLCheck,
  NormalizedTokenHolders,
  NormalizedTVL,
  NormalizedTxLookup,
  NormalizedWalletAssessment,
  TelegraphMinerIntegration,
  TelegraphNodeStatus,
  TelegraphSubnetResponseEvent,
} from './types.ts';

export class TelegraphIntelligenceService {
  private client: TelegraphClient;

  constructor(client: TelegraphClient = telegraphClient) {
    this.client = client;
  }

  /**
   * Fetches and normalizes real-time CRYPTO_PRICE from Telegraph miners.
   */
  async getCryptoPrice(coinId: string): Promise<NormalizedSignal<NormalizedCryptoPrice>> {
    const raw = await this.client.requestCryptoPrice(coinId);
    return TelegraphNormalizer.normalizeCryptoPrice(raw, {
      minerId: raw.miner_id || '9002',
      minerName: raw.miner_name || 'TxLens',
    });
  }

  /**
   * Fetches and normalizes verified TVL from Telegraph miners.
   */
  async getTVL(protocolOrChain: string): Promise<NormalizedSignal<NormalizedTVL>> {
    const raw = await this.client.requestTVLLookup(protocolOrChain);
    return TelegraphNormalizer.normalizeTVL(raw, {
      minerId: raw.miner_id || '9002',
      minerName: raw.miner_name || 'TxLens',
    });
  }

  /**
   * Fetches and normalizes verified GAS_PRICE from Telegraph miners.
   */
  async getGasPrice(chain = 'eth'): Promise<NormalizedSignal<NormalizedGasPrice>> {
    const raw = await this.client.requestGasPrice(chain);
    return TelegraphNormalizer.normalizeGasPrice(raw, {
      minerId: raw.miner_id || '9002',
      minerName: raw.miner_name || 'TxLens',
    });
  }

  /**
   * Queries real wallet risk intelligence from Telegraph miners (checks sanction lists, mixers, exploit clusters).
   */
  async assessWallet(address: string, chain = 'eth'): Promise<NormalizedSignal<NormalizedWalletAssessment>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const url = `https://telegraph-onchain-tx-lookup-miner.onrender.com/assess-wallet?wallet=${encodeURIComponent(
        address.trim(),
      )}&chain=${encodeURIComponent(chain)}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Wallet assessment failed with status HTTP ${res.status}`);
      }
      const raw = await res.json();
      return TelegraphNormalizer.normalizeWalletAssessment(raw, {
        minerId: '9002',
        minerName: 'TxLens',
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Dispatches a structured source-backed fraud knowledge query to Telegraph miners.
   */
  async queryFraudIntelligence(query: string): Promise<NormalizedSignal<NormalizedFraudQuery>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch('https://telegraph-onchain-tx-lookup-miner.onrender.com/fraud-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Fraud query failed with status HTTP ${res.status}`);
      }
      const raw = await res.json();
      return TelegraphNormalizer.normalizeFraudQuery({ ...raw, query }, {
        minerId: '9002',
        minerName: 'TxLens',
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Performs an on-chain transaction status & calldata inspection via Telegraph miners.
   */
  async lookupTransaction(txHash: string, chain = 'eth'): Promise<NormalizedSignal<NormalizedTxLookup>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const url = `https://telegraph-onchain-tx-lookup-miner.onrender.com/check-tx?tx_hash=${encodeURIComponent(
        txHash.trim(),
      )}&chain=${encodeURIComponent(chain)}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Transaction lookup failed with status HTTP ${res.status}`);
      }
      const raw = await res.json();
      return TelegraphNormalizer.normalizeTxLookup(raw, {
        minerId: '9002',
        minerName: 'TxLens',
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Queries verified token holder distribution count from Telegraph miners.
   */
  async getTokenHolders(tokenAddress: string, chain = 'eth'): Promise<NormalizedSignal<NormalizedTokenHolders>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const url = `https://telegraph-onchain-tx-lookup-miner.onrender.com/token-holders?token=${encodeURIComponent(
        tokenAddress.trim(),
      )}&chain=${encodeURIComponent(chain)}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Token holders lookup failed with status HTTP ${res.status}`);
      }
      const raw = await res.json();
      return TelegraphNormalizer.normalizeTokenHolders(raw, {
        minerId: '9002',
        minerName: 'TxLens',
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Performs a real TLS/SSL certificate handshake check via Telegraph miners.
   */
  async checkSSL(domain: string): Promise<NormalizedSignal<NormalizedSSLCheck>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const url = `https://telegraph-onchain-tx-lookup-miner.onrender.com/ssl-check?domain=${encodeURIComponent(
        domain.trim(),
      )}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`SSL check failed with status HTTP ${res.status}`);
      }
      const raw = await res.json();
      return TelegraphNormalizer.normalizeSSLCheck(raw, {
        minerId: '9002',
        minerName: 'TxLens',
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Retrieves overall node health, on-chain signed events, and active miner count.
   */
  async getNetworkOverview(): Promise<{
    nodeStatus: TelegraphNodeStatus;
    liveSubnetEvents: TelegraphSubnetResponseEvent[];
    miners: TelegraphMinerIntegration[];
    activeIntentsCount: number;
  }> {
    const [nodeStatus, liveSubnetEvents, miners] = await Promise.all([
      this.client.getNodeStatus(),
      this.client.getLiveSubnetResponses(),
      this.client.getMinerIntegrations(),
    ]);

    const uniqueIntents = new Set(miners.flatMap((m) => m.supported_intents));

    return {
      nodeStatus,
      liveSubnetEvents,
      miners,
      activeIntentsCount: uniqueIntents.size,
    };
  }
}

export const telegraphService = new TelegraphIntelligenceService();
