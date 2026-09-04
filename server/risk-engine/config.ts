import { RiskCategoryName, RiskClassification } from './types.ts';

/**
 * Transparent Configuration for DeFi Guardian Risk Analysis Engine
 *
 * Every parameter, weight, and threshold is declared here with documented rationale.
 * The resulting score is an application interpretation, not a Telegraph protocol score.
 */

export interface RiskCategoryWeightConfig {
  weight: number;
  displayName: string;
}

export interface RiskEngineConfiguration {
  engineVersion: string;
  categoryWeights: Record<RiskCategoryName, RiskCategoryWeightConfig>;
  classificationThresholds: {
    lowMax: number;
    moderateMax: number;
    highMax: number;
  };
  missingDataPolicy: {
    baseUncertaintyPenaltyPerMissingCategory: number;
    confidenceDeductionPerMissingCategory: number;
    minimumSignalsRequiredForReliableAssessment: number;
  };
  priceVolatility: {
    lowChangePct: number;
    moderateChangePct: number;
    highChangePct: number;
    extremeChangePct: number;
    sourceSpreadAnomalyPct: number;
  };
  liquidity: {
    institutionalTierUsd: number;
    deepTierUsd: number;
    moderateTierUsd: number;
    shallowTierUsd: number;
    criticalTierUsd: number;
  };
  network: {
    nominalGasGwei: number;
    elevatedGasGwei: number;
    congestedGasGwei: number;
    surgeGasGwei: number;
  };
  distribution: {
    decentralizedHolderCount: number;
    healthyHolderCount: number;
    concentratedHolderCount: number;
    dangerHolderCount: number;
  };
  provenanceNotice: string;
}

export const DEFAULT_RISK_CONFIG: RiskEngineConfiguration = {
  engineVersion: '2.1.0-deterministic',

  categoryWeights: {
    PRICE_VOLATILITY: { weight: 0.25, displayName: 'Price Stability & Volatility' },
    LIQUIDITY_DEPTH: { weight: 0.30, displayName: 'TVL & Liquidity Cushion' },
    NETWORK_EXECUTION: { weight: 0.15, displayName: 'Network State & Execution Cost' },
    COUNTERPARTY_SECURITY: { weight: 0.20, displayName: 'Counterparty & Contract Security' },
    GOVERNANCE_DISTRIBUTION: { weight: 0.10, displayName: 'Asset Holder Distribution' },
  },

  classificationThresholds: {
    lowMax: 28,
    moderateMax: 55,
    highMax: 78,
  },

  missingDataPolicy: {
    baseUncertaintyPenaltyPerMissingCategory: 12,
    confidenceDeductionPerMissingCategory: 0.18,
    minimumSignalsRequiredForReliableAssessment: 2,
  },

  priceVolatility: {
    lowChangePct: 3.0,
    moderateChangePct: 8.0,
    highChangePct: 20.0,
    extremeChangePct: 35.0,
    sourceSpreadAnomalyPct: 1.5,
  },

  liquidity: {
    institutionalTierUsd: 1_000_000_000,
    deepTierUsd: 100_000_000,
    moderateTierUsd: 10_000_000,
    shallowTierUsd: 1_000_000,
    criticalTierUsd: 250_000,
  },

  network: {
    nominalGasGwei: 20,
    elevatedGasGwei: 50,
    congestedGasGwei: 100,
    surgeGasGwei: 150,
  },

  distribution: {
    decentralizedHolderCount: 50_000,
    healthyHolderCount: 5_000,
    concentratedHolderCount: 1_000,
    dangerHolderCount: 250,
  },

  provenanceNotice:
    'Provenance boundary: Telegraph Engine response fields are preserved when supplied. Miner identity, canonical proof, confidence, and source metadata are never inferred from the public registry. DeFi Guardian computes the displayed risk score, derived indicators, and application-level confidence deterministically from the normalized signals.',
};

export function classifyScore(
  score: number,
  thresholds = DEFAULT_RISK_CONFIG.classificationThresholds,
): RiskClassification {
  if (score < thresholds.lowMax) return 'LOW';
  if (score < thresholds.moderateMax) return 'MODERATE';
  if (score < thresholds.highMax) return 'HIGH';
  return 'CRITICAL';
}
