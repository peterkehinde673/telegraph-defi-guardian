# System Architecture: Telegraph DeFi Guardian

> Comprehensive technical blueprint of the Telegraph DeFi Guardian platform, detailing data flow, normalization logic, deterministic risk scoring, and dynamic miner attestation.

---

## 1. High-Level Architecture Flow

```
                      ┌─────────────────────────────────┐
                      │          END USER / UI          │
                      │  (React 19, Lucide, Tailwind)   │
                      └────────────────┬────────────────┘
                                       │ (1. POST /api/telegraph/analyze)
                                       ▼
                      ┌─────────────────────────────────┐
                      │        EXPRESS API LAYER        │
                      │  (server.ts / Server-side Only) │
                      └───────┬─────────────────┬───────┘
                              │                 │
            (2. Intelligence) │                 │ (3. Network Telemetry)
                              ▼                 ▼
  ┌─────────────────────────────────┐      ┌─────────────────────────────────┐
  │     TELEGRAPH ENGINE ROUTER     │      │     TELEGRAPH PROTOCOL NODE     │
  │ • POST /v1/ask                  │      │ • GET /status (Node Public Key) │
  │ • x402 payment flow if required │      │ • GET / (SubnetResponse Stream) │
  │ • Engine resolves & routes query│      │ • GET /miner-dispatcher/integr. │
  │ • Real Miner executes inference │      │   (Discovery/Telemetry Only)    │
  │ • Returns authentic response    │      └────────────────┬────────────────┘
  └────────────────┬────────────────┘                       │
                   │                                        │
                   │ (4. Real Engine Responses)             │
                   ▼                                        │
  ┌────────────────────────────────────────────────────────┐│
  │              TELEGRAPH NORMALIZATION LAYER             ││
  │              (/server/telegraph/normalizer.ts)         ││
  │ • Schema validation & field type checking              ││
  │ • Canonical proof hashing                              ││
  │ • Range clamping & multi-source spread calculation     ││
  │ • Transparent attribution & confidence source handling ││
  └────────────────┬───────────────────────────────────────┘│
                   │                                        │
                   │ (5. Normalized Intelligence Bundle)    │
                   ▼                                        │
  ┌────────────────────────────────────────────────────────┐│
  │             DETERMINISTIC RISK ENGINE v2.1             ││
  │             (/server/risk-engine/engine.ts)            ││
  │ • Price Volatility (25% Weight)                        ││
  │ • TVL & Liquidity Cushion (30% Weight)                 ││
  │ • Counterparty & Contract Security (20% Weight)        ││
  │ • Network Execution Gas (15% Weight)                   ││
  │ • Governance & Token Distribution (10% Weight)         ││
  │ • Missing Data Uncertainty Penalties                   ││
  │ • Derived Calculations (Mcap/TVL, Collateral, Spread)  ││
  └────────────────┬───────────────────────────────────────┘│
                   │                                        │
                   │ (6. DeFi Risk Assessment Report)       │
                   ▼                                        │
  ┌─────────────────────────────────────────────────────────┴─┐
  │                    DASHBOARD AUDITOR VIEW                 │
  │ • 0-100 Risk Score Meter & Classification Gauge           │
  │ • Verified Signal Cards (Price, TVL, Gas, Fraud, Holders) │
  │ • Factor Evidence & Miner Attribution Audit Table         │
  │ • Mathematical Derivations & Category Progress Bars       │
  │ • Live Subnet Signed Events Feed                          │
  │ • Telegraph Active Miners Registry Explorer               │
  └───────────────────────────────────────────────────────────┘
```

---

## 2. Component Directory & Responsibilities

### 2.1 Backend / Server Services (`/server`)

