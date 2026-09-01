import { deFiRiskEngine } from '../server/risk-engine/engine.ts';
import { DEFAULT_RISK_CONFIG } from '../server/risk-engine/config.ts';
import { InputIntelligenceBundle, SubjectTarget } from '../server/risk-engine/types.ts';
import { telegraphService } from '../server/telegraph/index.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${msg}`);
  }
}

async function runRiskEngineTests() {
  console.log('===============================================================');
  console.log('DeFi Guardian Risk Analysis Engine Test Suite');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  // -------------------------------------------------------------
  // Test 1: Baseline Edge Case - Empty Input Bundle (Graceful Degradation)
  // -------------------------------------------------------------
  try {
    console.log('Test 1: Graceful Degradation on Completely Empty Bundle...');
    const emptySubject: SubjectTarget = { id: 'test_empty', name: 'Empty Test Asset', type: 'token' };
    const emptyReport = deFiRiskEngine.analyze(emptySubject, {});

    assert(emptyReport.applicationInterpretation.overallRiskScore >= 0, 'Risk score must be >= 0');
    assert(emptyReport.applicationInterpretation.overallRiskScore <= 100, 'Risk score must be <= 100');
    assert(emptyReport.applicationInterpretation.confidenceScore <= 0.3, 'Confidence must be degraded on empty signals');
    assert(emptyReport.applicationInterpretation.missingDataWarnings.length >= 4, 'Must produce missing data warnings');
    assert(emptyReport.attributionDisclaimer.includes('Attribution Disclaimer'), 'Must include attribution disclaimer');
    console.log(`✅ Passed: Empty bundle handled safely (Score: ${emptyReport.applicationInterpretation.overallRiskScore}, Confidence: ${emptyReport.applicationInterpretation.confidenceScore})\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ Test 1 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 2: Extreme Volatility & High Liquidity Deficit (Critical Risk)
  // -------------------------------------------------------------
  try {
    console.log('Test 2: Detecting Critical Risk (Extreme Dump + Collapsed TVL)...');
    const dangerousSubject: SubjectTarget = { id: 'toxic_token', name: 'Toxic Yield Token', type: 'protocol' };
    const toxicBundle: InputIntelligenceBundle = {
      price: {
        id: 'sig_price_toxic',
        intent: 'CRYPTO_PRICE',
        success: true,
        confidence: 0.9,
        timestamp: new Date().toISOString(),
        canonical: 'crypto:toxic:1.0',
        summary: 'Toxic token down 65%',
        attribution: { minerId: '9002', minerName: 'TxLens' },
        validation: { isValid: true, hasCanonicalProof: true, multiSourceVerified: true, warnings: [] },
        data: {
          assetId: 'toxic',
          symbol: 'TOXIC',
          priceUsd: 0.05,
          change24hPct: -65.4,
          marketCapUsd: 150000,
          priceRange: { lowUsd: 0.04, highUsd: 0.06, spreadPct: 33.3 },
          sources: [{ source: 'feedA', priceUsd: 0.04 }, { source: 'feedB', priceUsd: 0.06 }],
          sourceCount: 2,
        },
      },
      tvl: {
        id: 'sig_tvl_toxic',
        intent: 'TVL_LOOKUP',
        success: true,
        confidence: 0.95,
        timestamp: new Date().toISOString(),
        canonical: 'tvl:toxic:50000',
        summary: 'Collateral depleted',
        attribution: { minerId: '9002', minerName: 'TxLens' },
        validation: { isValid: true, hasCanonicalProof: true, multiSourceVerified: true, warnings: ['Depleted TVL'] },
        data: {
          entityId: 'toxic',
          protocolName: 'Toxic Yield',
          tvlUsd: 45000,
          chainTvlUsd: null,
          protocolTotalTvlUsd: null,
          chain: 'eth',
        },
      },
      gas: {
        id: 'sig_gas_toxic',
        intent: 'GAS_PRICE',
        success: true,
        confidence: 0.98,
        timestamp: new Date().toISOString(),
        canonical: 'gas:eth:180',
        summary: 'Gas surging',
        attribution: { minerId: '9002', minerName: 'TxLens' },
        validation: { isValid: true, hasCanonicalProof: true, multiSourceVerified: true, warnings: [] },
        data: {
          chain: 'eth',
          gasPriceGwei: 185.0,
          gasPriceWei: '185000000000',
          transferCostUsd: 12.5,
          nativePriceUsd: 2400,
          feeLevel: 'surge',
          blockNumber: 25861800,
        },
      },
    };

    const toxicReport = deFiRiskEngine.analyze(dangerousSubject, toxicBundle);
    assert(toxicReport.applicationInterpretation.overallRiskScore >= 78, 'Toxic subject must be scored as CRITICAL (>=78)');
    assert(toxicReport.applicationInterpretation.riskClassification === 'CRITICAL', 'Classification must be CRITICAL');
    assert(toxicReport.applicationInterpretation.negativeSignals.length >= 3, 'Must identify multiple negative signals');
    assert(toxicReport.applicationInterpretation.warnings.length >= 2, 'Must issue critical warnings');
    console.log(`✅ Passed: Critical Risk detected accurately (Score: ${toxicReport.applicationInterpretation.overallRiskScore}/100, Class: ${toxicReport.applicationInterpretation.riskClassification})\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ Test 2 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 3: High Security & Counterparty Wallet Assessment
  // -------------------------------------------------------------
  try {
    console.log('Test 3: Counterparty Security Evaluation (Sanctioned / Exploit Cluster)...');
    const exploiterSubject: SubjectTarget = { id: 'exploiter_wallet', name: 'Flagged Mixer Wallet', type: 'wallet' };
    const exploitBundle: InputIntelligenceBundle = {
      walletRisk: {
        id: 'sig_wallet_exploit',
        intent: 'FRAUD_DETECTION',
        success: true,
        confidence: 0.95,
        timestamp: new Date().toISOString(),
        canonical: 'wallet_risk:0x123:0.95',
        summary: 'Flagged mixer deposit',
        attribution: { minerId: '9002', minerName: 'TxLens' },
        validation: { isValid: true, hasCanonicalProof: true, multiSourceVerified: true, warnings: [] },
        data: {
          walletAddress: '0x1234567890123456789012345678901234567890',
          chain: 'eth',
          riskScore: 0.95,
          riskLevel: 'CRITICAL',
          assessmentStatus: 'ASSESSED',
          confidence: 0.95,
          reasonCodes: ['DIRECT_MIXER_FUNDER', 'OFAC_SANCTION_CLUSTER'],
          explanation: 'Direct connection to flagged laundering mixer',
          evidenceCount: 4,
          isSanctionedOrExploiter: true,
        },
      },
    };

    const exploitReport = deFiRiskEngine.analyze(exploiterSubject, exploitBundle);
    assert(exploitReport.applicationInterpretation.categoryBreakdown.COUNTERPARTY_SECURITY.score >= 90, 'Security score must be >= 90');
    assert(exploitReport.applicationInterpretation.evidenceAttribution.some(e => e.factorId === 'WALLET_SECURITY_SENTINEL'), 'Must attribute to Sentinel Miner');
    console.log(`✅ Passed: Counterparty vulnerability flagged (Security Subscore: ${exploitReport.applicationInterpretation.categoryBreakdown.COUNTERPARTY_SECURITY.score}/100)\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ Test 3 Failed:', err.message);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 4: End-to-End Real-Time Analysis with Real Telegraph Intelligence
  // -------------------------------------------------------------
  try {
    console.log('Test 4: Full Multi-Intent Analysis with REAL Telegraph Data (Ethereum / Uniswap / USDC)...');
    
    // Fetch live normalized signals directly from Telegraph miners
    const [priceSignal, tvlSignal, gasSignal, holdersSignal, sslSignal] = await Promise.all([
      telegraphService.getCryptoPrice('ethereum'),
      telegraphService.getTVL('uniswap'),
      telegraphService.getGasPrice('eth'),
      telegraphService.getTokenHolders('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'eth'),
      telegraphService.checkSSL('ethereum.org'),
    ]);

    const realSubject: SubjectTarget = {
      id: 'eth_defi_core',
      name: 'Ethereum DeFi Core Ecosystem',
      symbol: 'ETH',
      type: 'composite',
      chain: 'Ethereum',
    };

    const realBundle: InputIntelligenceBundle = {
      price: priceSignal,
      tvl: tvlSignal,
      gas: gasSignal,
      holders: holdersSignal,
      ssl: sslSignal,
    };

    const report = deFiRiskEngine.analyze(realSubject, realBundle);

    console.log('📊 Real Telegraph Risk Assessment Report Generated:');
    console.log(`   Subject: ${report.subject.name} (${report.subject.symbol})`);
    console.log(`   Overall Risk Score: ${report.applicationInterpretation.overallRiskScore}/100`);
    console.log(`   Risk Classification: ${report.applicationInterpretation.riskClassification}`);
    console.log(`   Confidence Score: ${(report.applicationInterpretation.confidenceScore * 100).toFixed(0)}%`);
    console.log(`   Price 24h Change: ${priceSignal.data.change24hPct?.toFixed(2)}% | Spread: ${priceSignal.data.priceRange.spreadPct?.toFixed(3)}%`);
    console.log(`   Protocol TVL: $${(tvlSignal.data.tvlUsd / 1e9).toFixed(2)}B USD (Institutional Tier)`);
    console.log(`   Gas Level: ${gasSignal.data.gasPriceGwei.toFixed(4)} Gwei (${gasSignal.data.feeLevel})`);
    console.log(`   Token Holders: ${holdersSignal.data.holdersCount.toLocaleString('en-US')}`);
    console.log(`   Evidence Attribution Count: ${report.applicationInterpretation.evidenceAttribution.length} attested factors`);
    console.log(`   Positive Signals (${report.applicationInterpretation.positiveSignals.length}): ${report.applicationInterpretation.positiveSignals.slice(0, 2).join(' | ')}`);
    console.log(`   Executive Summary: ${report.applicationInterpretation.executiveSummary}\n`);

    assert(report.applicationInterpretation.riskClassification === 'LOW' || report.applicationInterpretation.riskClassification === 'MODERATE', 'Bluechip ETH/Uniswap ecosystem must be LOW or MODERATE risk');
    assert(report.applicationInterpretation.confidenceScore >= 0.85, 'Confidence must be high with 5 verified signals');
    assert(report.derivedCalculations.marketCapToTvlRatio !== null, 'Calculates Mcap/TVL ratio deterministically');
    assert(report.applicationInterpretation.evidenceAttribution.length >= 4, 'Must attribute all active miners');
    passed++;
  } catch (err: any) {
    console.error('❌ Test 4 Failed:', err.message);
    failed++;
  }

  console.log('===============================================================');
  console.log(`DeFi Guardian Risk Engine Tests: ${passed} passed, ${failed} failed.`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runRiskEngineTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
