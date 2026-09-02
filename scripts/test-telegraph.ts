import { telegraphClient } from '../server/telegraph/client.ts';
import { telegraphService } from '../server/telegraph/service.ts';

async function main() {
  console.log('================================================================');
  console.log('Telegraph Protocol Track 3 Application Consumer Verification');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Telegraph Node Status
  console.log('1. Querying Official Telegraph Node Status...');
  try {
    const status = await telegraphClient.getNodeStatus();
    if (!status || !status.publicKey) {
      throw new Error('Invalid node status response format');
    }
    console.log('✅ Connected to Telegraph Node:');
    console.log(`   Public Key: ${status.publicKey}`);
    console.log(`   Signer: ${status.signer || 'Null / Ready'}\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ Telegraph Node Status lookup failed:', err.message);
    failed++;
  }

  // 2. Telegraph Miner Dispatcher Registry & Intent Discovery
  console.log('2. Querying Live Telegraph Miner Dispatcher Registry...');
  let activeIntents: string[] = [];
  try {
    const miners = await telegraphClient.getMinerIntegrations();
    if (!Array.isArray(miners) || miners.length === 0) {
      throw new Error('Empty or invalid miner registry returned from Telegraph Node');
    }
    activeIntents = Array.from(new Set(miners.flatMap((m) => m.supported_intents || [])));
    console.log(`✅ Retrieved ${miners.length} registered Telegraph Miners from Dispatcher.`);
    console.log(`   Active Intents on Network: ${activeIntents.join(', ')}\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ Miner Dispatcher Registry lookup failed:', err.message);
    failed++;
  }

  // 3. Dynamic Intent Dispatch & Normalization (CRYPTO_PRICE)
  console.log('3. Testing Dynamic Intent Dispatch & Normalization: CRYPTO_PRICE (ethereum)...');
  try {
    const priceSignal = await telegraphService.getCryptoPrice('ethereum');
    if (!priceSignal || !priceSignal.data || priceSignal.data.priceUsd <= 0) {
      throw new Error('Invalid or empty CRYPTO_PRICE signal returned');
    }
    console.log('✅ Real Crypto Price received via dynamic Telegraph Miner routing:');
    console.log(`   Signal ID: ${priceSignal.id}`);
    console.log(`   Asset: ${priceSignal.data.symbol} (${priceSignal.data.assetId})`);
    console.log(`   Price: $${priceSignal.data.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`);
    console.log(`   Confidence: ${priceSignal.confidence}`);
    console.log(`   Sources Count: ${priceSignal.data.sourceCount}`);
    console.log(`   Authentic Miner Attribution: ${priceSignal.attribution.minerName} (ID: ${priceSignal.attribution.minerId})`);
    console.log(`   Miner Rank in Telegraph Subnet: ${priceSignal.attribution.rank ?? 'Registered'}`);
    console.log(`   Dynamic Endpoint Used: ${priceSignal.attribution.endpoint || 'Declared Miner Endpoint'}\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ Dynamic CRYPTO_PRICE intent failed:', err.message);
    failed++;
  }

  // 4. Dynamic Intent Dispatch & Normalization (TVL_LOOKUP)
  console.log('4. Testing Dynamic Intent Dispatch & Normalization: TVL_LOOKUP (uniswap)...');
  try {
    const tvlSignal = await telegraphService.getTVL('uniswap');
    if (!tvlSignal || !tvlSignal.data) {
      throw new Error('Invalid TVL signal returned');
    }
    console.log('✅ Real TVL received via dynamic Telegraph Miner routing:');
    console.log(`   Protocol: ${tvlSignal.data.protocolName}`);
    console.log(`   TVL: $${tvlSignal.data.tvlUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`);
    console.log(`   Authentic Miner Attribution: ${tvlSignal.attribution.minerName} (ID: ${tvlSignal.attribution.minerId})\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ Dynamic TVL_LOOKUP intent failed:', err.message);
    failed++;
  }

  // 5. Dynamic Intent Dispatch & Normalization (GAS_PRICE)
  console.log('5. Testing Dynamic Intent Dispatch & Normalization: GAS_PRICE (eth)...');
  try {
    const gasSignal = await telegraphService.getGasPrice('eth');
    if (!gasSignal || !gasSignal.data) {
      throw new Error('Invalid GAS_PRICE signal returned');
    }
    console.log('✅ Real Gas Price received via dynamic Telegraph Miner routing:');
    console.log(`   Chain: ${gasSignal.data.chain}`);
    console.log(`   Gas Price: ${gasSignal.data.gasPriceGwei.toFixed(4)} Gwei`);
    console.log(`   Authentic Miner Attribution: ${gasSignal.attribution.minerName} (ID: ${gasSignal.attribution.minerId})\n`);
    passed++;
  } catch (err: any) {
    console.error('❌ Dynamic GAS_PRICE intent failed:', err.message);
    failed++;
  }

  // 6. Live Subnet Response Cryptographic Events
  console.log('6. Querying Live Base-Sepolia Cryptographic Subnet Events...');
  try {
    const events = await telegraphClient.getLiveSubnetResponses();
    if (!Array.isArray(events)) {
      throw new Error('Invalid events response array');
    }
    console.log(`✅ Retrieved ${events.length} signed on-chain events.`);
    if (events.length > 0) {
      console.log(`   Latest Event ID: ${events[0].id}`);
      console.log(`   Origin Chain: ${events[0].startchain}`);
      console.log(`   Submitter: ${events[0].submitter}`);
    }
    console.log('');
    passed++;
  } catch (err: any) {
    console.error('❌ Live Subnet Events query failed:', err.message);
    failed++;
  }

  console.log('================================================================');
  if (failed > 0) {
    console.error(`🚨 TELEGRAPH CONSUMER VERIFICATION FAILED: ${failed} check(s) failed, ${passed} passed.`);
    console.error('Telegraph consumer integration unavailable or failing in this environment.');
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passed} TELEGRAPH CONSUMER VERIFICATION CHECKS PASSED!`);
    console.log('Telegraph DeFi Guardian is operating as a genuine Track 3 Application Consumer.');
    console.log('================================================================');
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
