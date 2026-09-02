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
   * Fetches and normalizes real CRYPTO_PRICE signals from dynamically resolved Telegraph Miners.
   */
  async getCryptoPrice(coinId: string): Promise<NormalizedSignal<NormalizedCryptoPrice>> {
    const { raw, minerMeta } = await this.client.requestCryptoPrice(coinId);
    return TelegraphNormalizer.normalizeCryptoPrice(raw, minerMeta);
  }

  /**
   * Fetches and normalizes verified TVL signals from dynamically resolved Telegraph Miners.
   */
  async getTVL(protocolOrChain: string): Promise<NormalizedSignal<NormalizedTVL>> {
    const { raw, minerMeta } = await this.client.requestTVLLookup(protocolOrChain);
    return TelegraphNormalizer.normalizeTVL(raw, minerMeta);
  }

  /**
   * Fetches and normalizes verified GAS_PRICE signals from dynamically resolved Telegraph Miners.
   */
  async getGasPrice(chain = 'eth'): Promise<NormalizedSignal<NormalizedGasPrice>> {
    const { raw, minerMeta } = await this.client.requestGasPrice(chain);
    return TelegraphNormalizer.normalizeGasPrice(raw, minerMeta);
  }

  /**
   * Queries real wallet risk intelligence from dynamically resolved Telegraph Miners.
   */
  async assessWallet(address: string, chain = 'eth'): Promise<NormalizedSignal<NormalizedWalletAssessment>> {
    const { raw, minerMeta } = await this.client.requestWalletAssessment(address, chain);
    return TelegraphNormalizer.normalizeWalletAssessment(raw, minerMeta);
  }

  /**
   * Dispatches a structured fraud knowledge query to dynamically resolved Telegraph Miners.
   */
  async queryFraudIntelligence(query: string): Promise<NormalizedSignal<NormalizedFraudQuery>> {
    const { raw, minerMeta } = await this.client.requestFraudQuery(query);
    return TelegraphNormalizer.normalizeFraudQuery({ ...raw, query }, minerMeta);
  }

  /**
   * Performs an on-chain transaction status & calldata inspection via dynamically resolved Telegraph Miners.
   */
  async lookupTransaction(txHash: string, chain = 'eth'): Promise<NormalizedSignal<NormalizedTxLookup>> {
    const { raw, minerMeta } = await this.client.requestTxLookup(txHash, chain);
    return TelegraphNormalizer.normalizeTxLookup(raw, minerMeta);
  }

  /**
   * Queries verified token holder distribution count from dynamically resolved Telegraph Miners.
   */
  async getTokenHolders(tokenAddress: string, chain = 'eth'): Promise<NormalizedSignal<NormalizedTokenHolders>> {
    const { raw, minerMeta } = await this.client.requestTokenHolders(tokenAddress, chain);
    return TelegraphNormalizer.normalizeTokenHolders(raw, minerMeta);
  }

  /**
   * Performs a real TLS/SSL certificate handshake check via dynamically resolved Telegraph Miners.
   */
  async checkSSL(domain: string): Promise<NormalizedSignal<NormalizedSSLCheck>> {
    const { raw, minerMeta } = await this.client.requestSSLCheck(domain);
    return TelegraphNormalizer.normalizeSSLCheck(raw, minerMeta);
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
