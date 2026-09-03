import 'dotenv/config';
import { telegraphClient } from '../server/telegraph/client.ts';
import { TelegraphNormalizer } from '../server/telegraph/normalizer.ts';

async function main() {
  console.log('================================================================');
  console.log('Telegraph Protocol Track 3 Engine Consumer Live Verification');
  console.log('================================================================\n');

  const engineUrl = process.env.TELEGRAPH_ENGINE_URL || 'http://13.237.89.59:8080';
  const nodeUrl = process.env.TELEGRAPH_NODE_URL || 'https://devnode.telegraphprotocol.com';
  const hasEvmKey = Boolean(process.env.TELEGRAPH_EVM_PRIVATE_KEY);

  console.log(`📡 Telegraph Engine URL : ${engineUrl}`);
  console.log(`🌐 Telegraph Node URL   : ${nodeUrl}`);
  console.log(`🔑 x402 EVM Key Config  : ${hasEvmKey ? 'Configured (Auto-Pay Enabled)' : 'Not configured — requests requiring x402 payment may return HTTP 402'}\n`);

  // 1. Live Telegraph Engine Verification (Guardian -> POST /v1/ask -> x402 if required -> Telegraph Engine -> real response -> normalizer)
  console.log('1. Testing Live Telegraph Engine Consumer Path (POST /v1/ask)...');
  const testQuery = 'What is the real-time USD price, 24h change, and spread for ethereum?';
  console.log(`   Endpoint        : POST ${engineUrl}/v1/ask`);
  console.log(`   Submitted Query : "${testQuery}"`);

  let engineResponse: any = null;

  try {
    engineResponse = await telegraphClient.askEngine(testQuery);
    console.log('✅ Real Telegraph Engine Live Response Received:');
    console.log(`   Raw Output Preview: ${JSON.stringify(engineResponse).substring(0, 200)}...`);
  } catch (err: any) {
    console.error(`\n❌ LIVE ENGINE REQUEST FAILED: ${err.message}`);
    if (err.message.includes('402')) {
      console.error('   Reason: HTTP 402 Payment Required.');
      console.error('   The Telegraph Engine requires x402 micropayment to route this intelligence intent.');
      if (!hasEvmKey) {
        console.error('   Configuration: No EVM private key configured (TELEGRAPH_EVM_PRIVATE_KEY is unset).');
      }
    } else {
      console.error('   The Telegraph Engine auto-router at POST /v1/ask did not return a successful live response.');
    }
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
