import {
  DeFiRiskAssessmentReport,
  RiskClassification,
  RiskCategoryName,
  RiskFactorEvidence,
  SubjectTarget,
  CategoryScore,
  DerivedCalculations,
  InputIntelligenceBundle,
  ApplicationInterpretation,
} from '../../server/risk-engine/types.ts';
import {
  TelegraphNodeStatus,
  TelegraphMinerIntegration,
  TelegraphSubnetResponseEvent,
  NormalizedSignal,
  NormalizedCryptoPrice,
  NormalizedTVL,
  NormalizedGasPrice,
  NormalizedWalletAssessment,
  NormalizedTokenHolders,
  NormalizedSSLCheck,
} from '../../server/telegraph/types.ts';

export type {
  DeFiRiskAssessmentReport,
  RiskClassification,
  RiskCategoryName,
  RiskFactorEvidence,
  SubjectTarget,
  CategoryScore,
  DerivedCalculations,
  InputIntelligenceBundle,
  ApplicationInterpretation,
  TelegraphNodeStatus,
  TelegraphMinerIntegration,
  TelegraphSubnetResponseEvent,
  NormalizedSignal,
  NormalizedCryptoPrice,
  NormalizedTVL,
  NormalizedGasPrice,
  NormalizedWalletAssessment,
  NormalizedTokenHolders,
  NormalizedSSLCheck,
};

export type AnalysisType = 'quick' | 'asset' | 'protocol' | 'wallet';

export interface AnalysisRequest {
  target: string;
  analysisType: AnalysisType;
  chain?: string;
  contractAddress?: string;
  domain?: string;
}

export interface NetworkOverviewResponse {
  nodeStatus: TelegraphNodeStatus;
  liveSubnetEvents: TelegraphSubnetResponseEvent[];
  miners: TelegraphMinerIntegration[];
  activeIntentsCount: number;
}

export interface StoredAnalysisRecord {
  id: string;
  timestamp: string;
  targetName: string;
  targetSymbol?: string;
  type: string;
  riskScore: number;
  classification: RiskClassification;
  confidence: number;
  report: DeFiRiskAssessmentReport;
}
