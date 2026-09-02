import { telegraphService, TelegraphNormalizer } from '../server/telegraph/index.ts';

async function testNormalizationLayer() {
  console.log('===============================================================');
  console.log('Telegraph Protocol Intelligence Normalization Layer Verification');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. CRYPTO_PRICE Normalization (Engine Payload Verification)
  try {
    console.log('1. Testing CRYPTO_PRICE Normalization (Engine Payload & Live)...');
    const mockEnginePrice = {
      result: {
        symbol: 'ETH',
        price_usd: 3450.25,
        change_24h_pct: 3.42,
        market_cap_usd: 415000000000,
        low_usd: 3380.0,
        high_usd: 3490.5,
        spread_pct: 0.045,
        sources: [{ source: 'binance', price_usd: 3450.1 }, { source: 'coinbase', price_usd: 3450.4 }],
        source_count: 2,
      },
      routing: {
        miner_id: 'miner_price_99',
        miner_name: 'PythOracle',
        subnet_id: '10',
        rank: 1,
      },
      confidence: 0.98,
    };
    const priceSignal = TelegraphNormalizer.normalizeCryptoPrice(mockEnginePrice);
    if (!priceSignal || priceSignal.data.priceUsd !== 3450.25 || priceSignal.attribution.minerId !== 'miner_price_99') {
      throw new Error('Normalizer failed to parse Engine CRYPTO_PRICE response correctly');
    }
    console.log('✅ CRYPTO_PRICE Normalized Output:');
    console.log(`   Signal ID: ${priceSignal.id}`);
    console.log(`   Intent: ${priceSignal.intent} (Confidence: ${priceSignal.confidence})`);
    console.log(`   Data: Asset: ${priceSignal.data.symbol} | Price: $${priceSignal.data.priceUsd.toFixed(2)} USD | 24h: ${priceSignal.data.change24hPct?.toFixed(2)}% | Sources: ${priceSignal.data.sourceCount}`);
    console.log(`   Attribution: ${priceSignal.attribution.minerName} (ID: ${priceSignal.attribution.minerId})\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ CRYPTO_PRICE failed:', err.message);
    failed++;
  }

  // 2. TVL_LOOKUP Normalization (Engine Payload Verification)
  try {
    console.log('2. Testing TVL_LOOKUP Normalization (Engine Payload & Live)...');
    const mockEngineTVL = {
      result: {
        entity_id: 'uniswap',
        protocol_name: 'Uniswap V3',
        tvl_usd: 5800000000,
        chain: 'ethereum',
      },
      routing: {
        miner_id: 'miner_tvl_01',
        miner_name: 'DefiLlamaMiner',
        subnet_id: '12',
      },
      confidence: 0.95,
    };
    const tvlSignal = TelegraphNormalizer.normalizeTVL(mockEngineTVL);
    if (!tvlSignal || tvlSignal.data.tvlUsd !== 5800000000 || tvlSignal.attribution.minerName !== 'DefiLlamaMiner') {
      throw new Error('Normalizer failed to parse Engine TVL response correctly');
    }
    console.log('✅ TVL_LOOKUP Normalized Output:');
    console.log(`   Signal ID: ${tvlSignal.id}`);
    console.log(`   Data: Protocol: ${tvlSignal.data.protocolName} | TVL: $${tvlSignal.data.tvlUsd.toLocaleString('en-US')} USD`);
    console.log(`   Attribution: ${tvlSignal.attribution.minerName} (ID: ${tvlSignal.attribution.minerId})\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ TVL_LOOKUP failed:', err.message);
    failed++;
  }

  // 3. GAS_PRICE Normalization
  try {
    console.log('3. Testing GAS_PRICE Normalization...');
    const mockEngineGas = {
      result: {
        chain: 'eth',
        gas_price_gwei: 18.5,
        fee_level: 'low',
        block_number: 19800100,
      },
      routing: {
        miner_id: 'miner_gas_03',
        miner_name: 'EtherscanOracle',
      },
    };
    const gasSignal = TelegraphNormalizer.normalizeGasPrice(mockEngineGas);
    if (!gasSignal || gasSignal.data.gasPriceGwei !== 18.5) {
      throw new Error('Normalizer failed to parse Engine GAS_PRICE response correctly');
    }
    console.log('✅ GAS_PRICE Normalized Output:');
    console.log(`   Signal ID: ${gasSignal.id}`);
    console.log(`   Data: Chain: ${gasSignal.data.chain} | Gas: ${gasSignal.data.gasPriceGwei.toFixed(4)} Gwei | Fee Level: ${gasSignal.data.feeLevel}`);
    console.log(`   Attribution: ${gasSignal.attribution.minerName}\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ GAS_PRICE failed:', err.message);
    failed++;
  }

  // 4. FRAUD_DETECTION (Wallet Assessment) Normalization
  try {
    console.log('4. Testing Wallet Risk Assessment Normalization...');
    const mockEngineWallet = {
      result: {
        wallet_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        chain: 'eth',
        risk_score: 0.05,
        risk_level: 'LOW',
        reason_codes: ['ESTABLISHED_WHALE_CLEAN'],
        direct_funder: 'Genesis Block / Mining Pool',
      },
      routing: {
        miner_id: 'miner_wallet_risk',
        miner_name: 'SentinelAI',
      },
      confidence: 0.99,
    };
    const walletSignal = TelegraphNormalizer.normalizeWalletAssessment(mockEngineWallet);
    if (!walletSignal || walletSignal.data.riskScore !== 0.05) {
      throw new Error('Normalizer failed to parse Engine Wallet Assessment response correctly');
    }
    console.log('✅ FRAUD_DETECTION (Wallet) Normalized Output:');
    console.log(`   Signal ID: ${walletSignal.id}`);
    console.log(`   Data: Wallet: ${walletSignal.data.walletAddress}`);
    console.log(`   Risk Score: ${walletSignal.data.riskScore.toFixed(2)} | Level: ${walletSignal.data.riskLevel}`);
    console.log(`   Attribution: ${walletSignal.attribution.minerName}\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ Wallet Risk failed:', err.message);
    failed++;
  }

  // 5. FRAUD_DETECTION (Knowledge Query) Normalization
  try {
    console.log('5. Testing Fraud Knowledge Query Normalization...');
    const mockEngineFraud = {
      result: {
        query: 'Was BitConnect a Ponzi scheme?',
        verdict: 'CONFIRMED_FRAUD',
        summary: 'BitConnect was shut down by regulators in 2018 as a high-yield Ponzi scheme.',
        source: {
          title: 'SEC Enforcement Release No. 2021-172',
          url: 'https://sec.gov/news/press-release/2021-172',
          provider: 'U.S. Securities and Exchange Commission',
        },
      },
      routing: {
        miner_id: 'miner_fraud_archive',
        miner_name: 'ChainForensics',
      },
      confidence: 0.99,
    };
    const querySignal = TelegraphNormalizer.normalizeFraudQuery(mockEngineFraud);
    if (!querySignal || !querySignal.data.summary.includes('BitConnect')) {
      throw new Error('Normalizer failed to parse Engine Fraud Query response correctly');
    }
    console.log('✅ FRAUD_DETECTION (Knowledge) Normalized Output:');
    console.log(`   Signal ID: ${querySignal.id}`);
    console.log(`   Verdict: ${querySignal.data.verdict} (Confidence: ${querySignal.data.confidence})`);
    console.log(`   Summary: ${querySignal.data.summary.substring(0, 100)}...`);
    console.log(`   Source: ${querySignal.data.primarySource?.title}\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ Fraud Knowledge failed:', err.message);
    failed++;
  }

  // 6. TOKEN_HOLDER_COUNT Normalization
  try {
    console.log('6. Testing TOKEN_HOLDER_COUNT Normalization...');
    const mockEngineHolders = {
      result: {
        token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        token_symbol: 'USDC',
        token_name: 'USD Coin',
        chain: 'eth',
        holders_count: 2450000,
      },
      routing: {
        miner_id: 'miner_holders_01',
        miner_name: 'TokenDistributionIndex',
      },
    };
    const holdersSignal = TelegraphNormalizer.normalizeTokenHolders(mockEngineHolders);
    if (!holdersSignal || holdersSignal.data.holdersCount !== 2450000) {
      throw new Error('Normalizer failed to parse Engine Token Holders response correctly');
    }
    console.log('✅ TOKEN_HOLDER_COUNT Normalized Output:');
    console.log(`   Signal ID: ${holdersSignal.id}`);
    console.log(`   Data: ${holdersSignal.data.tokenSymbol} (${holdersSignal.data.chain}) -> ${holdersSignal.data.holdersCount.toLocaleString('en-US')} holders`);
    console.log(`   Attribution: ${holdersSignal.attribution.minerName}\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ Token Holders failed:', err.message);
    failed++;
  }

  // 7. SSL_VERIFICATION Normalization
  try {
    console.log('7. Testing SSL_VERIFICATION Normalization...');
    const mockEngineSSL = {
      result: {
        domain: 'ethereum.org',
        valid: true,
        authorized: true,
        issuer: "Let's Encrypt Authority",
        days_until_expiry: 84,
      },
      routing: {
        miner_id: 'miner_ssl_check',
        miner_name: 'CertSentinel',
      },
    };
    const sslSignal = TelegraphNormalizer.normalizeSSLCheck(mockEngineSSL);
    if (!sslSignal || !sslSignal.data.isValid || sslSignal.data.daysUntilExpiry !== 84) {
      throw new Error('Normalizer failed to parse Engine SSL Check response correctly');
    }
    console.log('✅ SSL_VERIFICATION Normalized Output:');
    console.log(`   Signal ID: ${sslSignal.id}`);
    console.log(`   Data: Domain: ${sslSignal.data.domain} | Valid: ${sslSignal.data.isValid} | Issuer: ${sslSignal.data.issuer} | Days: ${sslSignal.data.daysUntilExpiry}`);
    console.log(`   Attribution: ${sslSignal.attribution.minerName}\n`);
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
