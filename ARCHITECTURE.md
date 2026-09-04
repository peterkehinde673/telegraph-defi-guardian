# System Architecture: Telegraph DeFi Guardian

> Track 3 application architecture for consuming live Telegraph intelligence and producing a transparent DeFi risk assessment.

## 1. High-level flow

```text
                         END USER
                            |
                            | POST /api/telegraph/analyze
                            v
                  +--------------------+
                  |   Express API      |
                  | validation/limits  |
                  +---------+----------+
                            |
                            | natural-language intent queries
                            v
                  +--------------------+
                  | Telegraph Engine    |
                  | POST /v1/ask         |
                  | x402 when required  |
                  +---------+----------+
                            |
                            | Engine-controlled routing
                            v
                  +--------------------+
                  | Telegraph Miners    |
                  +---------+----------+
                            |
                            v
                  +--------------------+
                  | Normalization       |
                  | validation/parsing  |
                  +---------+----------+
                            |
                            v
                  +--------------------+
                  | DeFi Risk Engine    |
                  | deterministic model|
                  +---------+----------+
                            |
                            v
                  +--------------------+
                  | Risk report / UI    |
                  +--------------------+

Separate read-only telemetry path:
Express -> Telegraph Node -> status/events/miner registry -> dashboard
```

## 2. Telegraph integration boundary

`server/telegraph/client.ts` is the application consumer boundary.

### Intelligence path

All on-demand intelligence methods call `askEngine()`, which sends:

```http
POST ${TELEGRAPH_ENGINE_URL}/v1/ask
Content-Type: application/json

{"query":"..."}
```

The configured public testnet value is:

```text
http://13.237.89.59:7044/engine
```

The application does not locally select a Miner, rank Miner endpoints, or call individual Miner base URLs for intelligence. Telegraph Engine owns routing.

### x402

When the Engine returns `402 Payment Required`, the client uses `@x402/fetch` and `@x402/evm` with the configured Base Sepolia wallet to satisfy the payment challenge and retry the request.

The private key is read only from:

```text
TELEGRAPH_EVM_PRIVATE_KEY
```

It must never be committed or exposed to the browser.

### Read-only node telemetry

The application separately reads:

- `GET /status` for node status
- `GET /` for live SubnetResponse events
- `GET /miner-dispatcher/integrations` for Miner discovery/telemetry

The Miner registry is observability data only. It is not an inference-routing mechanism.

## 3. Backend responsibilities

| Component | Responsibility |
|---|---|
| `server.ts` | Express API, production serving, request validation, public analysis rate limits |
| `server/telegraph/client.ts` | Telegraph Engine requests, x402 payment handling, Node telemetry |
| `server/telegraph/service.ts` | Intent-specific query construction and normalization orchestration |
| `server/telegraph/normalizer.ts` | Parse Engine payloads into typed application signals and distinguish Engine confidence from application-calculated confidence |
| `server/telegraph/types.ts` | Telegraph and normalized data contracts |
| `server/risk-engine/engine.ts` | Deterministic 0–100 risk calculation and evidence generation |
| `server/risk-engine/config.ts` | Risk weights, thresholds, classifications, and missing-data policy |

## 4. Multi-intent analysis

A single user analysis can request several independent Engine questions. Depending on the target, the application can consume:

- `CRYPTO_PRICE`
- `TVL_LOOKUP`
- `GAS_PRICE`
- `FRAUD_DETECTION`
- `TOKEN_HOLDER_COUNT`
- `SSL_VERIFICATION`

The service sends these through the same Engine consumer path. `askEngine()` serializes requests to avoid payment-settlement nonce collisions when several paid queries are needed for one report.

## 5. Normalization and provenance

The normalization layer performs field extraction, numeric sanitization, response validation, and source/confidence handling.

The application follows an important provenance rule:

> If the Engine response exposes Miner identity, confidence, canonical information, or source metadata, preserve it. If it does not, do not infer it from the public Miner registry.

Application-generated values are labeled separately from Telegraph-provided values.

A generated fallback identifier used internally by the application is not presented as a Telegraph cryptographic proof.

## 6. Risk engine

The risk engine consumes normalized signals and calculates five categories:

| Category | Weight |
|---|---:|
| Price stability & volatility | 25% |
| TVL & liquidity cushion | 30% |
| Network execution | 15% |
| Counterparty/security | 20% |
| Holder distribution | 10% |

Missing categories are reported explicitly and contribute an uncertainty adjustment. The final classification is:

- `LOW`: `< 28`
- `MODERATE`: `28–54`
- `HIGH`: `55–77`
- `CRITICAL`: `78–100`

The displayed risk score and derived indicators are DeFi Guardian calculations. They are not Telegraph Miner scores.

## 7. Public deployment protection

The public `/api/telegraph/analyze` endpoint uses an in-memory request limiter because the server holds the x402 payment wallet. Defaults are conservative and can be configured with:

```text
MAX_ANALYSES_PER_IP_PER_HOUR=8
MAX_GLOBAL_ANALYSES_PER_HOUR=60
```

Paid analysis is user-initiated rather than automatically executed when the application opens.

## 8. Frontend

The React frontend provides:

- analysis input and target presets
- risk score and classification
- normalized signal cards
- evidence/provenance table
- deterministic calculations
- raw Engine intelligence viewer
- local session history
- live Telegraph SubnetResponse events
- live Miner registry discovery
- architecture/methodology information

The frontend never receives the x402 private key.

## 9. Production deployment

Render uses:

```text
Build: npm install --no-audit --no-fund && npm run build
Start: npm run start
```

The Express server binds to `0.0.0.0` and uses `process.env.PORT`, making it compatible with Render's assigned port.
