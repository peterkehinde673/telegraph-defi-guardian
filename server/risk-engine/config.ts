import { RiskCategoryName, RiskClassification } from './types.ts';

/**
 * Transparent Configuration for DeFi Guardian Risk Analysis Engine
 * 
 * Every parameter, weight, and threshold is strictly declared here with documented rationale.
 * No arbitrary numbers or opaque heuristic "black boxes".
 */

export interface RiskCategoryWeightConfig {
  weight: number; // Sum of category weights = 1.0
  displayName: string;
}

export interface RiskEngineConfiguration {
  engineVersion: string;
  categoryWeights: Record<RiskCategoryName, RiskCategoryWeightConfig>;
  
  // Classification boundaries (0 to 100)
  classificationThresholds: {
    lowMax: number;       // [0, lowMax) -> LOW
    moderateMax: number;  // [lowMax, moderateMax) -> MODERATE
    highMax: number;      // [moderateMax, highMax) -> HIGH
    // [highMax, 100] -> CRITICAL
  };

  // Missing data penalties (to account for uncertainty when signals fail or are missing)
  missingDataPolicy: {
    baseUncertaintyPenaltyPerMissingCategory: number; // Points added to risk score for uncertainty
    confidenceDeductionPerMissingCategory: number;   // Deduction from 1.0 confidence
    minimumSignalsRequiredForReliableAssessment: number;
  };

  // Price Volatility Factor Thresholds
  priceVolatility: {
    lowChangePct: number;       // <= 3% -> minimal risk (0-15 pts)
    moderateChangePct: number;  // <= 8% -> moderate risk (15-40 pts)
    highChangePct: number;      // <= 20% -> elevated risk (40-75 pts)
    extremeChangePct: number;   // > 20% -> extreme risk (75-100 pts)
    sourceSpreadAnomalyPct: number; // Price discrepancy across feeds > 1.5% flags divergence
  };

  // Liquidity Depth / TVL Thresholds (in USD)
  liquidity: {
    institutionalTierUsd: number; // >= $1,000,000,000 -> 0-10 pts (Ultra safe liquidity)
    deepTierUsd: number;          // >= $100,000,000 -> 10-25 pts (Robust liquidity)
    moderateTierUsd: number;      // >= $10,000,000 -> 25-50 pts (Adequate liquidity)
    shallowTierUsd: number;       // >= $1,000,000 -> 50-75 pts (Thin liquidity, slippage risk)
    criticalTierUsd: number;      // < $1,000,000 -> 75-100 pts (High risk of liquidation cascading)
  };

  // Network & Execution Gas Thresholds (in Gwei for EVM chains)
  network: {
    nominalGasGwei: number;    // <= 20 Gwei -> 0-15 pts (Fluid network execution)
    elevatedGasGwei: number;   // <= 50 Gwei -> 15-40 pts (Normal load)
    congestedGasGwei: number;  // <= 100 Gwei -> 40-75 pts (Congestion / delayed txs)
    surgeGasGwei: number;      // > 100 Gwei -> 75-100 pts (Severe fee spike / front-running risk)
  };

  // Token Distribution / Holder Thresholds
  distribution: {
    decentralizedHolderCount: number; // >= 50,000 holders -> 0-15 pts
    healthyHolderCount: number;       // >= 5,000 holders -> 15-40 pts
    concentratedHolderCount: number;  // >= 1,000 holders -> 40-70 pts
    dangerHolderCount: number;        // < 1,000 holders -> 70-100 pts (Extreme whale dump risk)
  };

  // Provenance statement
  provenanceNotice: string;
}

export const DEFAULT_RISK_CONFIG: RiskEngineConfiguration = {
  engineVersion: '2.1.0-deterministic',
  
  categoryWeights: {
    PRICE_VOLATILITY: {
      weight: 0.25,
      displayName: 'Price Stability & Volatility',
    },
    LIQUIDITY_DEPTH: {
      weight: 0.30,
      displayName: 'TVL & Liquidity Cushion',
    },
    NETWORK_EXECUTION: {
      weight: 0.15,
      displayName: 'Network State & Execution Cost',
    },
    COUNTERPARTY_SECURITY: {
      weight: 0.20,
      displayName: 'Counterparty & Contract Security',
    },
    GOVERNANCE_DISTRIBUTION: {
      weight: 0.10,
      displayName: 'Asset Holder Distribution',
    },
  },

  classificationThresholds: {
    lowMax: 28,        // 0 - 27: LOW Risk
    moderateMax: 55,   // 28 - 54: MODERATE Risk
    highMax: 78,       // 55 - 77: HIGH Risk
    // 78 - 100: CRITICAL Risk
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
    institutionalTierUsd: 1_000_000_000, // $1B
    deepTierUsd: 100_000_000,            // $100M
    moderateTierUsd: 10_000_000,         // $10M
    shallowTierUsd: 1_000_000,           // $1M
    criticalTierUsd: 250_000,            // $250k
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
    'Attribution Disclaimer: Raw verified signals are cryptographically attested and gathered directly by Telegraph Protocol Miners. Indicator derivations, composite scoring, and interpretive classifications are computed deterministically by the Telegraph DeFi Guardian Risk Engine according to open, declared mathematical models.',
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