| File / Directory | Purpose & Responsibility |
| :--- | :--- |
| `server.ts` | Main Express server entry point. Configures CORS, sets up `/api/telegraph/*` endpoints with timeouts, mounts Vite in dev mode, and serves built assets in production. |
| `server/telegraph/client.ts` | Dynamic Telegraph Application Consumer client interfacing with `TELEGRAPH_ENGINE_URL` via `POST /v1/ask` with x402 payment support for intelligence routing, and with `TELEGRAPH_NODE_URL` for network discovery/status/telemetry. |
| `server/telegraph/service.ts` | High-level Telegraph orchestration service that formulates intent queries, dispatches them through the Telegraph Engine via `client.askEngine()`, and maps real outputs through the normalizer. |
| `server/telegraph/normalizer.ts` | Sanitizes all raw miner responses into strict, strongly typed canonical interfaces. Extracts prices, calculates spread percentages, validates SSL domains, and produces deterministic hashes. |
| `server/telegraph/types.ts` | Core TypeScript interfaces defining raw miner responses, normalized intelligence signals, and network overview structures. |
| `server/risk-engine/engine.ts` | Pure deterministic evaluation engine. Takes a `SubjectTarget` and `InputIntelligenceBundle` and computes mathematical factor scores, category breakdowns, and confidence ratings. |
| `server/risk-engine/config.ts` | Configuration constants declaring all weight distributions, classification thresholds, liquidity tiers, gas levels, and uncertainty penalties. |
| `server/risk-engine/types.ts` | TypeScript types for subject models, category scores, derived calculations, and final DeFi Risk Reports. |

---

### 2.2 Frontend / Client Architecture (`/src`)

| File / Component | Purpose & Responsibility |
| :--- | :--- |
| `src/App.tsx` | Main application view manager. Manages active tabs (`ANALYSIS`, `EXPLORER`, `MINERS_REGISTRY`, `HOW_IT_WORKS`), historical report storage in `localStorage`, and error boundaries. |
| `src/api/client.ts` | Type-safe frontend API client communicating with `/api/telegraph/*` backend routes. |
| `src/components/Header.tsx` | Top application header displaying node connection status, live subnet event count, active miner count, and node public key. |
| `src/components/SearchPanel.tsx` | Analysis input terminal featuring quick preset buttons, analysis mode selectors, chain filters, and advanced query parameter inputs. |
| `src/components/RiskScoreGauge.tsx` | Visual SVG arc gauge rendering the 0–100 risk score, risk classification badge, and confidence percentage. |
| `src/components/SignalCardsGrid.tsx` | Grid of cards displaying verified signals for Market Price, Protocol TVL, Gas Execution, Wallet Fraud, Token Holders, and SSL Infrastructure. |
| `src/components/EvidenceAttributionTable.tsx` | Audit table mapping every risk factor to its Telegraph Intent, attested Miner ID/Name, canonical proof hash, and mathematical weight contribution. |
| `src/components/CategoryBreakdownView.tsx` | Detailed breakdown of each risk dimension with active weight bars, signal presence indicators, and penalty notes. |
| `src/components/DerivedMetricsPanel.tsx` | Displays transparent intermediate mathematical values (Mcap/TVL, estimated transfer cost, price spread percentage, raw signal counts). |
| `src/components/SubnetEventsView.tsx` | Real-time explorer for cryptographic `SubnetResponse` on-chain events emitted on Base-Sepolia. |
| `src/components/MinersRegistryView.tsx` | Interactive registry table of all active miners registered on the Telegraph Node with supported intents and endpoints. |
| `src/components/SessionHistoryView.tsx` | Side panel storing past DeFi Risk assessments for review, re-evaluation, and JSON export. |
| `src/components/HowItWorksModal.tsx` | Educational guide explaining Telegraph Protocol intents, scoring equations, and cryptographic validation. |

---

## 3. Data Integrity & Verification

1. **Deterministic Processing**: All calculations in `deFiRiskEngine` are pure functions without external non-deterministic side-effects.
2. **Authentic Provenance**: Intelligence attribution traces directly back to the registered miner ID, rank, and declared endpoint path in the Telegraph Node registry.
3. **Graceful Handling of Missing Intelligence**: When miners are unavailable, explicit uncertainty penalties are applied while preserving the auditability of the report.
