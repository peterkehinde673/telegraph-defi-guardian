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
   * Fetches and normalizes real CRYPTO_PRICE signals via the official Telegraph Engine auto-router (/v1/ask).
   */
  async getCryptoPrice(coinId: string): Promise<NormalizedSignal<NormalizedCryptoPrice>> {
    const raw = await this.client.requestCryptoPrice(coinId);
    return TelegraphNormalizer.normalizeCryptoPrice(raw);
  }

  /**
   * Fetches and normalizes verified TVL signals via the official Telegraph Engine auto-router (/v1/ask).
   */
  async getTVL(protocolOrChain: string): Promise<NormalizedSignal<NormalizedTVL>> {
    const raw = await this.client.requestTVLLookup(protocolOrChain);
    return TelegraphNormalizer.normalizeTVL(raw);
  }

  /**
   * Fetches and normalizes verified GAS_PRICE signals via the official Telegraph Engine auto-router (/v1/ask).
   */
  async getGasPrice(chain = 'eth'): Promise<NormalizedSignal<NormalizedGasPrice>> {
    const raw = await this.client.requestGasPrice(chain);
    return TelegraphNormalizer.normalizeGasPrice(raw);
  }

  /**
   * Queries real wallet risk intelligence via the official Telegraph Engine auto-router (/v1/ask).
   */
  async assessWallet(address: string, chain = 'eth'): Promise<NormalizedSignal<NormalizedWalletAssessment>> {
    const raw = await this.client.requestWalletAssessment(address, chain);
    return TelegraphNormalizer.normalizeWalletAssessment(raw);
  }

  /**
   * Dispatches a structured fraud knowledge query via the official Telegraph Engine auto-router (/v1/ask).
   */
  async queryFraudIntelligence(query: string): Promise<NormalizedSignal<NormalizedFraudQuery>> {
    const raw = await this.client.requestFraudQuery(query);
    return TelegraphNormalizer.normalizeFraudQuery({ ...raw, query });
  }

  /**
   * Performs an on-chain transaction inspection via the official Telegraph Engine auto-router (/v1/ask).
   */
  async lookupTransaction(txHash: string, chain = 'eth'): Promise<NormalizedSignal<NormalizedTxLookup>> {
    const raw = await this.client.requestTxLookup(txHash, chain);
    return TelegraphNormalizer.normalizeTxLookup(raw);
  }

  /**
   * Queries verified token holder distribution count via the official Telegraph Engine auto-router (/v1/ask).
   */
  async getTokenHolders(tokenAddress: string, chain = 'eth'): Promise<NormalizedSignal<NormalizedTokenHolders>> {
    const raw = await this.client.requestTokenHolders(tokenAddress, chain);
    return TelegraphNormalizer.normalizeTokenHolders(raw);
  }

  /**
   * Performs a real TLS/SSL certificate verification via the official Telegraph Engine auto-router (/v1/ask).
   */
  async checkSSL(domain: string): Promise<NormalizedSignal<NormalizedSSLCheck>> {
    const raw = await this.client.requestSSLCheck(domain);
    return TelegraphNormalizer.normalizeSSLCheck(raw);
  }

  /**
   * Retrieves overall node health, on-chain signed events, and active miner count directly from the Telegraph Node.
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

    const uniqueIntents = new Set(miners.flatMap((m) => m.supported_intents || []));

    return {
      nodeStatus,
      liveSubnetEvents,
      miners,
      activeIntentsCount: uniqueIntents.size,
    };
  }
}

export const telegraphService = new TelegraphIntelligenceService();
