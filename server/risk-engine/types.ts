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
  TelegraphIntent,
} from '../telegraph/types.ts';

export type RiskClassification = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type RiskCategoryName =
  | 'PRICE_VOLATILITY'
  | 'LIQUIDITY_DEPTH'
  | 'NETWORK_EXECUTION'
  | 'COUNTERPARTY_SECURITY'
  | 'GOVERNANCE_DISTRIBUTION';

export interface SubjectTarget {
  id: string;
  name: string;
  symbol?: string;
  type: 'token' | 'protocol' | 'wallet' | 'composite';
  chain?: string;
  contractAddress?: string;
}

export interface DerivedIndicator {
  id: string;
  name: string;
  value: string | number;
  unit?: string;
  status: 'healthy' | 'caution' | 'critical' | 'neutral';
  description: string;
  telegraphIntentSource?: TelegraphIntent;
}

export interface RiskFactorEvidence {
  factorId: string;
  category: RiskCategoryName;
  telegraphIntent: TelegraphIntent;
  minerId: string;
  minerName: string;
  canonicalProof: string;
  contributionScore: number; // 0 to 100
  weight: number; // 0.0 to 1.0
  polarity: 'positive' | 'negative' | 'neutral';
  finding: string;
  confidence?: number;
  confidenceSource?: 'telegraph_engine' | 'application_calculated';
}

export interface CategoryScore {
  name: RiskCategoryName;
  displayName: string;
  score: number; // 0 to 100 (higher = riskier)
  weight: number; // 0 to 1
  weightedScore: number;
  availableSignals: number;
  totalExpectedSignals: number;
  isMissing: boolean;
  notes: string[];
}

export interface InputIntelligenceBundle {
  price?: NormalizedSignal<NormalizedCryptoPrice> | null;
  tvl?: NormalizedSignal<NormalizedTVL> | null;
  gas?: NormalizedSignal<NormalizedGasPrice> | null;
  walletRisk?: NormalizedSignal<NormalizedWalletAssessment> | null;
  holders?: NormalizedSignal<NormalizedTokenHolders> | null;
  ssl?: NormalizedSignal<NormalizedSSLCheck> | null;
  fraudQuery?: NormalizedSignal<NormalizedFraudQuery> | null;
  tx?: NormalizedSignal<NormalizedTxLookup> | null;
}

export interface DerivedCalculations {
  priceSpreadPct: number | null;
  absolute24hPriceChangePct: number | null;
  marketCapToTvlRatio: number | null;
  estimatedStandardTransferCostUsd: number | null;
  gasCongestionMultiple: number | null;
  walletRiskScaledScore: number | null;
  holderCentralizationRiskIndex: number | null;
  rawSignalCount: number;
  missingSignalPenaltyScore: number;
  weightedRawRiskScore: number;
  normalizedFinalScore: number;
}

export interface ApplicationInterpretation {
  overallRiskScore: number; // 0 to 100
  riskClassification: RiskClassification;
  confidenceScore: number; // 0.0 to 1.0
  executiveSummary: string;
  categoryBreakdown: Record<RiskCategoryName, CategoryScore>;
  positiveSignals: string[];
  negativeSignals: string[];
  warnings: string[];
  missingDataWarnings: string[];
  evidenceAttribution: RiskFactorEvidence[];
}

export interface DeFiRiskAssessmentReport {
  id: string;
  subject: SubjectTarget;
  timestamp: string; // ISO 8601
  engineVersion: string;
  
  // Explicit architectural boundary separation:
  // 1. Raw normalized verified Telegraph signals
  rawTelegraphIntelligence: InputIntelligenceBundle;
  
  // 2. Deterministic mathematical calculations
  derivedCalculations: DerivedCalculations;
  
  // 3. Application-generated synthesis & risk scoring
  applicationInterpretation: ApplicationInterpretation;
  
  // Provenance disclaimer
  attributionDisclaimer: string;
}
