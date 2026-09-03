import 'dotenv/config';
import { telegraphClient } from '../server/telegraph/client.ts';
import { TelegraphNormalizer } from '../server/telegraph/normalizer.ts';

async function main() {
  console.log('================================================================');
  console.log('Telegraph Protocol Track 3 Engine Consumer Live Verification');
  console.log('================================================================\n');

  const engineUrl = telegraphClient.getEngineUrl();
  const nodeUrl = telegraphClient.getNodeUrl();
  const hasEvmKey = Boolean(process.env.TELEGRAPH_EVM_PRIVATE_KEY);

  console.log(`📡 Telegraph Engine URL : ${engineUrl}`);
  console.log(`🌐 Telegraph Node URL   : ${nodeUrl}`);
  console.log(`🔑 x402 EVM Key Config  : ${hasEvmKey ? 'Configured (Auto-Pay Enabled)' : 'Not configured — requests requiring x402 payment will return HTTP 402'}\n`);

  // 1. Live Telegraph Engine Verification (Guardian -> POST /v1/ask -> x402 if required -> Telegraph Engine -> real response -> normalizer)
  console.log('1. Testing Live Telegraph Engine Consumer Path (POST /v1/ask)...');
  const testQuery = 'What is the real-time USD price, 24h change, and spread for ethereum?';
  const targetEndpoint = `${engineUrl}/v1/ask`;
  console.log(`   Endpoint        : POST ${targetEndpoint}`);
  console.log(`   Submitted Query : "${testQuery}"`);

  let engineResponse: any = null;

  try {
    engineResponse = await telegraphClient.askEngine(testQuery);
    console.log('\n✅ HTTP 200: Successful live Engine response received:');
    console.log(`   Raw Output Preview: ${JSON.stringify(engineResponse).substring(0, 200)}...`);
  } catch (err: any) {
    const statusCode = err.statusCode || (err.message.includes('402') ? 402 : err.message.includes('404') ? 404 : null);

    if (statusCode === 402) {
      console.log(`\n🔒 HTTP 402 (Payment Required): Correct protected Engine endpoint reached.`);
      console.log(`   Endpoint Verified    : POST ${targetEndpoint}`);
      console.log('   Verification Result  : Successfully contacted the authentic Telegraph Engine auto-router.');
      console.log('   Protocol Details     : The engine returned HTTP 402 with x402 payment challenges for Base-Sepolia (eip155:84532, asset: USDC).');
      console.log('   Root Cause           : TELEGRAPH_EVM_PRIVATE_KEY is unconfigured (or contains insufficient testnet USDC).');
      console.log('   Protocol Rule        : HTTP 402 is NOT treated as inference success. Synthetic fallback is strictly prohibited.');
      console.log('   Next Action Required : Configure a valid, USDC-funded private key in TELEGRAPH_EVM_PRIVATE_KEY.');
      console.log('\n================================================================');
      console.log('LIVE TELEGRAPH ENGINE VERIFICATION: PAYMENT REQUIRED (HTTP 402)');
      console.log('ENDPOINT STATUS: VALID ENGINE ROUTE CONFIRMED (HTTP 402)');
      console.log('TRACK 3 READY: NO (Requires funded x402 payment wallet)');
      console.log('================================================================');
      process.exit(1);
    }

    if (statusCode === 404) {
      console.error(`\n❌ HTTP 404 (Not Found): Wrong or unavailable Engine endpoint.`);
      console.error(`   Attempted Endpoint   : POST ${targetEndpoint}`);
      console.error('   Verification Result  : The endpoint does not exist on this host/port.');
      console.error('   Per verification standards, synthetic fallback and fabricated miner attribution are prohibited.\n');
      console.log('================================================================');
      console.log('LIVE TELEGRAPH ENGINE VERIFICATION: FAILED (HTTP 404 - Wrong Endpoint)');
      console.log('TRACK 3 READY: NO');
      console.log('================================================================');
      process.exit(1);
    }

    console.error(`\n❌ LIVE ENGINE REQUEST FAILED (HTTP ${statusCode || 'Error'}): ${err.message}`);
    console.error('   Per verification standards, synthetic fallback and fabricated miner attribution are prohibited.\n');
    console.log('================================================================');
    console.log('LIVE TELEGRAPH ENGINE VERIFICATION: FAILED');
    console.log('TRACK 3 READY: NO');
    console.log('================================================================');
    process.exit(1);
  }

  // If live response received, pass through real normalizer
  console.log('\n2. Normalizing Real Live Engine Response...');
  let normalized;
  try {
    normalized = TelegraphNormalizer.normalizeCryptoPrice(engineResponse);
    console.log(`   Signal ID          : ${normalized.id}`);
    console.log(`   Canonical Proof    : ${normalized.canonical}`);
    console.log(`   Price USD          : $${normalized.data.priceUsd.toFixed(2)} USD`);
    console.log(`   Confidence         : ${normalized.confidence} (${normalized.confidenceSource || 'unspecified'})`);
    console.log(`   Miner ID           : ${normalized.attribution.minerId}`);
    console.log(`   Miner Name         : ${normalized.attribution.minerName}`);
    console.log(`   Subnet / Protocol  : ${normalized.attribution.protocol || 'N/A'}`);
    console.log(`   Router Endpoint    : ${normalized.attribution.endpoint}`);
  } catch (normErr: any) {
    console.error(`\n❌ NORMALIZATION OF LIVE ENGINE RESPONSE FAILED: ${normErr.message}\n`);
    console.log('================================================================');
    console.log('LIVE TELEGRAPH ENGINE VERIFICATION: FAILED');
    console.log('TRACK 3 READY: NO');
    console.log('================================================================');
    process.exit(1);
  }

  // 3. Telegraph Official Node Status & Cryptographic Events (Telemetry & Provenance, Not Intelligence Routing)
  console.log('\n3. Querying Official Telegraph Node Status & Live Subnet Events (Telemetry & Provenance, Not Intelligence Routing)...');
  try {
    const status = await telegraphClient.getNodeStatus();
    console.log('✅ Connected to Telegraph Node:');
    console.log(`   Public Key : ${status.publicKey}`);
    console.log(`   Signer     : ${status.signer || 'Null / Ready'}`);

    const events = await telegraphClient.getLiveSubnetResponses();
    console.log(`   Live Subnet Events Count: ${events.length}`);
    if (events.length > 0) {
      console.log(`   Latest Event ID         : ${events[0].id}`);
      console.log(`   Origin Chain            : ${events[0].startchain}`);
    }
  } catch (nodeErr: any) {
    console.error(`\n❌ TELEGRAPH NODE QUERY FAILED: ${nodeErr.message}\n`);
    console.log('================================================================');
    console.log('LIVE TELEGRAPH ENGINE VERIFICATION: FAILED');
    console.log('TRACK 3 READY: NO');
    console.log('================================================================');
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('LIVE TELEGRAPH ENGINE VERIFICATION: PASSED');
  console.log('TRACK 3 READY: YES');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('Fatal unexpected error in verification script:', err);
  console.log('================================================================');
  console.log('LIVE TELEGRAPH ENGINE VERIFICATION: FAILED');
  console.log('TRACK 3 READY: NO');
  console.log('================================================================');
  process.exit(1);
});
