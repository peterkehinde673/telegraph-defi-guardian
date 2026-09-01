# System Architecture: Telegraph DeFi Guardian

> Comprehensive technical blueprint of the Telegraph DeFi Guardian platform, detailing data flow, normalization logic, deterministic risk scoring, and miner attestation.

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
            (2. Concurrency)  │                 │ (3. Network Telemetry)
                              ▼                 ▼
  ┌─────────────────────────────────┐      ┌─────────────────────────────────┐
  │   SPECIALIZED TELEGRAPH MINERS  │      │     TELEGRAPH PROTOCOL NODE     │
  │ • Miner #99: Price & Multi-Feed │      │ • GET /status (Node Public Key) │
  │ • Miner #99: Protocol TVL Depth │      │ • GET / (SubnetResponse Stream) │
  │ • Miner #99: EVM Gas & Surge    │      │ • GET /miner-dispatcher/miners  │
  │ • Miner #99: Fraud & Wallet     │      └────────────────┬────────────────┘
  │ • Miner #99: Token Holder Count │                       │
  │ • Miner #99: SSL Infrastructure │                       │
  └────────────────┬────────────────┘                       │
                   │                                        │
                   │ (4. Raw Attested Payloads)             │
                   ▼                                        │
  ┌────────────────────────────────────────────────────────┐│
  │              TELEGRAPH NORMALIZATION LAYER             ││
  │              (/server/telegraph/normalizer.ts)         ││
  │ • Schema validation & field type checking              ││
  │ • Canonical proof hashing                              ││
  │ • Range clamping & multi-source spread calculation     ││
  │ • Miner ID & Name attribution                          ││
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
| `server.ts` | Main Express server entry point. Configures CORS, sets up `/api/telegraph/*` endpoints with 15s timeouts, mounts Vite in dev mode, and serves built assets in production. |
| `server/telegraph/client.ts` | Low-level HTTP client interfacing with `TELEGRAPH_NODE_URL` and active miner endpoints. Handles parameter encoding, timeout aborts, and network error classification. |
| `server/telegraph/service.ts` | High-level Telegraph orchestration service that coordinates multi-intent queries, orchestrates parallel miner calls, and maps outputs through the normalizer. |
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
| `src/components/CalculationsExplorer.tsx` | Interactive breakdown of category weight distributions, intermediate calculations (e.g. Mcap/TVL, Collateral Cushion), and missing data disclosures. |
| `src/components/SubnetEventsView.tsx` | Real-time explorer for signed `SubnetResponse` transactions emitted by the Telegraph Node on Base-Sepolia. |
| `src/components/MinersRegistryView.tsx` | Searchable directory of all registered Telegraph Miners, their supported intents, and endpoint URLs. |
| `src/components/AnalysisHistory.tsx` | Session history drawer enabling quick reload of previous audit runs. |
| `src/components/RawIntelligenceViewer.tsx` | JSON payload inspector allowing developers to view and copy raw attested data structures. |
| `src/components/HowItWorksView.tsx` | Educational documentation panel explaining Telegraph miner verification and risk score formulation. |

---

## 3. Data Transformation & Normalization Pipeline

Raw data from external miners often varies in schema formatting, precision, and nullability. The `TelegraphNormalizer` enforces strict determinism before data enters the risk engine:

1. **Sanitization**: All string values are trimmed, numbers are clamped to non-negative ranges, and timestamps are standardized to ISO 8601 UTC.
2. **Canonical Proof Generation**: Creates an unforgeable identifier string from the entity and raw metric (e.g., `coin_id:ethereum:2415.57` or `wallet_risk:0xd8dA6...:0.10`).
3. **Multi-Source Spread Checking**: When a miner returns multiple feeds (e.g. CoinPaprika + DefiLlama), computes:
   $$\text{Spread \%} = \frac{\text{High Price} - \text{Low Price}}{\text{Average Price}} \times 100$$
4. **Attribution Binding**: Attaches originating `minerId`, `minerName`, and miner endpoint to the output signal.

---

## 4. Verification & Testing Pipeline

The repository provides automated test scripts under `/scripts`:

```
scripts/
├── test-telegraph.ts      # Verifies raw connection to node and miners
├── test-normalization.ts  # Verifies sanitization of all 8 supported intents
└── test-risk-engine.ts    # Verifies scoring formulas, edge cases & real multi-intent bundles
```
