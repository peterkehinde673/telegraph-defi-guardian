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
  const routing = raw?.routing || raw?.data?.routing || {};
  const minerId =
    minerMeta.minerId ||
    routing.miner_id ||
    routing.minerId ||
    routing.subnet_id ||
    routing.subnetId ||
    raw?.miner_id ||
    raw?.minerId ||
    raw?.subnet_id ||
    'unattributed';

  const minerName =
    minerMeta.minerName ||
    routing.miner_name ||
    routing.minerName ||
    routing.subnet_name ||
    routing.subnetName ||
    raw?.miner_name ||
    raw?.subnet_name ||
    (minerId !== 'unattributed' ? `Telegraph Miner #${minerId}` : 'Telegraph Engine Router');

  return {
    minerId: String(minerId),
    minerName,
    slug: minerMeta.slug || routing.slug || raw?.miner_slug,
    protocol: minerMeta.protocol || routing.protocol || raw?.protocol || 'telegraph-engine',
    rank: minerMeta.rank ?? routing.rank ?? raw?.miner_rank,
    score: minerMeta.score ?? routing.score ?? raw?.miner_score,
    walletAddress: minerMeta.walletAddress || routing.wallet_address || routing.walletAddress || raw?.miner_wallet,
    endpoint: minerMeta.endpoint || 'POST /v1/ask',
  };
}

export class TelegraphNormalizer {
  /**
   * Normalizes raw CRYPTO_PRICE signals from Telegraph Engine / miners.
   */
  static normalizeCryptoPrice(
    raw: any,
    minerMeta: Partial<MinerAttribution> = {},
  ): NormalizedSignal<NormalizedCryptoPrice> {
    const dataObj =
      raw && typeof raw.result === 'object' && raw.result !== null
        ? raw.result
        : raw?.data && typeof raw.data === 'object'
        ? raw.data
        : raw || {};

    let rawPrice = sanitizeNumber(dataObj.price_usd ?? dataObj.price ?? dataObj.median_price ?? dataObj.value ?? raw.price_usd ?? raw.price);
    if (rawPrice <= 0 && typeof raw?.result === 'string') {
      const match = raw.result.match(/\$?\s*([0-9,]+(?:\.[0-9]+)?)/);
      if (match) {
        rawPrice = sanitizeNumber(match[1].replace(/,/g, ''));
      }
    }

    const low = dataObj.price_range_low_usd != null ? sanitizeNumber(dataObj.price_range_low_usd) : null;
    const high = dataObj.price_range_high_usd != null ? sanitizeNumber(dataObj.price_range_high_usd) : null;
    const spreadPct =
      low !== null && high !== null && high > 0
        ? ((high - low) / high) * 100
        : dataObj.spread_bps != null
        ? dataObj.spread_bps / 100
        : null;

    const sources = Array.isArray(dataObj.sources)
      ? dataObj.sources.map((s: any) => ({
          source: String(s.source || s.name || s || 'feed'),
          priceUsd: sanitizeNumber(s.price_usd || s.price || rawPrice),
        }))
      : [];

    const warnings: string[] = [];
    if (sources.length === 0) warnings.push('Single source price feed');
    if (spreadPct !== null && spreadPct > 1.5) warnings.push(`Price disparity between sources: ${spreadPct.toFixed(2)}%`);

    const isValid = (dataObj.status === 'ok' || dataObj.intent === 'CRYPTO_PRICE' || raw.status === 'ok' || !raw.status) && rawPrice > 0;
    const validation: SignalValidation = {
      isValid,
      hasCanonicalProof: Boolean(dataObj.canonical || dataObj.as_of || raw.canonical || raw.routing),
      multiSourceVerified: sources.length >= 2 || (dataObj.source_count && dataObj.source_count >= 2),
      warnings,
    };

    const calculatedConfidence =
      raw.confidence !== undefined
        ? clampConfidence(raw.confidence)
        : dataObj.confidence !== undefined
        ? clampConfidence(dataObj.confidence)
        : sources.length >= 2
        ? 1.0
        : isValid
        ? 0.85
        : 0.2;

    const attribution = extractAttribution(raw, minerMeta);
    const assetId = String(dataObj.asset || dataObj.query || dataObj.symbol || raw.asset || raw.query || raw.symbol || '').toLowerCase();
    const symbol = String(dataObj.symbol || dataObj.asset || dataObj.query || raw.symbol || raw.asset || raw.query || '').toUpperCase();

    return {
      id: createSignalId('price'),
      intent: 'CRYPTO_PRICE',
      success: validation.isValid,
      confidence: calculatedConfidence,
      timestamp: dataObj.as_of || dataObj.observed_at || raw.as_of || new Date().toISOString(),
      canonical: dataObj.canonical || raw.canonical || `crypto_price:${assetId || 'unknown'}:${rawPrice}`,
      summary: raw.summary || dataObj.summary || (typeof raw.result === 'string' ? raw.result : `${symbol || 'Asset'} price is $${rawPrice.toFixed(2)} USD`),
      attribution,
      validation,
      data: {
        assetId,
        symbol,
        priceUsd: rawPrice,
        change24hPct: dataObj.change_24h_pct != null ? sanitizeNumber(dataObj.change_24h_pct) : null,
        marketCapUsd: dataObj.market_cap_usd != null ? sanitizeNumber(dataObj.market_cap_usd) : null,
        priceRange: {
          lowUsd: low,
          highUsd: high,
          spreadPct,
        },
        sources,
        sourceCount: sanitizeNumber(dataObj.source_count || sources.length, sources.length),
      },
    };
  }

