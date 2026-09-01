import {
  DEFAULT_RISK_CONFIG,
  RiskEngineConfiguration,
  classifyScore,
} from './config.ts';
import {
  ApplicationInterpretation,
  CategoryScore,
  DeFiRiskAssessmentReport,
  DerivedCalculations,
  InputIntelligenceBundle,
  RiskCategoryName,
  RiskFactorEvidence,
  SubjectTarget,
} from './types.ts';

export class DeFiRiskEngine {
  private config: RiskEngineConfiguration;

  constructor(config: RiskEngineConfiguration = DEFAULT_RISK_CONFIG) {
    this.config = config;
  }

  /**
   * Evaluates a complete bundle of verified normalized Telegraph intelligence
   * and produces a fully deterministic, transparent risk assessment.
   */
  public analyze(
    subject: SubjectTarget,
    bundle: InputIntelligenceBundle,
    customTimestamp?: string,
  ): DeFiRiskAssessmentReport {
    const timestamp = customTimestamp || new Date().toISOString();
    const reportId = `report_${subject.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Compute Category Scores and Extract Evidence
    const evidenceList: RiskFactorEvidence[] = [];
    const positiveSignals: string[] = [];
    const negativeSignals: string[] = [];
    const warnings: string[] = [];
    const missingDataWarnings: string[] = [];

    // Category 1: Price Volatility
    const priceCategory = this.evaluatePriceVolatility(bundle, evidenceList, positiveSignals, negativeSignals, warnings, missingDataWarnings);

    // Category 2: Liquidity Depth
    const liquidityCategory = this.evaluateLiquidityDepth(bundle, evidenceList, positiveSignals, negativeSignals, warnings, missingDataWarnings);

    // Category 3: Network Execution
    const networkCategory = this.evaluateNetworkExecution(bundle, evidenceList, positiveSignals, negativeSignals, warnings, missingDataWarnings);

    // Category 4: Counterparty & Security
    const securityCategory = this.evaluateCounterpartySecurity(bundle, evidenceList, positiveSignals, negativeSignals, warnings, missingDataWarnings);

    // Category 5: Holder Distribution
    const distributionCategory = this.evaluateDistribution(bundle, evidenceList, positiveSignals, negativeSignals, warnings, missingDataWarnings);

    const categories: Record<RiskCategoryName, CategoryScore> = {
      PRICE_VOLATILITY: priceCategory,
      LIQUIDITY_DEPTH: liquidityCategory,
      NETWORK_EXECUTION: networkCategory,
      COUNTERPARTY_SECURITY: securityCategory,
      GOVERNANCE_DISTRIBUTION: distributionCategory,
    };

    // 2. Compute Weighted Composite Score
    let totalWeight = 0;
    let weightedScoreSum = 0;
    let missingCategoryCount = 0;
    let availableSignalCount = 0;

    for (const catName of Object.keys(categories) as RiskCategoryName[]) {
      const cat = categories[catName];
      if (cat.isMissing) {
        missingCategoryCount++;
      } else {
        totalWeight += cat.weight;
        weightedScoreSum += cat.score * cat.weight;
      }
      availableSignalCount += cat.availableSignals;
    }

    // Base score from available signals normalized over active weights
    let baseWeightedScore = totalWeight > 0 ? weightedScoreSum / totalWeight : 50;

    // Uncertainty penalty for missing categories (conservative risk adjustment)
    const missingPenalty = missingCategoryCount * this.config.missingDataPolicy.baseUncertaintyPenaltyPerMissingCategory;
    
    // Final score is clamped strictly between 0 and 100
    const rawFinalScore = totalWeight > 0 ? baseWeightedScore + (missingPenalty * (1 - totalWeight)) : 50 + missingPenalty;
    const finalScore = Math.max(0, Math.min(100, Math.round(rawFinalScore * 10) / 10));

    // Calculate Confidence (starts at 1.0, reduced by missing data or low-confidence raw feeds)
    let aggregateFeedConfidence = 0;
    let feedCount = 0;
    if (bundle.price) { aggregateFeedConfidence += bundle.price.confidence; feedCount++; }
    if (bundle.tvl) { aggregateFeedConfidence += bundle.tvl.confidence; feedCount++; }
    if (bundle.gas) { aggregateFeedConfidence += bundle.gas.confidence; feedCount++; }
    if (bundle.walletRisk) { aggregateFeedConfidence += bundle.walletRisk.confidence; feedCount++; }
    if (bundle.holders) { aggregateFeedConfidence += bundle.holders.confidence; feedCount++; }
    if (bundle.ssl) { aggregateFeedConfidence += bundle.ssl.confidence; feedCount++; }
    if (bundle.fraudQuery) { aggregateFeedConfidence += bundle.fraudQuery.confidence; feedCount++; }

    const avgFeedConfidence = feedCount > 0 ? aggregateFeedConfidence / feedCount : 0.5;
    const confidenceDeduction = missingCategoryCount * this.config.missingDataPolicy.confidenceDeductionPerMissingCategory;
    const calculatedConfidence = Math.max(0.1, Math.min(1.0, Math.round((avgFeedConfidence - confidenceDeduction) * 100) / 100));

    // Determine Risk Classification
    const classification = classifyScore(finalScore, this.config.classificationThresholds);

    // 3. Mathematical Intermediate Derived Calculations
    const derivedCalculations: DerivedCalculations = {
      priceSpreadPct: bundle.price?.data?.priceRange?.spreadPct ?? null,
      absolute24hPriceChangePct: bundle.price?.data?.change24hPct != null ? Math.abs(bundle.price.data.change24hPct) : null,
      marketCapToTvlRatio:
        bundle.price?.data?.marketCapUsd && bundle.tvl?.data?.tvlUsd && bundle.tvl.data.tvlUsd > 0
          ? Math.round((bundle.price.data.marketCapUsd / bundle.tvl.data.tvlUsd) * 100) / 100
          : null,
      estimatedStandardTransferCostUsd: bundle.gas?.data?.transferCostUsd ?? null,
      gasCongestionMultiple: bundle.gas?.data?.gasPriceGwei ? Math.round((bundle.gas.data.gasPriceGwei / 20) * 100) / 100 : null,
      walletRiskScaledScore: bundle.walletRisk?.data ? Math.round(bundle.walletRisk.data.riskScore * 100) : null,
      holderCentralizationRiskIndex: bundle.holders?.data?.holdersCount
        ? Math.max(0, Math.min(100, Math.round((1 - Math.min(1, bundle.holders.data.holdersCount / 50000)) * 100)))
        : null,
      rawSignalCount: feedCount,
      missingSignalPenaltyScore: missingPenalty,
      weightedRawRiskScore: Math.round(baseWeightedScore * 10) / 10,
      normalizedFinalScore: finalScore,
    };

    // 4. Synthesize Executive Summary
    const executiveSummary = this.generateExecutiveSummary(subject, finalScore, classification, positiveSignals, negativeSignals, missingCategoryCount);

    const interpretation: ApplicationInterpretation = {
      overallRiskScore: finalScore,
      riskClassification: classification,
      confidenceScore: calculatedConfidence,
      executiveSummary,
      categoryBreakdown: categories,
      positiveSignals,
      negativeSignals,
      warnings,
      missingDataWarnings,
      evidenceAttribution: evidenceList,
    };

    return {
      id: reportId,
      subject,
      timestamp,
      engineVersion: this.config.engineVersion,
      rawTelegraphIntelligence: bundle,
      derivedCalculations,
      applicationInterpretation: interpretation,
      attributionDisclaimer: this.config.provenanceNotice,
    };
  }

  // -------------------------------------------------------------
  // Private Evaluators for Categories
  // -------------------------------------------------------------

  private evaluatePriceVolatility(
    bundle: InputIntelligenceBundle,
    evidence: RiskFactorEvidence[],
    positive: string[],
    negative: string[],
    warnings: string[],
    missingWarnings: string[],
  ): CategoryScore {
    const weight = this.config.categoryWeights.PRICE_VOLATILITY.weight;
    const name: RiskCategoryName = 'PRICE_VOLATILITY';
    const displayName = this.config.categoryWeights.PRICE_VOLATILITY.displayName;

    if (!bundle.price || !bundle.price.success) {
      missingWarnings.push('CRYPTO_PRICE intelligence missing: unable to assess 24h market price volatility or multi-source variance.');
      return {
        name,
        displayName,
        score: 50, // Default neutral midpoint when missing
        weight,
        weightedScore: 50 * weight,
        availableSignals: 0,
        totalExpectedSignals: 1,
        isMissing: true,
        notes: ['Price feed unavailable from miner.'],
      };
    }

    const price = bundle.price.data;
    const absChange = Math.abs(price.change24hPct ?? 0);
    const spread = price.priceRange.spreadPct ?? 0;
    let score = 10;
    const notes: string[] = [];

    // Evaluate 24h change
    if (absChange <= this.config.priceVolatility.lowChangePct) {
      score += 5;
      positive.push(`Price is highly stable (24h change: ${price.change24hPct?.toFixed(2)}%).`);
    } else if (absChange <= this.config.priceVolatility.moderateChangePct) {
      score += 25;
      notes.push(`Moderate price fluctuation of ${price.change24hPct?.toFixed(2)}% over 24h.`);
    } else if (absChange <= this.config.priceVolatility.highChangePct) {
      score += 55;
      negative.push(`Elevated price volatility observed (${price.change24hPct?.toFixed(2)}% 24h shift).`);
    } else {
      score += 85;
      negative.push(`Severe market volatility: asset moved ${price.change24hPct?.toFixed(2)}% in 24 hours.`);
      warnings.push(`High volatility warning: >${this.config.priceVolatility.highChangePct}% price swing.`);
    }

    // Evaluate Multi-source Spread
    if (spread > this.config.priceVolatility.sourceSpreadAnomalyPct) {
      score += 15;
      warnings.push(`Cross-miner source price spread is elevated (${spread.toFixed(2)}%).`);
      negative.push(`Discrepancy detected across price oracle sources (${spread.toFixed(2)}% spread).`);
    } else if (price.sourceCount >= 2) {
      score -= 5;
      positive.push(`Cross-verified across ${price.sourceCount} independent price feeds.`);
    }

    const clampedScore = Math.max(0, Math.min(100, score));

    evidence.push({
      factorId: 'VOLATILITY_24H',
      category: name,
      telegraphIntent: 'CRYPTO_PRICE',
      minerId: bundle.price.attribution.minerId,
      minerName: bundle.price.attribution.minerName,
      canonicalProof: bundle.price.canonical,
      contributionScore: clampedScore,
      weight,
      polarity: clampedScore <= 30 ? 'positive' : clampedScore >= 60 ? 'negative' : 'neutral',
      finding: `Asset price $${price.priceUsd.toFixed(2)} USD with ${price.change24hPct?.toFixed(2)}% 24h delta cross-verified on ${price.sourceCount} feeds.`,
    });

    return {
      name,
      displayName,
      score: clampedScore,
      weight,
      weightedScore: clampedScore * weight,
      availableSignals: 1,
      totalExpectedSignals: 1,
      isMissing: false,
      notes,
    };
  }

  private evaluateLiquidityDepth(
    bundle: InputIntelligenceBundle,
    evidence: RiskFactorEvidence[],
    positive: string[],
    negative: string[],
    warnings: string[],
    missingWarnings: string[],
  ): CategoryScore {
    const weight = this.config.categoryWeights.LIQUIDITY_DEPTH.weight;
    const name: RiskCategoryName = 'LIQUIDITY_DEPTH';
    const displayName = this.config.categoryWeights.LIQUIDITY_DEPTH.displayName;

    if (!bundle.tvl || !bundle.tvl.success) {
      missingWarnings.push('TVL_LOOKUP intelligence missing: unable to verify on-chain collateral or protocol liquidity cushion.');
      return {
        name,
        displayName,
        score: 50,
        weight,
        weightedScore: 50 * weight,
        availableSignals: 0,
        totalExpectedSignals: 1,
        isMissing: true,
        notes: ['TVL feed unavailable.'],
      };
    }

    const tvl = bundle.tvl.data.tvlUsd;
    let score = 50;
    const notes: string[] = [];

    if (tvl >= this.config.liquidity.institutionalTierUsd) {
      score = 5;
      positive.push(`Tier-1 Institutional liquidity depth ($${(tvl / 1e9).toFixed(2)}B USD TVL).`);
    } else if (tvl >= this.config.liquidity.deepTierUsd) {
      score = 15;
      positive.push(`Deep protocol liquidity cushion ($${(tvl / 1e6).toFixed(1)}M USD TVL).`);
    } else if (tvl >= this.config.liquidity.moderateTierUsd) {
      score = 35;
      notes.push(`Adequate protocol TVL ($${(tvl / 1e6).toFixed(2)}M USD).`);
    } else if (tvl >= this.config.liquidity.shallowTierUsd) {
      score = 65;
      negative.push(`Shallow liquidity cushion ($${(tvl / 1e6).toFixed(2)}M USD TVL) may increase liquidation slippage.`);
    } else {
      score = 90;
      negative.push(`Micro-cap or depleted TVL ($${tvl.toLocaleString('en-US')} USD). High insolvency vulnerability.`);
      warnings.push('Severe liquidity deficit warning: protocol TVL is below safe operating minimums.');
    }

    const clampedScore = Math.max(0, Math.min(100, score));

    evidence.push({
      factorId: 'LIQUIDITY_TVL',
      category: name,
      telegraphIntent: 'TVL_LOOKUP',
      minerId: bundle.tvl.attribution.minerId,
      minerName: bundle.tvl.attribution.minerName,
      canonicalProof: bundle.tvl.canonical,
      contributionScore: clampedScore,
      weight,
      polarity: clampedScore <= 25 ? 'positive' : clampedScore >= 60 ? 'negative' : 'neutral',
      finding: `Protocol locked collateral verified at $${tvl.toLocaleString('en-US')} USD.`,
    });

    return {
      name,
      displayName,
      score: clampedScore,
      weight,
      weightedScore: clampedScore * weight,
      availableSignals: 1,
      totalExpectedSignals: 1,
      isMissing: false,
      notes,
    };
  }

  private evaluateNetworkExecution(
    bundle: InputIntelligenceBundle,
    evidence: RiskFactorEvidence[],
    positive: string[],
    negative: string[],
    warnings: string[],
    missingWarnings: string[],
  ): CategoryScore {
    const weight = this.config.categoryWeights.NETWORK_EXECUTION.weight;
    const name: RiskCategoryName = 'NETWORK_EXECUTION';
    const displayName = this.config.categoryWeights.NETWORK_EXECUTION.displayName;

    if (!bundle.gas || !bundle.gas.success) {
      missingWarnings.push('GAS_PRICE intelligence missing: network fee and settlement congestion unverified.');
      return {
        name,
        displayName,
        score: 30, // Default optimistic assumption for network
        weight,
        weightedScore: 30 * weight,
        availableSignals: 0,
        totalExpectedSignals: 1,
        isMissing: true,
        notes: ['Gas price feed unavailable.'],
      };
    }

    const gwei = bundle.gas.data.gasPriceGwei;
    let score = 10;
    const notes: string[] = [];

    if (gwei <= this.config.network.nominalGasGwei) {
      score = 5;
      positive.push(`Base layer network fee is optimal (${gwei.toFixed(4)} Gwei).`);
    } else if (gwei <= this.config.network.elevatedGasGwei) {
      score = 25;
      notes.push(`Normal execution fees (${gwei.toFixed(2)} Gwei).`);
    } else if (gwei <= this.config.network.congestedGasGwei) {
      score = 60;
      negative.push(`Network is experiencing fee congestion (${gwei.toFixed(1)} Gwei).`);
    } else {
      score = 90;
      negative.push(`Severe fee spike on ${bundle.gas.data.chain} (${gwei.toFixed(1)} Gwei). High front-running / liquidation delay risk.`);
      warnings.push(`Network congestion warning: gas price surge to ${gwei.toFixed(1)} Gwei.`);
    }

    const clampedScore = Math.max(0, Math.min(100, score));

    evidence.push({
      factorId: 'NETWORK_GAS',
      category: name,
      telegraphIntent: 'GAS_PRICE',
      minerId: bundle.gas.attribution.minerId,
      minerName: bundle.gas.attribution.minerName,
      canonicalProof: bundle.gas.canonical,
      contributionScore: clampedScore,
      weight,
      polarity: clampedScore <= 20 ? 'positive' : clampedScore >= 60 ? 'negative' : 'neutral',
      finding: `Gas price on ${bundle.gas.data.chain} is ${gwei.toFixed(4)} Gwei (Fee level: ${bundle.gas.data.feeLevel}).`,
    });

    return {
      name,
      displayName,
      score: clampedScore,
      weight,
      weightedScore: clampedScore * weight,
      availableSignals: 1,
      totalExpectedSignals: 1,
      isMissing: false,
      notes,
    };
  }

  private evaluateCounterpartySecurity(
    bundle: InputIntelligenceBundle,
    evidence: RiskFactorEvidence[],
    positive: string[],
    negative: string[],
    warnings: string[],
    missingWarnings: string[],
  ): CategoryScore {
    const weight = this.config.categoryWeights.COUNTERPARTY_SECURITY.weight;
    const name: RiskCategoryName = 'COUNTERPARTY_SECURITY';
    const displayName = this.config.categoryWeights.COUNTERPARTY_SECURITY.displayName;

    let available = 0;
    let scoreAccum = 0;
    const notes: string[] = [];

    // 1. Wallet Risk Signal (Sentinel Miner)
    if (bundle.walletRisk && bundle.walletRisk.success) {
      available++;
      const wr = bundle.walletRisk.data;
      const walletScore = Math.round(wr.riskScore * 100);
      scoreAccum += walletScore;

      if (wr.riskLevel === 'SAFE' || wr.riskLevel === 'LOW') {
        positive.push(`Counterparty address has clean historical record (Risk score: ${wr.riskScore.toFixed(2)}).`);
      } else if (wr.riskLevel === 'HIGH' || wr.riskLevel === 'CRITICAL') {
        negative.push(`Elevated counterparty risk detected for ${wr.walletAddress.substring(0, 8)}... (Level: ${wr.riskLevel}).`);
        warnings.push(`Security alert: Counterparty flagged by Telegraph Sentinel (${wr.reasonCodes.join(', ')}).`);
      }

      evidence.push({
        factorId: 'WALLET_SECURITY_SENTINEL',
        category: name,
        telegraphIntent: 'FRAUD_DETECTION',
        minerId: bundle.walletRisk.attribution.minerId,
        minerName: bundle.walletRisk.attribution.minerName,
        canonicalProof: bundle.walletRisk.canonical,
        contributionScore: walletScore,
        weight: 0.5,
        polarity: walletScore <= 20 ? 'positive' : walletScore >= 50 ? 'negative' : 'neutral',
        finding: `Wallet evaluated at risk score ${wr.riskScore.toFixed(2)} with ${wr.evidenceCount} evidence items.`,
      });
    }

    // 2. SSL Handshake Signal
    if (bundle.ssl && bundle.ssl.success) {
      available++;
      const ssl = bundle.ssl.data;
      if (ssl.isValid) {
        positive.push(`Endpoint TLS/SSL handshake verified valid with ${ssl.issuer} (${ssl.daysUntilExpiry} days remaining).`);
        scoreAccum += 5;
      } else {
        negative.push(`Untrusted or invalid TLS/SSL certificate for host ${ssl.domain}.`);
        warnings.push(`Security warning: SSL certificate invalid or expired.`);
        scoreAccum += 90;
      }

      evidence.push({
        factorId: 'SSL_HANDSHAKE',
        category: name,
        telegraphIntent: 'SSL_VERIFICATION',
        minerId: bundle.ssl.attribution.minerId,
        minerName: bundle.ssl.attribution.minerName,
        canonicalProof: bundle.ssl.canonical,
        contributionScore: ssl.isValid ? 5 : 90,
        weight: 0.25,
        polarity: ssl.isValid ? 'positive' : 'negative',
        finding: `SSL certificate for ${ssl.domain} is ${ssl.statusText} (${ssl.issuer}).`,
      });
    }

    // 3. Fraud Knowledge Query Signal
    if (bundle.fraudQuery && bundle.fraudQuery.success) {
      available++;
      const fq = bundle.fraudQuery.data;
      if (fq.verdict === 'ANSWERED' && fq.summary) {
        notes.push(`Verified regulatory records retrieved from ${fq.primarySource?.provider || 'knowledge miner'}.`);
      }
    }

    if (available === 0) {
      missingWarnings.push('COUNTERPARTY_SECURITY signals not provided for direct verification.');
      return {
        name,
        displayName,
        score: 20, // Baseline assumption
        weight,
        weightedScore: 20 * weight,
        availableSignals: 0,
        totalExpectedSignals: 2,
        isMissing: true,
        notes: ['No security signals provided.'],
      };
    }

    const finalCatScore = Math.max(0, Math.min(100, Math.round(scoreAccum / available)));

    return {
      name,
      displayName,
      score: finalCatScore,
      weight,
      weightedScore: finalCatScore * weight,
      availableSignals: available,
      totalExpectedSignals: 2,
      isMissing: false,
      notes,
    };
  }

  private evaluateDistribution(
    bundle: InputIntelligenceBundle,
    evidence: RiskFactorEvidence[],
    positive: string[],
    negative: string[],
    warnings: string[],
    missingWarnings: string[],
  ): CategoryScore {
    const weight = this.config.categoryWeights.GOVERNANCE_DISTRIBUTION.weight;
    const name: RiskCategoryName = 'GOVERNANCE_DISTRIBUTION';
    const displayName = this.config.categoryWeights.GOVERNANCE_DISTRIBUTION.displayName;

    if (!bundle.holders || !bundle.holders.success) {
      missingWarnings.push('TOKEN_HOLDER_COUNT intelligence missing: holder centralization depth unmeasured.');
      return {
        name,
        displayName,
        score: 35,
        weight,
        weightedScore: 35 * weight,
        availableSignals: 0,
        totalExpectedSignals: 1,
        isMissing: true,
        notes: ['Holder count feed unavailable.'],
      };
    }

    const count = bundle.holders.data.holdersCount;
    let score = 30;
    const notes: string[] = [];

    if (count >= this.config.distribution.decentralizedHolderCount) {
      score = 5;
      positive.push(`Highly decentralized holder base (${count.toLocaleString('en-US')} distinct wallets).`);
    } else if (count >= this.config.distribution.healthyHolderCount) {
      score = 20;
      positive.push(`Healthy wallet distribution (${count.toLocaleString('en-US')} token holders).`);
    } else if (count >= this.config.distribution.concentratedHolderCount) {
      score = 50;
      notes.push(`Moderate holder concentration (${count.toLocaleString('en-US')} wallets).`);
    } else {
      score = 85;
      negative.push(`High whale concentration risk (${count.toLocaleString('en-US')} holders). Susceptible to coordinated dumps.`);
      warnings.push(`Centralization warning: token has fewer than ${this.config.distribution.concentratedHolderCount} distinct holding addresses.`);
    }

    const clampedScore = Math.max(0, Math.min(100, score));

    evidence.push({
      factorId: 'HOLDER_CENTRALIZATION',
      category: name,
      telegraphIntent: 'TOKEN_HOLDER_COUNT',
      minerId: bundle.holders.attribution.minerId,
      minerName: bundle.holders.attribution.minerName,
      canonicalProof: bundle.holders.canonical,
      contributionScore: clampedScore,
      weight,
      polarity: clampedScore <= 20 ? 'positive' : clampedScore >= 60 ? 'negative' : 'neutral',
      finding: `${bundle.holders.data.tokenSymbol} has ${count.toLocaleString('en-US')} holding wallets on ${bundle.holders.data.chain}.`,
    });

    return {
      name,
      displayName,
      score: clampedScore,
      weight,
      weightedScore: clampedScore * weight,
      availableSignals: 1,
      totalExpectedSignals: 1,
      isMissing: false,
      notes,
    };
  }

  private generateExecutiveSummary(
    subject: SubjectTarget,
    score: number,
    classification: string,
    positive: string[],
    negative: string[],
    missingCount: number,
  ): string {
    const subName = subject.name || subject.id;
    let text = `${subName} exhibits an overall risk score of ${score}/100, corresponding to a ${classification} Risk classification. `;

    if (classification === 'LOW') {
      text += `The asset demonstrates strong structural health across verified price stability, protocol liquidity depth, and execution conditions.`;
    } else if (classification === 'MODERATE') {
      text += `The asset presents standard market conditions with manageable exposure, though ongoing monitoring of liquidity cushion and volatility is advised.`;
    } else if (classification === 'HIGH') {
      text += `Significant risk vectors were detected, including elevated price volatility, shallow collateral depth, or counterparty anomalies. Caution is warranted.`;
    } else {
      text += `CRITICAL RISK WARNING: One or more severe vulnerabilities or extreme anomalies (such as severe liquidity deficit or high counterparty risk) were identified. Immediate risk mitigation recommended.`;
    }

    if (missingCount > 0) {
      text += ` Note: ${missingCount} intelligence categories were incomplete or unavailable; conservative uncertainty penalties were applied.`;
    }

    return text;
  }
}

export const deFiRiskEngine = new DeFiRiskEngine();
