import {
  MinerAttribution,
  NormalizedCryptoPrice,
  NormalizedFraudQuery,
  NormalizedGasPrice,
  NormalizedSignal,
  NormalizedSSLCheck,
  NormalizedTokenHolders,
  NormalizedTVL,
  NormalizedTxLookup,
  NormalizedWalletAssessment,
  SignalValidation,
  TelegraphIntent,
} from './types.ts';

function createSignalId(prefix: string): string {
  return `tg_sig_${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function clampConfidence(conf: any, defaultVal = 0.5): number {
  if (conf === null || conf === undefined) return defaultVal;
  const num = typeof conf === 'number' ? conf : parseFloat(conf);
  if (isNaN(num)) return defaultVal;
  return Math.max(0, Math.min(1, num));
}

function sanitizeNumber(val: any, defaultVal = 0): number {
  if (val === null || val === undefined) return defaultVal;
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? defaultVal : num;
}

function extractAttribution(raw: any, minerMeta: Partial<MinerAttribution> = {}): MinerAttribution {
  return {
    minerId: minerMeta.minerId || raw.miner_id || 'unattributed',
    minerName: minerMeta.minerName || raw.miner_name || 'Registered Telegraph Miner',
    slug: minerMeta.slug || raw.miner_slug,
    protocol: minerMeta.protocol || raw.protocol || 'telegraph-subnet',
    rank: minerMeta.rank ?? raw.miner_rank,
    score: minerMeta.score ?? raw.miner_score,
    walletAddress: minerMeta.walletAddress || raw.miner_wallet,
    endpoint: minerMeta.endpoint,
  };
}

export class TelegraphNormalizer {
  /**
   * Normalizes raw CRYPTO_PRICE signals from Telegraph miners.
   */
  static normalizeCryptoPrice(
    raw: any,
    minerMeta: Partial<MinerAttribution> = {},
  ): NormalizedSignal<NormalizedCryptoPrice> {
    const rawPrice = sanitizeNumber(raw.price_usd || raw.price || raw.median_price || raw.value);
    const low = raw.price_range_low_usd != null ? sanitizeNumber(raw.price_range_low_usd) : null;
    const high = raw.price_range_high_usd != null ? sanitizeNumber(raw.price_range_high_usd) : null;
    const spreadPct =
      low !== null && high !== null && high > 0
        ? ((high - low) / high) * 100
        : raw.spread_bps != null
        ? raw.spread_bps / 100
        : null;

    const sources = Array.isArray(raw.sources)
      ? raw.sources.map((s: any) => ({
          source: String(s.source || s.name || s || 'feed'),
          priceUsd: sanitizeNumber(s.price_usd || s.price || rawPrice),
        }))
      : [];

    const warnings: string[] = [];
    if (sources.length === 0) warnings.push('Single source price feed');
    if (spreadPct !== null && spreadPct > 1.5) warnings.push(`Price disparity between sources: ${spreadPct.toFixed(2)}%`);

    const isValid = (raw.status === 'ok' || raw.intent === 'CRYPTO_PRICE' || !raw.status) && rawPrice > 0;
    const validation: SignalValidation = {
      isValid,
      hasCanonicalProof: Boolean(raw.canonical || raw.as_of),
      multiSourceVerified: sources.length >= 2 || raw.source_count >= 2,
      warnings,
    };

    const calculatedConfidence =
      raw.confidence !== undefined
        ? clampConfidence(raw.confidence)
        : sources.length >= 2
        ? 1.0
        : isValid
        ? 0.85
        : 0.2;

    const attribution = extractAttribution(raw, minerMeta);

    return {
      id: createSignalId('price'),
      intent: 'CRYPTO_PRICE',
      success: validation.isValid,
      confidence: calculatedConfidence,
      timestamp: raw.as_of || raw.observed_at || new Date().toISOString(),
      canonical: raw.canonical || `crypto_price:${raw.asset || raw.query || raw.symbol || 'unknown'}:${rawPrice}`,
      summary: raw.summary || `${raw.symbol || raw.asset || raw.query || 'Asset'} price is $${rawPrice.toFixed(2)} USD`,
      attribution,
      validation,
      data: {
        assetId: String(raw.asset || raw.query || raw.symbol || '').toLowerCase(),
        symbol: String(raw.symbol || raw.asset || raw.query || '').toUpperCase(),
        priceUsd: rawPrice,
        change24hPct: raw.change_24h_pct != null ? sanitizeNumber(raw.change_24h_pct) : null,
        marketCapUsd: raw.market_cap_usd != null ? sanitizeNumber(raw.market_cap_usd) : null,
        priceRange: {
          lowUsd: low,
          highUsd: high,
          spreadPct,
        },
        sources,
        sourceCount: sanitizeNumber(raw.source_count || sources.length, sources.length),
      },
    };
  }

  /**
   * Normalizes raw TVL_LOOKUP signals from Telegraph miners.
   */
  static normalizeTVL(raw: any, minerMeta: Partial<MinerAttribution> = {}): NormalizedSignal<NormalizedTVL> {
    const rawTvl = sanitizeNumber(raw.tvl_usd || raw.tvl || raw.protocol_tvl || raw.value);
    const warnings: string[] = [];
    if (rawTvl <= 0) warnings.push('Zero or unrecorded TVL');

    const isValid = (raw.status === 'ok' || raw.status === 'success' || !raw.status) && rawTvl >= 0;
    const validation: SignalValidation = {
      isValid,
      hasCanonicalProof: Boolean(raw.canonical || raw.as_of),
      multiSourceVerified: true,
      warnings,
    };

    const calculatedConfidence =
      raw.confidence !== undefined ? clampConfidence(raw.confidence) : isValid ? 1.0 : 0.2;

    const attribution = extractAttribution(raw, minerMeta);

    return {
      id: createSignalId('tvl'),
      intent: 'TVL_LOOKUP',
      success: validation.isValid,
      confidence: calculatedConfidence,
      timestamp: raw.as_of || new Date().toISOString(),
      canonical: raw.canonical || `tvl:${raw.protocol || raw.query || 'unknown'}:${rawTvl}`,
      summary: raw.summary || `${raw.protocol || raw.query || 'Protocol'} has $${rawTvl.toLocaleString('en-US')} TVL`,
      attribution,
      validation,
      data: {
        entityId: String(raw.protocol || raw.query || '').toLowerCase(),
        protocolName: String(raw.protocol || raw.query || ''),
        tvlUsd: rawTvl,
        chainTvlUsd: raw.chain_tvl_usd != null ? sanitizeNumber(raw.chain_tvl_usd) : null,
        protocolTotalTvlUsd: raw.protocol_total_tvl_usd != null ? sanitizeNumber(raw.protocol_total_tvl_usd) : null,
        chain: raw.tvl_chain || raw.chain || null,
      },
    };
  }

  /**
   * Normalizes raw GAS_PRICE signals from Telegraph miners.
   */
  static normalizeGasPrice(
    raw: any,
    minerMeta: Partial<MinerAttribution> = {},
  ): NormalizedSignal<NormalizedGasPrice> {
    const gwei = sanitizeNumber(raw.gas_price_gwei ?? (raw.gas_price_wei ? Number(raw.gas_price_wei) / 1e9 : 0));
    const wei = String(raw.gas_price_wei || Math.round(gwei * 1e9));

    let feeLevel: 'low' | 'moderate' | 'high' | 'surge' = 'low';
    if (gwei > 100) feeLevel = 'surge';
    else if (gwei > 40) feeLevel = 'high';
    else if (gwei > 15) feeLevel = 'moderate';

    const isValid = Boolean(gwei > 0 || wei !== '0');
    const validation: SignalValidation = {
      isValid,
      hasCanonicalProof: Boolean(raw.canonical || raw.as_of),
      multiSourceVerified: true,
      warnings: gwei > 50 ? ['Elevated network gas congestion'] : [],
    };

    const calculatedConfidence =
      raw.confidence !== undefined ? clampConfidence(raw.confidence) : isValid ? 0.98 : 0.2;

    const attribution = extractAttribution(raw, minerMeta);

    return {
      id: createSignalId('gas'),
      intent: 'GAS_PRICE',
      success: validation.isValid,
      confidence: calculatedConfidence,
      timestamp: raw.as_of || new Date().toISOString(),
      canonical: raw.canonical || `${raw.chain || raw.network || 'eth'}:gas:${wei}`,
      summary: raw.summary || `Current gas price on ${raw.chain || raw.network || 'Ethereum'} is ${gwei.toFixed(4)} Gwei`,
      attribution,
      validation,
      data: {
        chain: String(raw.chain || raw.network || 'eth').toLowerCase(),
        gasPriceGwei: gwei,
        gasPriceWei: wei,
        transferCostUsd: raw.tx_cost_usd != null ? sanitizeNumber(raw.tx_cost_usd) : raw.fee_usd != null ? sanitizeNumber(raw.fee_usd) : null,
        nativePriceUsd: raw.native_price_usd != null ? sanitizeNumber(raw.native_price_usd) : null,
        feeLevel,
        blockNumber: raw.block_number != null || raw.block != null ? sanitizeNumber(raw.block_number || raw.block) : null,
      },
    };
  }

  /**
   * Normalizes raw wallet risk assessment signals from Telegraph miners.
   */
  static normalizeWalletAssessment(
    raw: any,
    minerMeta: Partial<MinerAttribution> = {},
  ): NormalizedSignal<NormalizedWalletAssessment> {
    const rawScore = sanitizeNumber(raw.risk_score != null ? raw.risk_score : raw.risk === 'CRITICAL' ? 0.9 : raw.risk === 'HIGH' ? 0.7 : raw.risk === 'MEDIUM' ? 0.4 : 0.05, 0);
    const score = Math.max(0, Math.min(1, rawScore));

    let riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (raw.risk_level || raw.risk) {
      const parsed = String(raw.risk_level || raw.risk).toUpperCase();
      if (['SAFE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(parsed)) {
        riskLevel = parsed as any;
      }
    } else if (score >= 0.8) riskLevel = 'CRITICAL';
    else if (score >= 0.5) riskLevel = 'HIGH';
    else if (score >= 0.25) riskLevel = 'MEDIUM';
    else if (score >= 0.05) riskLevel = 'LOW';
    else riskLevel = 'SAFE';

    const reasonCodes = Array.isArray(raw.reason_codes)
      ? raw.reason_codes.map(String)
      : Array.isArray(raw.flags)
      ? raw.flags.map(String)
      : [];
    const evidenceList = Array.isArray(raw.evidence) ? raw.evidence : [];
    const directFunder = raw.coverage?.funder_fan_out?.funder || raw.direct_funder;

    const validation: SignalValidation = {
      isValid: Boolean(raw.wallet || raw.address),
      hasCanonicalProof: Boolean(raw.coverage || raw.evidenceId || raw.signal),
      multiSourceVerified: true,
      warnings: raw.assessment_status === 'LIMITED' ? ['Bounded historical depth for address'] : [],
    };

    const calculatedConfidence =
      raw.confidence !== undefined ? clampConfidence(raw.confidence) : validation.isValid ? 0.85 : 0.2;

    const attribution = extractAttribution(raw, minerMeta);

    return {
      id: createSignalId('wallet_risk'),
      intent: 'FRAUD_DETECTION',
      success: validation.isValid,
      confidence: calculatedConfidence,
      timestamp: new Date().toISOString(),
      canonical: `wallet_risk:${raw.wallet || raw.address}:${score.toFixed(3)}`,
      summary: raw.explanation || raw.summary || raw.signal || `Wallet risk evaluated at ${score.toFixed(2)} (${riskLevel})`,
      attribution,
      validation,
      data: {
        walletAddress: String(raw.wallet || raw.address || ''),
        chain: String(raw.chain || 'eth'),
        riskScore: score,
        riskLevel,
        assessmentStatus: String(raw.assessment_status || 'ASSESSED'),
        confidence: calculatedConfidence,
        reasonCodes,
        explanation: String(raw.explanation || raw.reason || raw.signal || ''),
        evidenceCount: evidenceList.length,
        directFunder,
        isSanctionedOrExploiter: riskLevel === 'HIGH' || riskLevel === 'CRITICAL',
      },
    };
  }

  /**
   * Normalizes raw fraud query & intelligence signals from Telegraph miners.
   */
  static normalizeFraudQuery(
    raw: any,
    minerMeta: Partial<MinerAttribution> = {},
  ): NormalizedSignal<NormalizedFraudQuery> {
    const verdict: 'ANSWERED' | 'INCONCLUSIVE' | 'CONFIRMED_FRAUD' | 'LEGITIMATE' =
      raw.label === 'ANSWERED'
        ? 'ANSWERED'
        : raw.status === 'INCONCLUSIVE'
        ? 'INCONCLUSIVE'
        : 'ANSWERED';

    const sourceObj = raw.source
      ? {
          title: String(raw.source.title || 'Official Regulator / Enforcement Notice'),
          url: String(raw.source.url || ''),
          provider: String(raw.source.provider || 'Enforcement Archive'),
        }
      : undefined;

    const validation: SignalValidation = {
      isValid: Boolean(raw.answer || raw.summary || raw.signal),
      hasCanonicalProof: Boolean(raw.source || raw.answer),
      multiSourceVerified: true,
      warnings: [],
    };

    const calculatedConfidence =
      raw.confidence !== undefined ? clampConfidence(raw.confidence) : validation.isValid ? 0.95 : 0.2;

    const attribution = extractAttribution(raw, minerMeta);

    return {
      id: createSignalId('fraud_query'),
      intent: 'FRAUD_DETECTION',
      success: validation.isValid,
      confidence: calculatedConfidence,
      timestamp: new Date().toISOString(),
      canonical: `fraud_query:${hashString(raw.query || raw.summary || raw.answer || '')}`,
      summary: String(raw.summary || raw.answer || raw.signal || ''),
      attribution,
      validation,
      data: {
        query: String(raw.query || ''),
        verdict,
        summary: String(raw.summary || raw.answer || raw.signal || ''),
        detailedAnalysis: String(raw.answer || raw.reason || raw.summary || raw.signal || ''),
        confidence: calculatedConfidence,
        primarySource: sourceObj,
      },
    };
  }

  /**
   * Normalizes raw ONCHAIN_TX_LOOKUP signals from Telegraph miners.
   */
  static normalizeTxLookup(
    raw: any,
    minerMeta: Partial<MinerAttribution> = {},
  ): NormalizedSignal<NormalizedTxLookup> {
    const rawStatus = String(raw.status || raw.verdict || 'not_found').toLowerCase();
    const status: 'confirmed' | 'reverted' | 'pending' | 'not_found' = ['confirmed', 'reverted', 'pending'].includes(
      rawStatus,
    )
      ? (rawStatus as any)
      : 'not_found';

    const validation: SignalValidation = {
      isValid: Boolean(raw.tx_hash || raw.hash),
      hasCanonicalProof: Boolean(raw.canonical || raw.as_of),
      multiSourceVerified: true,
      warnings: status === 'not_found' ? ['Transaction not located in indexed chain blocks'] : [],
    };

    const calculatedConfidence =
      raw.confidence !== undefined ? clampConfidence(raw.confidence) : validation.isValid ? 1.0 : 0.2;

    const attribution = extractAttribution(raw, minerMeta);

    return {
      id: createSignalId('tx'),
      intent: 'ONCHAIN_TX_LOOKUP',
      success: validation.isValid,
      confidence: calculatedConfidence,
      timestamp: new Date().toISOString(),
      canonical: raw.canonical || `tx:${raw.chain || 'eth'}:${raw.tx_hash || raw.hash || 'unknown'}:${status}`,
      summary: raw.summary || `Transaction ${raw.tx_hash || raw.hash} is ${status} on ${raw.chain || 'eth'}`,
      attribution,
      validation,
      data: {
        txHash: String(raw.tx_hash || raw.hash || ''),
        chain: String(raw.chain || 'eth'),
        status,
        fromAddress: raw.from || null,
        toAddress: raw.to || null,
        valueWei: raw.value_wei || null,
        valueEth: raw.value_eth != null ? sanitizeNumber(raw.value_eth) : null,
        method: raw.method || null,
        methodSignature: raw.method_signature || null,
        blockNumber: raw.block_number != null ? sanitizeNumber(raw.block_number) : null,
        receiptStatus: raw.receipt_status != null ? sanitizeNumber(raw.receipt_status) : null,
      },
    };
  }

  /**
   * Normalizes raw TOKEN_HOLDER_COUNT signals from Telegraph miners.
   */
  static normalizeTokenHolders(
    raw: any,
    minerMeta: Partial<MinerAttribution> = {},
  ): NormalizedSignal<NormalizedTokenHolders> {
    const holders = sanitizeNumber(raw.holders_count || raw.holders || raw.count);
    const isValid = (raw.status === 'ok' || raw.holders != null || raw.count != null || !raw.status) && holders >= 0;
    const validation: SignalValidation = {
      isValid,
      hasCanonicalProof: Boolean(raw.canonical || raw.as_of),
      multiSourceVerified: true,
      warnings: [],
    };

    const calculatedConfidence =
      raw.confidence !== undefined ? clampConfidence(raw.confidence) : isValid ? 1.0 : 0.2;

    const attribution = extractAttribution(raw, minerMeta);

    return {
      id: createSignalId('holders'),
      intent: 'TOKEN_HOLDER_COUNT',
      success: validation.isValid,
      confidence: calculatedConfidence,
      timestamp: raw.as_of || new Date().toISOString(),
      canonical: raw.canonical || `holders:${raw.chain || 'eth'}:${raw.token || raw.address || 'unknown'}:${holders}`,
      summary: raw.summary || `${raw.token_symbol || 'Token'} has ${holders.toLocaleString('en-US')} holders on ${raw.chain || 'eth'}`,
      attribution,
      validation,
      data: {
        tokenAddress: String(raw.token || raw.address || ''),
        tokenName: String(raw.token_name || raw.token_symbol || 'Token'),
        tokenSymbol: String(raw.token_symbol || ''),
        chain: String(raw.chain || 'eth'),
        holdersCount: holders,
      },
    };
  }

  /**
   * Normalizes raw SSL_VERIFICATION signals from Telegraph miners.
   */
  static normalizeSSLCheck(
    raw: any,
    minerMeta: Partial<MinerAttribution> = {},
  ): NormalizedSignal<NormalizedSSLCheck> {
    const days = sanitizeNumber(raw.days_until_expiry || raw.days_remaining, 0);
    const isValid = Boolean((raw.valid && (raw.authorized || raw.trusted || raw.hostname_match)) || raw.verdict === 'valid');

    const warnings: string[] = [];
    if (!isValid) warnings.push('Invalid or unverified SSL handshake');
    if (days < 14 && days > 0) warnings.push(`SSL Certificate expires in ${days} days`);

    const isSuccess = raw.status === 'ok' || raw.verdict != null || raw.valid != null;
    const validation: SignalValidation = {
      isValid: isSuccess,
      hasCanonicalProof: Boolean(raw.canonical || raw.checked_at),
      multiSourceVerified: true,
      warnings,
    };

    const calculatedConfidence =
      raw.confidence !== undefined ? clampConfidence(raw.confidence) : isSuccess ? 1.0 : 0.2;

    const attribution = extractAttribution(raw, minerMeta);

    return {
      id: createSignalId('ssl'),
      intent: 'SSL_VERIFICATION',
      success: validation.isValid,
      confidence: calculatedConfidence,
      timestamp: raw.checked_at || new Date().toISOString(),
      canonical: raw.canonical || `ssl:${raw.domain || raw.query}:${isValid ? 'valid' : 'invalid'}:${days}`,
      summary: raw.summary || `${raw.domain || raw.query} SSL certificate status: ${isValid ? 'VALID' : 'INVALID'}`,
      attribution,
      validation,
      data: {
        domain: String(raw.domain || raw.query || ''),
        isValid,
        isAuthorized: Boolean(raw.authorized || raw.trusted),
        issuer: String(raw.issuer || 'Unknown Issuer'),
        validFrom: raw.valid_from || null,
        validTo: raw.valid_to || null,
        daysUntilExpiry: days,
        statusText: isValid ? 'VALID_AND_ACTIVE' : 'EXPIRED_OR_UNTRUSTED',
      },
    };
  }
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