  /**
   * Normalizes raw TVL_LOOKUP signals from Telegraph Engine / miners.
   */
  static normalizeTVL(raw: any, minerMeta: Partial<MinerAttribution> = {}): NormalizedSignal<NormalizedTVL> {
    const dataObj =
      raw && typeof raw.result === 'object' && raw.result !== null
        ? raw.result
        : raw?.data && typeof raw.data === 'object'
        ? raw.data
        : raw || {};

    let rawTvl = sanitizeNumber(dataObj.tvl_usd ?? dataObj.tvl ?? dataObj.protocol_tvl ?? dataObj.value ?? raw.tvl_usd ?? raw.tvl);
    if (rawTvl <= 0 && typeof raw?.result === 'string') {
      const match = raw.result.match(/\$?\s*([0-9,]+(?:\.[0-9]+)?)\s*(?:billion|b|million|m)?/i);
      if (match) {
        let num = parseFloat(match[1].replace(/,/g, ''));
        if (/billion|b/i.test(match[0])) num *= 1e9;
        else if (/million|m/i.test(match[0])) num *= 1e6;
        rawTvl = num;
      }
    }

    const warnings: string[] = [];
    if (rawTvl <= 0) warnings.push('Zero or unrecorded TVL');

    const isValid = (dataObj.status === 'ok' || dataObj.status === 'success' || raw.status === 'ok' || !raw.status) && rawTvl >= 0;
    const validation: SignalValidation = {
      isValid,
      hasCanonicalProof: Boolean(dataObj.canonical || dataObj.as_of || raw.canonical || raw.routing),
      multiSourceVerified: true,
      warnings,
    };

    const calculatedConfidence =
      raw.confidence !== undefined
        ? clampConfidence(raw.confidence)
        : dataObj.confidence !== undefined
        ? clampConfidence(dataObj.confidence)
        : isValid
        ? 1.0
        : 0.2;

    const attribution = extractAttribution(raw, minerMeta);
    const protoName = String(dataObj.protocol || dataObj.query || raw.protocol || raw.query || '');

    return {
      id: createSignalId('tvl'),
      intent: 'TVL_LOOKUP',
      success: validation.isValid,
      confidence: calculatedConfidence,
      timestamp: dataObj.as_of || raw.as_of || new Date().toISOString(),
      canonical: dataObj.canonical || raw.canonical || `tvl:${protoName || 'unknown'}:${rawTvl}`,
      summary: raw.summary || dataObj.summary || (typeof raw.result === 'string' ? raw.result : `${protoName || 'Protocol'} has $${rawTvl.toLocaleString('en-US')} TVL`),
      attribution,
      validation,
      data: {
        entityId: protoName.toLowerCase(),
        protocolName: protoName,
        tvlUsd: rawTvl,
        chainTvlUsd: dataObj.chain_tvl_usd != null ? sanitizeNumber(dataObj.chain_tvl_usd) : null,
        protocolTotalTvlUsd: dataObj.protocol_total_tvl_usd != null ? sanitizeNumber(dataObj.protocol_total_tvl_usd) : null,
        chain: dataObj.tvl_chain || dataObj.chain || raw.chain || null,
      },
    };
  }

