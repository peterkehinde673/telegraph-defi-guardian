import { telegraphService } from '../server/telegraph/index.ts';

async function testNormalizationLayer() {
  console.log('===============================================================');
  console.log('Telegraph Protocol Intelligence Normalization Layer Verification');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. CRYPTO_PRICE Normalization
  try {
    console.log('1. Testing Normalized CRYPTO_PRICE (ethereum)...');
    const priceSignal = await telegraphService.getCryptoPrice('ethereum');
    console.log('✅ CRYPTO_PRICE Normalized Output:');
    console.log(`   Signal ID: ${priceSignal.id}`);
    console.log(`   Intent: ${priceSignal.intent} (Confidence: ${priceSignal.confidence})`);
    console.log(`   Canonical: ${priceSignal.canonical}`);
    console.log(`   Data: Asset: ${priceSignal.data.symbol} | Price: $${priceSignal.data.priceUsd.toFixed(2)} USD | 24h: ${priceSignal.data.change24hPct?.toFixed(2)}% | Sources: ${priceSignal.data.sourceCount}`);
    console.log(`   Validation: Valid=${priceSignal.validation.isValid}, MultiSource=${priceSignal.validation.multiSourceVerified}, Warnings=[${priceSignal.validation.warnings.join(', ')}]`);
    console.log(`   Attribution: ${priceSignal.attribution.minerName} (ID: ${priceSignal.attribution.minerId})\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ CRYPTO_PRICE failed:', err.message);
    failed++;
  }

  // 2. TVL_LOOKUP Normalization
  try {
    console.log('2. Testing Normalized TVL_LOOKUP (uniswap)...');
    const tvlSignal = await telegraphService.getTVL('uniswap');
    console.log('✅ TVL_LOOKUP Normalized Output:');
    console.log(`   Signal ID: ${tvlSignal.id}`);
    console.log(`   Intent: ${tvlSignal.intent} (Confidence: ${tvlSignal.confidence})`);
    console.log(`   Data: Protocol: ${tvlSignal.data.protocolName} | TVL: $${tvlSignal.data.tvlUsd.toLocaleString('en-US')} USD`);
    console.log(`   Canonical: ${tvlSignal.canonical}`);
    console.log(`   Attribution: ${tvlSignal.attribution.minerName} (ID: ${tvlSignal.attribution.minerId})\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ TVL_LOOKUP failed:', err.message);
    failed++;
  }

  // 3. GAS_PRICE Normalization
  try {
    console.log('3. Testing Normalized GAS_PRICE (eth)...');
    const gasSignal = await telegraphService.getGasPrice('eth');
    console.log('✅ GAS_PRICE Normalized Output:');
    console.log(`   Signal ID: ${gasSignal.id}`);
    console.log(`   Data: Chain: ${gasSignal.data.chain} | Gas: ${gasSignal.data.gasPriceGwei.toFixed(4)} Gwei | Fee Level: ${gasSignal.data.feeLevel} | Block: ${gasSignal.data.blockNumber}`);
    console.log(`   Canonical: ${gasSignal.canonical}`);
    console.log(`   Attribution: ${gasSignal.attribution.minerName}\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ GAS_PRICE failed:', err.message);
    failed++;
  }

  // 4. FRAUD_DETECTION (Wallet Assessment) Normalization
  try {
    console.log('4. Testing Normalized Wallet Risk Assessment (vitalik.eth)...');
    const walletSignal = await telegraphService.assessWallet('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
    console.log('✅ FRAUD_DETECTION (Wallet) Normalized Output:');
    console.log(`   Signal ID: ${walletSignal.id}`);
    console.log(`   Data: Wallet: ${walletSignal.data.walletAddress}`);
    console.log(`   Risk Score: ${walletSignal.data.riskScore.toFixed(2)} | Level: ${walletSignal.data.riskLevel} | Direct Funder: ${walletSignal.data.directFunder || 'Identified'}`);
    console.log(`   Reason Codes: ${walletSignal.data.reasonCodes.join(', ')}`);
    console.log(`   Canonical: ${walletSignal.canonical}\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ Wallet Risk failed:', err.message);
    failed++;
  }

  // 5. FRAUD_DETECTION (Knowledge Query) Normalization
  try {
    console.log('5. Testing Normalized Fraud Knowledge Query...');
    const querySignal = await telegraphService.queryFraudIntelligence('Was BitConnect a Ponzi scheme?');
    console.log('✅ FRAUD_DETECTION (Knowledge) Normalized Output:');
    console.log(`   Signal ID: ${querySignal.id}`);
    console.log(`   Verdict: ${querySignal.data.verdict} (Confidence: ${querySignal.data.confidence})`);
    console.log(`   Summary: ${querySignal.data.summary.substring(0, 100)}...`);
    console.log(`   Source: ${querySignal.data.primarySource?.title} (${querySignal.data.primarySource?.provider})\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ Fraud Knowledge failed:', err.message);
    failed++;
  }

  // 6. TOKEN_HOLDER_COUNT Normalization
  try {
    console.log('6. Testing Normalized TOKEN_HOLDER_COUNT (USDC)...');
    const holdersSignal = await telegraphService.getTokenHolders('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'eth');
    console.log('✅ TOKEN_HOLDER_COUNT Normalized Output:');
    console.log(`   Signal ID: ${holdersSignal.id}`);
    console.log(`   Data: ${holdersSignal.data.tokenSymbol} (${holdersSignal.data.chain}) -> ${holdersSignal.data.holdersCount.toLocaleString('en-US')} holders`);
    console.log(`   Canonical: ${holdersSignal.canonical}\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ Token Holders failed:', err.message);
    failed++;
  }

  // 7. SSL_VERIFICATION Normalization
  try {
    console.log('7. Testing Normalized SSL_VERIFICATION (ethereum.org)...');
    const sslSignal = await telegraphService.checkSSL('ethereum.org');
    console.log('✅ SSL_VERIFICATION Normalized Output:');
    console.log(`   Signal ID: ${sslSignal.id}`);
    console.log(`   Data: Domain: ${sslSignal.data.domain} | Valid: ${sslSignal.data.isValid} | Issuer: ${sslSignal.data.issuer} | Days to Expiry: ${sslSignal.data.daysUntilExpiry}`);
    console.log(`   Status: ${sslSignal.data.statusText}\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ SSL Check failed:', err.message);
    failed++;
  }

  // 8. Network Overview & Health
  try {
    console.log('8. Testing Telegraph Network Overview & Event Stream...');
    const overview = await telegraphService.getNetworkOverview();
    console.log('✅ Network Overview Output:');
    console.log(`   Node Public Key: ${overview.nodeStatus.publicKey}`);
    console.log(`   Live Signed Events Count: ${overview.liveSubnetEvents.length}`);
    console.log(`   Active Registered Miners: ${overview.miners.length}`);
    console.log(`   Active Intents Count: ${overview.activeIntentsCount}\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ Network Overview failed:', err.message);
    failed++;
  }

  console.log('===============================================================');
  console.log(`Normalization Layer Verification: ${passed} passed, ${failed} failed.`);
  console.log('===============================================================');
}

testNormalizationLayer().catch(console.error);
