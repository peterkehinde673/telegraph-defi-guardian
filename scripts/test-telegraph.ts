import { telegraphClient } from '../server/telegraph/client.ts';

async function main() {
  console.log('====================================================');
  console.log('Testing Telegraph Protocol End-to-End Integration');
  console.log('====================================================\n');

  try {
    console.log('1. Querying Telegraph Node Status...');
    const status = await telegraphClient.getNodeStatus();
    console.log('✅ Node Status response received:');
    console.log(`   Public Key: ${status.publicKey}`);
    console.log(`   Signer: ${status.signer || 'Null / Ready'}\n`);
  } catch (err: any) {
    console.error('❌ Node Status error:', err.message);
  }

  try {
    console.log('2. Querying Live Telegraph On-Chain Subnet Events...');
    const events = await telegraphClient.getLiveSubnetResponses();
    console.log(`✅ Retrieved ${events.length} live signed events from Base-Sepolia.`);
    if (events.length > 0) {
      console.log(`   Sample Event ID: ${events[0].id}`);
      console.log(`   Chain: ${events[0].startchain}`);
      console.log(`   Event Type: ${events[0].event}`);
      console.log(`   Response String: ${JSON.stringify(events[0].response_string)}`);
    }
    console.log('');
  } catch (err: any) {
    console.error('❌ Live Events error:', err.message);
  }

  try {
    console.log('3. Querying Telegraph Miner Dispatcher Registry...');
    const miners = await telegraphClient.getMinerIntegrations();
    console.log(`✅ Retrieved ${miners.length} registered Telegraph Miners.`);
    const intents = Array.from(new Set(miners.flatMap((m) => m.supported_intents)));
    console.log(`   Available Intents: ${intents.join(', ')}\n`);
  } catch (err: any) {
    console.error('❌ Miner Registry error:', err.message);
  }

  try {
    console.log('4. Testing Real Telegraph Miner Intent: CRYPTO_PRICE (ethereum)...');
    const price = await telegraphClient.requestCryptoPrice('ethereum');
    console.log('✅ Real Crypto Price received from Telegraph Miner:');
    console.log(`   Asset: ${price.symbol} (${price.query})`);
    console.log(`   Price: $${price.price_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`);
    console.log(`   24h Change: ${price.change_24h_pct?.toFixed(2)}%`);
    console.log(`   Market Cap: $${price.market_cap_usd?.toLocaleString('en-US')}`);
    console.log(`   Sources: ${price.sources?.map((s) => `${s.source}: $${s.price_usd}`).join(', ')}`);
    console.log(`   Attribution: Miner ID ${price.miner_id} (${price.miner_name})\n`);
  } catch (err: any) {
    console.error('❌ Crypto Price error:', err.message);
  }

  try {
    console.log('5. Testing Real Telegraph Miner Intent: TVL_LOOKUP (uniswap)...');
    const tvl = await telegraphClient.requestTVLLookup('uniswap');
    console.log('✅ Real TVL received from Telegraph Miner:');
    console.log(`   Protocol: ${tvl.protocol}`);
    console.log(`   TVL: $${tvl.tvl_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`);
    console.log(`   Confidence: ${tvl.confidence}`);
    console.log(`   Attribution: Miner ID ${tvl.miner_id} (${tvl.miner_name})\n`);
  } catch (err: any) {
    console.error('❌ TVL error:', err.message);
  }

  try {
    console.log('6. Testing Real Telegraph Miner Intent: GAS_PRICE (eth)...');
    const gas = await telegraphClient.requestGasPrice('eth');
    console.log('✅ Real Gas Price received from Telegraph Miner:');
    console.log(`   Chain: ${gas.chain}`);
    console.log(`   Gas Price: ${gas.gas_price_gwei} Gwei`);
    console.log(`   Summary: ${gas.summary}`);
    console.log(`   Attribution: Miner ID ${gas.miner_id} (${gas.miner_name})\n`);
  } catch (err: any) {
    console.error('❌ Gas error:', err.message);
  }

  console.log('====================================================');
  console.log('Telegraph Protocol Phase 1 Verification COMPLETE');
  console.log('====================================================');
}

main().catch(console.error);