  /**
   * Normalizes raw GAS_PRICE signals from Telegraph Engine / miners.
   */
  static normalizeGasPrice(
    raw: any,
    minerMeta: Partial<MinerAttribution> = {},
  ): NormalizedSignal<NormalizedGasPrice> {
    const dataObj =
      raw && typeof raw.result === 'object' && raw.result !== null
        ? raw.result
        : raw?.data && typeof raw.data === 'object'
        ? raw.data
        : raw || {};

    let gwei = sanitizeNumber(dataObj.gas_price_gwei ?? (dataObj.gas_price_wei ? Number(dataObj.gas_price_wei) / 1e9 : raw.gas_price_gwei));
    if (gwei <= 0 && typeof raw?.result === 'string') {
      const match = raw.result.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:gwei)/i);
      if (match) {
        gwei = parseFloat(match[1]);
      }
    }
    const wei = String(dataObj.gas_price_wei || Math.round(gwei * 1e9));

    let feeLevel: 'low' | 'moderate' | 'high' | 'surge' = 'low';
    if (gwei > 100) feeLevel = 'surge';
    else if (gwei > 40) feeLevel = 'high';
    else if (gwei > 15) feeLevel = 'moderate';

    const isValid = Boolean(gwei > 0 || wei !== '0');
    const validation: SignalValidation = {
      isValid,
      hasCanonicalProof: Boolean(dataObj.canonical || dataObj.as_of || raw.canonical || raw.routing),
      multiSourceVerified: true,
      warnings: gwei > 50 ? ['Elevated network gas congestion'] : [],
    };

    const calculatedConfidence =
      raw.confidence !== undefined
        ? clampConfidence(raw.confidence)
        : dataObj.confidence !== undefined
        ? clampConfidence(dataObj.confidence)
        : isValid
        ? 0.98
        : 0.2;

    const attribution = extractAttribution(raw, minerMeta);
    const chainName = String(dataObj.chain || dataObj.network || raw.chain || raw.network || 'eth').toLowerCase();

    return {
      id: createSignalId('gas'),
      intent: 'GAS_PRICE',
      success: validation.isValid,
      confidence: calculatedConfidence,
      timestamp: dataObj.as_of || raw.as_of || new Date().toISOString(),
      canonical: dataObj.canonical || raw.canonical || `${chainName}:gas:${wei}`,
      summary: raw.summary || dataObj.summary || (typeof raw.result === 'string' ? raw.result : `Current gas price on ${chainName} is ${gwei.toFixed(4)} Gwei`),
      attribution,
      validation,
      data: {
        chain: chainName,
        gasPriceGwei: gwei,
        gasPriceWei: wei,
        transferCostUsd: dataObj.tx_cost_usd != null ? sanitizeNumber(dataObj.tx_cost_usd) : dataObj.fee_usd != null ? sanitizeNumber(dataObj.fee_usd) : null,
        nativePriceUsd: dataObj.native_price_usd != null ? sanitizeNumber(dataObj.native_price_usd) : null,
        feeLevel,
        blockNumber: dataObj.block_number != null || dataObj.block != null ? sanitizeNumber(dataObj.block_number || dataObj.block) : null,
      },
    };
  }

  /**
   * Normalizes raw wallet risk assessment signals from Telegraph Engine / miners.
   */
  static normalizeWalletAssessment(
    raw: any,
    minerMeta: Partial<MinerAttribution> = {},
  ): NormalizedSignal<NormalizedWalletAssessment> {
    const dataObj =
      raw && typeof raw.result === 'object' && raw.result !== null
        ? raw.result
        : raw?.data && typeof raw.data === 'object'
        ? raw.data
        : raw || {};

    const rawScore = sanitizeNumber(dataObj.risk_score != null ? dataObj.risk_score : dataObj.risk === 'CRITICAL' ? 0.9 : dataObj.risk === 'HIGH' ? 0.7 : dataObj.risk === 'MEDIUM' ? 0.4 : 0.05, 0);
    const score = Math.max(0, Math.min(1, rawScore));

    let riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (dataObj.risk_level || dataObj.risk) {
      const parsed = String(dataObj.risk_level || dataObj.risk).toUpperCase();
      if (['SAFE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(parsed)) {
        riskLevel = parsed as any;
      }
    } else if (score >= 0.8) riskLevel = 'CRITICAL';
    else if (score >= 0.5) riskLevel = 'HIGH';
    else if (score >= 0.25) riskLevel = 'MEDIUM';
    else if (score >= 0.05) riskLevel = 'LOW';
    else riskLevel = 'SAFE';

    const reasonCodes = Array.isArray(dataObj.reason_codes)
      ? dataObj.reason_codes.map(String)
      : Array.isArray(dataObj.flags)
      ? dataObj.flags.map(String)
      : [];
    const evidenceList = Array.isArray(dataObj.evidence) ? dataObj.evidence : [];
    const directFunder = dataObj.coverage?.funder_fan_out?.funder || dataObj.direct_funder;
    const walletAddr = String(dataObj.wallet || dataObj.address || raw.wallet || raw.address || '');

    const validation: SignalValidation = {
      isValid: Boolean(walletAddr),
      hasCanonicalProof: Boolean(dataObj.coverage || dataObj.evidenceId || dataObj.signal || raw.canonical || raw.routing),
      multiSourceVerified: true,
      warnings: dataObj.assessment_status === 'LIMITED' ? ['Bounded historical depth for address'] : [],
    };

    const calculatedConfidence =
      raw.confidence !== undefined
        ? clampConfidence(raw.confidence)
        : dataObj.confidence !== undefined
        ? clampConfidence(dataObj.confidence)
        : validation.isValid
        ? 0.85
        : 0.2;

    const attribution = extractAttribution(raw, minerMeta);

    return {
      id: createSignalId('wallet_risk'),
      intent: 'FRAUD_DETECTION',
      success: validation.isValid,
      confidence: calculatedConfidence,
      timestamp: new Date().toISOString(),
      canonical: `wallet_risk:${walletAddr}:${score.toFixed(3)}`,
      summary: raw.explanation || dataObj.explanation || raw.summary || dataObj.summary || (typeof raw.result === 'string' ? raw.result : `Wallet risk evaluated at ${score.toFixed(2)} (${riskLevel})`),
      attribution,
      validation,
      data: {
        walletAddress: walletAddr,
        chain: String(dataObj.chain || raw.chain || 'eth'),
        riskScore: score,
        riskLevel,
        assessmentStatus: String(dataObj.assessment_status || 'ASSESSED'),
        confidence: calculatedConfidence,
        reasonCodes,
        explanation: String(dataObj.explanation || dataObj.reason || dataObj.signal || (typeof raw.result === 'string' ? raw.result : '')),
        evidenceCount: evidenceList.length,
        directFunder,
        isSanctionedOrExploiter: riskLevel === 'HIGH' || riskLevel === 'CRITICAL',
      },
    };
  }

  /**
   * Normalizes raw fraud query & intelligence signals from Telegraph Engine / miners.
   */
  static normalizeFraudQuery(
    raw: any,
    minerMeta: Partial<MinerAttribution> = {},
  ): NormalizedSignal<NormalizedFraudQuery> {
    const dataObj =
      raw && typeof raw.result === 'object' && raw.result !== null
        ? raw.result
        : raw?.data && typeof raw.data === 'object'
        ? raw.data
        : raw || {};

    const verdict: 'ANSWERED' | 'INCONCLUSIVE' | 'CONFIRMED_FRAUD' | 'LEGITIMATE' =
      dataObj.label === 'ANSWERED' || raw.label === 'ANSWERED'
        ? 'ANSWERED'
        : dataObj.status === 'INCONCLUSIVE' || raw.status === 'INCONCLUSIVE'
        ? 'INCONCLUSIVE'
        : 'ANSWERED';

    const sourceObj = dataObj.source || raw.source
      ? {
          title: String(dataObj.source?.title || raw.source?.title || 'Official Regulator / Enforcement Notice'),
          url: String(dataObj.source?.url || raw.source?.url || ''),
          provider: String(dataObj.source?.provider || raw.source?.provider || 'Enforcement Archive'),
        }
      : undefined;

    const answerText = String(dataObj.answer || dataObj.summary || dataObj.signal || (typeof raw.result === 'string' ? raw.result : raw.summary || raw.answer || ''));

    const validation: SignalValidation = {
      isValid: Boolean(answerText),
      hasCanonicalProof: Boolean(sourceObj || answerText || raw.routing),
      multiSourceVerified: true,
      warnings: [],
    };

    const calculatedConfidence =
      raw.confidence !== undefined
        ? clampConfidence(raw.confidence)
        : dataObj.confidence !== undefined
        ? clampConfidence(dataObj.confidence)
        : validation.isValid
        ? 0.95
        : 0.2;

    const attribution = extractAttribution(raw, minerMeta);
    const queryText = String(dataObj.query || raw.query || '');

    return {
      id: createSignalId('fraud_query'),
      intent: 'FRAUD_DETECTION',
      success: validation.isValid,
      confidence: calculatedConfidence,
      timestamp: new Date().toISOString(),
      canonical: `fraud_query:${hashString(queryText || answerText)}`,
      summary: answerText,
      attribution,
      validation,
      data: {
        query: queryText,
        verdict,
        summary: answerText,
        detailedAnalysis: String(dataObj.detailedAnalysis || dataObj.reason || answerText),
        confidence: calculatedConfidence,
        primarySource: sourceObj,
      },
    };
  }

  /**
   * Normalizes raw ONCHAIN_TX_LOOKUP signals from Telegraph Engine / miners.
   */
  static normalizeTxLookup(
    raw: any,
    minerMeta: Partial<MinerAttribution> = {},
  ): NormalizedSignal<NormalizedTxLookup> {
    const dataObj =
      raw && typeof raw.result === 'object' && raw.result !== null
        ? raw.result
        : raw?.data && typeof raw.data === 'object'
        ? raw.data
        : raw || {};

    const rawStatus = String(dataObj.status || dataObj.verdict || raw.status || raw.verdict || 'not_found').toLowerCase();
    const status: 'confirmed' | 'reverted' | 'pending' | 'not_found' = ['confirmed', 'reverted', 'pending'].includes(
      rawStatus,
    )
      ? (rawStatus as any)
      : 'not_found';

    const txHash = String(dataObj.tx_hash || dataObj.hash || raw.tx_hash || raw.hash || '');
    const chainName = String(dataObj.chain || raw.chain || 'eth');

    const validation: SignalValidation = {
      isValid: Boolean(txHash),
      hasCanonicalProof: Boolean(dataObj.canonical || dataObj.as_of || raw.canonical || raw.routing),
      multiSourceVerified: true,
      warnings: status === 'not_found' ? ['Transaction not located in indexed chain blocks'] : [],
    };

    const calculatedConfidence =
      raw.confidence !== undefined
        ? clampConfidence(raw.confidence)
        : dataObj.confidence !== undefined
        ? clampConfidence(dataObj.confidence)
        : validation.isValid
        ? 1.0
        : 0.2;

    const attribution = extractAttribution(raw, minerMeta);

    return {
      id: createSignalId('tx'),
      intent: 'ONCHAIN_TX_LOOKUP',
      success: validation.isValid,
      confidence: calculatedConfidence,
      timestamp: new Date().toISOString(),
      canonical: dataObj.canonical || raw.canonical || `tx:${chainName}:${txHash || 'unknown'}:${status}`,
      summary: raw.summary || dataObj.summary || (typeof raw.result === 'string' ? raw.result : `Transaction ${txHash} is ${status} on ${chainName}`),
      attribution,
      validation,
      data: {
        txHash,
        chain: chainName,
        status,
        fromAddress: dataObj.from || raw.from || null,
        toAddress: dataObj.to || raw.to || null,
        valueWei: dataObj.value_wei || raw.value_wei || null,
        valueEth: dataObj.value_eth != null ? sanitizeNumber(dataObj.value_eth) : raw.value_eth != null ? sanitizeNumber(raw.value_eth) : null,
        method: dataObj.method || raw.method || null,
        methodSignature: dataObj.method_signature || raw.method_signature || null,
        blockNumber: dataObj.block_number != null ? sanitizeNumber(dataObj.block_number) : raw.block_number != null ? sanitizeNumber(raw.block_number) : null,
        receiptStatus: dataObj.receipt_status != null ? sanitizeNumber(dataObj.receipt_status) : raw.receipt_status != null ? sanitizeNumber(raw.receipt_status) : null,
      },
    };
  }

  /**
   * Normalizes raw TOKEN_HOLDER_COUNT signals from Telegraph Engine / miners.
   */
  static normalizeTokenHolders(
    raw: any,
    minerMeta: Partial<MinerAttribution> = {},
  ): NormalizedSignal<NormalizedTokenHolders> {
    const dataObj =
      raw && typeof raw.result === 'object' && raw.result !== null
        ? raw.result
        : raw?.data && typeof raw.data === 'object'
        ? raw.data
        : raw || {};

    let holders = sanitizeNumber(dataObj.holders_count ?? dataObj.holders ?? dataObj.count ?? raw.holders_count ?? raw.holders ?? raw.count);
    if (holders <= 0 && typeof raw?.result === 'string') {
      const match = raw.result.match(/([0-9,]+)\s*(?:holders|addresses|holders count)/i);
      if (match) {
        holders = sanitizeNumber(match[1].replace(/,/g, ''));
      }
    }

    const isValid = (dataObj.status === 'ok' || dataObj.holders != null || dataObj.count != null || raw.status === 'ok' || !raw.status) && holders >= 0;
    const validation: SignalValidation = {
      isValid,
      hasCanonicalProof: Boolean(dataObj.canonical || dataObj.as_of || raw.canonical || raw.routing),
      multiSourceVerified: true,
      warnings: [],
    };

    const calculatedConfidence =
      raw.confidence !== undefined
        ? clampConfidence(raw.confidence)
        : dataObj.confidence !== undefined
        ? clampConfidence(dataObj.confidence)
        : isValid
        ? 1.0
        : 0.2;

    const attribution = extractAttribution(raw, minerMeta);
    const tokenAddr = String(dataObj.token || dataObj.address || raw.token || raw.address || '');
    const tokenSym = String(dataObj.token_symbol || dataObj.symbol || raw.token_symbol || raw.symbol || '');
    const chainName = String(dataObj.chain || raw.chain || 'eth');

    return {
      id: createSignalId('holders'),
      intent: 'TOKEN_HOLDER_COUNT',
      success: validation.isValid,
      confidence: calculatedConfidence,
      timestamp: dataObj.as_of || raw.as_of || new Date().toISOString(),
      canonical: dataObj.canonical || raw.canonical || `holders:${chainName}:${tokenAddr || 'unknown'}:${holders}`,
      summary: raw.summary || dataObj.summary || (typeof raw.result === 'string' ? raw.result : `${tokenSym || 'Token'} has ${holders.toLocaleString('en-US')} holders on ${chainName}`),
      attribution,
      validation,
      data: {
        tokenAddress: tokenAddr,
        tokenName: String(dataObj.token_name || dataObj.name || raw.token_name || tokenSym || 'Token'),
        tokenSymbol: tokenSym,
        chain: chainName,
        holdersCount: holders,
      },
    };
  }

  /**
   * Normalizes raw SSL_VERIFICATION signals from Telegraph Engine / miners.
   */
  static normalizeSSLCheck(
    raw: any,
    minerMeta: Partial<MinerAttribution> = {},
  ): NormalizedSignal<NormalizedSSLCheck> {
    const dataObj =
      raw && typeof raw.result === 'object' && raw.result !== null
        ? raw.result
        : raw?.data && typeof raw.data === 'object'
        ? raw.data
        : raw || {};

    const days = sanitizeNumber(dataObj.days_until_expiry ?? dataObj.days_remaining ?? raw.days_until_expiry ?? raw.days_remaining, 0);
    const isValid = Boolean(
      (dataObj.valid && (dataObj.authorized || dataObj.trusted || dataObj.hostname_match)) ||
      dataObj.verdict === 'valid' ||
      (raw.valid && (raw.authorized || raw.trusted || raw.hostname_match)) ||
      raw.verdict === 'valid' ||
      (typeof raw.result === 'string' && /valid|active|trusted/i.test(raw.result))
    );

    const warnings: string[] = [];
    if (!isValid) warnings.push('Invalid or unverified SSL handshake');
    if (days < 14 && days > 0) warnings.push(`SSL Certificate expires in ${days} days`);

    const isSuccess = dataObj.status === 'ok' || dataObj.verdict != null || dataObj.valid != null || raw.status === 'ok' || raw.verdict != null || raw.valid != null || typeof raw.result === 'string';
    const validation: SignalValidation = {
      isValid: isSuccess,
      hasCanonicalProof: Boolean(dataObj.canonical || dataObj.checked_at || raw.canonical || raw.routing),
      multiSourceVerified: true,
      warnings,
    };

    const calculatedConfidence =
      raw.confidence !== undefined
        ? clampConfidence(raw.confidence)
        : dataObj.confidence !== undefined
        ? clampConfidence(dataObj.confidence)
        : isSuccess
        ? 1.0
        : 0.2;

    const attribution = extractAttribution(raw, minerMeta);
    const domainName = String(dataObj.domain || dataObj.query || raw.domain || raw.query || '');

    return {
      id: createSignalId('ssl'),
      intent: 'SSL_VERIFICATION',
      success: validation.isValid,
      confidence: calculatedConfidence,
      timestamp: dataObj.checked_at || raw.checked_at || new Date().toISOString(),
      canonical: dataObj.canonical || raw.canonical || `ssl:${domainName}:${isValid ? 'valid' : 'invalid'}:${days}`,
      summary: raw.summary || dataObj.summary || (typeof raw.result === 'string' ? raw.result : `${domainName} SSL certificate status: ${isValid ? 'VALID' : 'INVALID'}`),
      attribution,
      validation,
      data: {
        domain: domainName,
        isValid,
        isAuthorized: Boolean(dataObj.authorized || dataObj.trusted || raw.authorized || raw.trusted),
        issuer: String(dataObj.issuer || raw.issuer || 'Unknown Issuer'),
        validFrom: dataObj.valid_from || raw.valid_from || null,
        validTo: dataObj.valid_to || raw.valid_to || null,
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
