/**
 * Telegraph Protocol Integration Types
 * Based on official Telegraph Protocol node specification, miner-dispatcher registry,
 * and verified on-chain cryptographic SubnetResponse events.
 */

export type TelegraphIntent =
  | 'CRYPTO_PRICE'
  | 'TVL_LOOKUP'
  | 'GAS_PRICE'
  | 'FRAUD_DETECTION'
  | 'ONCHAIN_TX_LOOKUP'
  | 'WALLET_BALANCE_CHECK'
  | 'TOKEN_HOLDER_COUNT'
  | 'SSL_VERIFICATION'
  | 'URL_SCAN'
  | 'WEB_SEARCH'
  | 'RESEARCH_SYNTHESIS'
  | 'TEXT_GENERATION'
  | 'AI_TEXT_DETECTION'
  | 'STORM_ALERT'
  | 'WEATHER_CHECK'
  | 'WEATHER_FORECAST';

export interface TelegraphMinerScore {
  intent_id: string;
  epoch_id: number;
  rank: number;
  score: number;
  scored_at: string;
}

export interface TelegraphEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'get' | 'post';
  description?: string;
  content_type?: string;
}

export interface TelegraphMinerIntegration {
  id: string;
  slug: string;
  name: string;
  description: string;
  protocol: string;
  kind?: string;
  base_url: string;
  wallet_address?: string;
  fee_address?: string;
  activation_status?: string;
  min_price_usdc?: number;
  registered_at?: string;
  supported_intents: TelegraphIntent[];
  endpoints: TelegraphEndpoint[];
  scores?: TelegraphMinerScore[];
  signal_mapping?: {
    confidence_field?: string;
    label_field?: string;
    reason_field?: string;
  };
}

export interface TelegraphNodeStatus {
  publicKey: string;
  signer: string | null;
  myNetworkTime: string | null;
  totalNetworkTime: string | null;
}

export interface TelegraphSubnetResponseEvent {
  id: string;
  detectiontime: string;
  hash: string;
  endhash: string;
  blocknumber: number;
  logindex?: number;
  event: string;
  sender: string;
  response_uint256: number[];
  response_string: string[];
  feeamount: number;
  startchain: string;
  destination: string;
  endchain: string;
  submitter: string;
  issubnettx: boolean;
  signers?: string[];
  r?: number[][];
  s?: number[][];
  v?: string;
  h?: number[][];
}

// -------------------------------------------------------------
// Raw Telegraph Miner Response Schemas
// -------------------------------------------------------------

export interface CryptoPriceSignal {
  query_type: string;
  query: string;
  status: string;
  summary: string;
  confidence: number;
  canonical?: string;
  price_usd: number;
  symbol?: string;
  price_source?: string;
  sources?: Array<{ source: string; price_usd: number }>;
  source_count?: number;
  price_range_low_usd?: number;
  price_range_high_usd?: number;
  change_24h_pct?: number;
  market_cap_usd?: number;
  as_of: string;
  miner_id?: string;
  miner_name?: string;
}

export interface TVLSignal {
  query_type: string;
  query: string;
  status: string;
  summary: string;
  confidence: number;
  canonical?: string;
  tvl_usd: number;
  chain_tvl_usd?: number | null;
  protocol_total_tvl_usd?: number | null;
  protocol?: string;
  tvl_chain?: string | null;
  as_of: string;
  miner_id?: string;
  miner_name?: string;
}

export interface GasSignal {
  chain: string;
  status: string;
  summary: string;
  confidence: number;
  canonical?: string;
  gas_price_wei: string;
  gas_price_gwei: number;
  fee_usd?: number;
  native_price_usd?: number;
  block_number?: number;
  as_of: string;
  miner_id?: string;
  miner_name?: string;
}

// -------------------------------------------------------------
// Unified Normalized Intelligence Contracts
// -------------------------------------------------------------

export interface MinerAttribution {
  minerId: string;
  minerName: string;
  slug?: string;
  protocol?: string;
  rank?: number;
  score?: number;
  walletAddress?: string;
  endpoint?: string;
}

export interface SignalValidation {
  isValid: boolean;
  hasCanonicalProof: boolean;
  multiSourceVerified: boolean;
  warnings: string[];
}

export interface NormalizedSignal<T> {
  id: string;
  intent: TelegraphIntent;
  success: boolean;
  confidence: number; // 0.0 - 1.0
  confidenceSource?: 'telegraph_engine' | 'application_calculated';
  timestamp: string; // ISO 8601
  canonical: string;
  summary: string;
  attribution: MinerAttribution;
  validation: SignalValidation;
  data: T;
}

export interface NormalizedCryptoPrice {
  assetId: string;
  symbol: string;
  priceUsd: number;
  change24hPct: number | null;
  marketCapUsd: number | null;
  priceRange: {
    lowUsd: number | null;
    highUsd: number | null;
    spreadPct: number | null;
  };
  sources: Array<{ source: string; priceUsd: number }>;
  sourceCount: number;
}

export interface NormalizedTVL {
  entityId: string;
  protocolName: string;
  tvlUsd: number;
  chainTvlUsd: number | null;
  protocolTotalTvlUsd: number | null;
  chain: string | null;
}

export interface NormalizedGasPrice {
  chain: string;
  gasPriceGwei: number;
  gasPriceWei: string;
  transferCostUsd: number | null;
  nativePriceUsd: number | null;
  feeLevel: 'low' | 'moderate' | 'high' | 'surge';
  blockNumber: number | null;
}

export interface NormalizedWalletAssessment {
  walletAddress: string;
  chain: string;
  riskScore: number; // 0.0 to 1.0
  riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assessmentStatus: string;
  confidence: number;
  reasonCodes: string[];
  explanation: string;
  evidenceCount: number;
  directFunder?: string;
  isSanctionedOrExploiter: boolean;
}

export interface NormalizedFraudQuery {
  query: string;
  verdict: 'ANSWERED' | 'INCONCLUSIVE' | 'CONFIRMED_FRAUD' | 'LEGITIMATE';
  summary: string;
  detailedAnalysis: string;
  confidence: number;
  primarySource?: {
    title: string;
    url: string;
    provider: string;
  };
}

export interface NormalizedTxLookup {
  txHash: string;
  chain: string;
  status: 'confirmed' | 'reverted' | 'pending' | 'not_found';
  fromAddress: string | null;
  toAddress: string | null;
  valueWei: string | null;
  valueEth: number | null;
  method: string | null;
  methodSignature: string | null;
  blockNumber: number | null;
  receiptStatus: number | null;
}

export interface NormalizedTokenHolders {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  chain: string;
  holdersCount: number;
}

export interface NormalizedSSLCheck {
  domain: string;
  isValid: boolean;
  isAuthorized: boolean;
  issuer: string;
  validFrom: string | null;
  validTo: string | null;
  daysUntilExpiry: number;
  statusText: string;
}
