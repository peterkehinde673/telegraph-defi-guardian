# Telegraph DeFi Guardian

> **Telegraph Protocol Hackathon: TRACK 3 — APPLICATIONS**  
> **Verifiable, Multi-Intent DeFi Intelligence & Deterministic Risk Assessment Terminal**  
> Consuming live on-chain intelligence and decentralized miner attestations on Base-Sepolia.

[![Hackathon Track](https://img.shields.io/badge/Telegraph%20Hackathon-Track%203%20(Applications)-brightgreen.svg)](https://telegraphprotocol.com)
[![Telegraph Protocol](https://img.shields.io/badge/Telegraph%20Subnet-Base--Sepolia-blue.svg)](https://devnode.telegraphprotocol.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-purple.svg)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-cyan.svg)](https://react.dev/)

---

## 1. Executive Summary & Track 3 Focus

**Telegraph DeFi Guardian** is a **Track 3 (Applications)** production platform that directly consumes live intelligence from registered **Telegraph Protocol Miners** on Base-Sepolia. It solves the fragmentation and opacity of DeFi risk analysis by querying multiple miner intents concurrently, normalizing attested payloads into canonical data models, and computing an auditable, deterministic **0–100 DeFi Risk Score** with explicit cryptographic and miner attribution.

---

## 2. Problem Statement

Modern DeFi protocols and institutional liquidity providers face critical structural risks:
1. **Oracle Vulnerability & Discrepancies**: Single-source price oracles are susceptible to flash-loan exploits, delayed reporting, and cross-market price divergence.
2. **Opaque & Subjective Risk Scores**: Most crypto rating portals use proprietary, subjective "black box" heuristics that cannot be verified or mathematically audited.
3. **Fragmented Intelligence Silos**: Evaluating an asset requires querying multiple disparate sources (DEX liquidity, wallet cluster risk, gas surge anomalies, contract SSL/domain security, holder distribution).
4. **Lack of Cryptographic Provenance**: Users cannot verify which specific subnet worker or validator produced the intelligence backing a transaction.

---

## 3. Why Telegraph Protocol is Essential

The **Telegraph Protocol** provides a decentralized marketplace for verifiable AI inference and specialized intelligence where:
- Autonomous miners compete to fulfill specific intelligence **intents** (`CRYPTO_PRICE`, `TVL_LOOKUP`, `GAS_PRICE`, `FRAUD_DETECTION`, `TOKEN_HOLDER_COUNT`, `SSL_VERIFICATION`).
- Validators grade responses and produce cryptographically signed on-chain `SubnetResponse` events.
- **Telegraph DeFi Guardian** harnesses this decentralized miner subnet to dispatch concurrent queries, normalize verified payloads into canonical schemas, and construct an auditable, multi-vector risk model.

---

## 4. Main Capabilities

- **⚡ Multi-Intent Dispatcher**: Concurrently queries multiple registered Telegraph Miners to retrieve real-time market, protocol, network, wallet, and infrastructure signals.
- **🎯 Deterministic Risk Engine**: Mathematical scoring formula mapping 5 risk dimensions into an auditable 0–100 score (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`).
- **🛡️ Direct Miner Attribution Matrix**: Every risk factor is mapped to its originating Miner ID, Miner Name, Canonical Proof Hash, and Category Weight contribution.
- **📊 Cross-Oracle Spread Detection**: Automatically computes pricing spread anomalies across independent reporting sources (e.g., CoinPaprika, DefiLlama).
- **🔍 Liquidity & Collateral Tiers**: Evaluates total value locked (TVL) against institutional liquidity thresholds ($1B+ Tier 1, $100M+ Tier 2, down to Sub-$1M liquidation danger).
- **🚨 Counterparty & Wallet Sentinel**: Detects direct mixer deposits, funder fan-out clusters, and sanctions/exploit associations via Telegraph Fraud Miners.
- **🌐 Network & Execution Cost Sentinel**: Monitors real-time EVM gas dynamics, Gwei surges, and transfer fee impacts.
- **📡 Subnet Event Stream Explorer**: Inspects live on-chain signed `SubnetResponse` transactions directly from the Telegraph Node.
- **🏛️ Active Miner Registry**: Dynamically browses all active Telegraph subnet miners, endpoint statuses, and supported intents.
- **💾 Session Audit History**: Locally stores historical assessments for side-by-side protocol comparison and developer payload inspection.

---

## 5. System Architecture

```
                                  USER INTERFACE
             (React 19 + Tailwind CSS + Lucide Icons + Financial Terminal)
                                        │
                                        │ (POST /api/telegraph/analyze)
                                        ▼
                                 EXPRESS API LAYER
                      (Node.js / tsx Proxy & Timeout Guard)
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
    TELEGRAPH PROTOCOL NODE                      REGISTERED TELEGRAPH MINERS
  • GET /status (Public Key & Node)             • Miner #9002 (TxLens): CRYPTO_PRICE
  • GET / (Live SubnetResponse Events)          • Miner #9002 (TxLens): TVL_LOOKUP
  • GET /miner-dispatcher/integrations          • Miner #9002 (TxLens): GAS_PRICE
                                                • Miner #9002 (TxLens): FRAUD_DETECTION (Wallet)
                                                • Miner #9002 (TxLens): TOKEN_HOLDER_COUNT
                                                • Miner #9002 (TxLens): SSL_VERIFICATION
                                                • Fallback Miner #20260829 (AgentFeed): Prices
                                                • Fallback Miner #7301 (GasWire): Gas Fees
                 │                                             │
                 └──────────────────────┬──────────────────────┘
                                        ▼
                         TELEGRAPH NORMALIZATION LAYER
           • Canonical Proof Hashing
           • Range Clamping & Field Sanitization
           • Miner Attribution & Multi-Source Verification
                                        │
                                        ▼
                        DETERMINISTIC RISK ENGINE (v2.1)
           • Category Weight Allocations (Price 25%, TVL 30%, Gas 15%, Security 20%, Governance 10%)
           • Dynamic Missing Data Penalty & Confidence Derivation
           • Intermediate Metric Calculations (Mcap/TVL, Collateral Cushion, Spread)
                                        │
                                        ▼
                          FINAL DEFI RISK REPORT & AUDIT
```

---

## 6. Supported Telegraph Intents & Official Miner Map

| Intent | Registered Miner | Miner ID | Official Miner Endpoint Path | Extracted Intelligence |
| :--- | :--- | :--- | :--- | :--- |
| `CRYPTO_PRICE` | TxLens | `#9002` | `/crypto-price?coin_id={symbol}` | Price USD, 24h Change %, Market Cap, Multi-Source Spread |
| `TVL_LOOKUP` | TxLens | `#9002` | `/tvl?protocol={name}` | Total Value Locked (USD), Chain Allocations, Collateral Depth |
| `GAS_PRICE` | TxLens | `#9002` | `/gas-price?chain={chain}` | Gas Price (Gwei), Wei, Transfer Cost USD, Fee Surge Level |
| `FRAUD_DETECTION` | TxLens | `#9002` | `/assess-wallet?wallet={address}` | Risk Score (0–1), Reason Codes, Funder Fan-Out, Mixer Flags |
| `FRAUD_QUERY` | TxLens | `#9002` | `/fraud-query` (POST) | Source-Backed Forensic Fraud Assessment |
| `TOKEN_HOLDER_COUNT`| TxLens | `#9002` | `/token-holders?token={address}` | Active On-Chain Token Holders, Concentration Tier |
| `SSL_VERIFICATION` | TxLens | `#9002` | `/ssl-check?domain={domain}` | SSL Validity, Issuer, Days to Expiry, Certificate Grade |
| `SUBNET_EVENTS` | Base-Sepolia Telegraph Node | N/A | `/` | Signed `SubnetResponse` Events, Validator Signatures |
| `MINER_DISPATCHER` | Base-Sepolia Telegraph Node | N/A | `/miner-dispatcher/integrations` | Active Miner Directory & Supported Capabilities |

---

## 7. Deterministic Risk Engine Methodology

The DeFi Guardian Risk Engine computes an objective risk score $R \in [0, 100]$ using declared mathematical equations:

$$R = \min\left(100, \sum_{c \in C} (w_c \cdot s_c) + P_{\text{missing}}\right)$$

### Category Weights ($w_c$):
- **TVL & Liquidity Cushion ($w = 0.30$)**: Institutional ($>\$1\text{B} \rightarrow 0\text{ pts}$), Deep ($>\$100\text{M} \rightarrow 10\text{ pts}$), Moderate ($>\$10\text{M} \rightarrow 25\text{ pts}$), Shallow ($>\$1\text{M} \rightarrow 50\text{ pts}$), Danger ($<\$1\text{M} \rightarrow 85\text{ pts}$).
- **Price Stability & Volatility ($w = 0.25$)**: 24h price swing $\le 3\% \rightarrow 5\text{ pts}$, $\le 8\% \rightarrow 25\text{ pts}$, $\le 20\% \rightarrow 55\text{ pts}$, $>20\% \rightarrow 85\text{ pts}$. Added spread divergence penalty if source spread $>1.5\%$.
- **Counterparty & Contract Security ($w = 0.20$)**: Evaluates mixer links, funder clusters, and reason codes (`DIRECT_MIXER_FUNDER` adds $+70\text{ pts}$).
- **Network State & Execution Cost ($w = 0.15$)**: EVM Gas $\le 20\text{ Gwei} \rightarrow 5\text{ pts}$, $\le 50\text{ Gwei} \rightarrow 25\text{ pts}$, $\le 100\text{ Gwei} \rightarrow 60\text{ pts}$, $>100\text{ Gwei} \rightarrow 90\text{ pts}$.
- **Asset Distribution & Governance ($w = 0.10$)**: Holder count $\ge 50\text{k} \rightarrow 5\text{ pts}$, $\ge 5\text{k} \rightarrow 25\text{ pts}$, $\ge 1\text{k} \rightarrow 55\text{ pts}$, $<250 \rightarrow 90\text{ pts}$.

### Missing Data & Confidence Penalty:
When an intelligence intent is unavailable or unmeasured for a target, the engine applies an explicit **Uncertainty Penalty** ($+12\text{ pts}$ per missing core category) and lowers the **Confidence Score** by $18\%$.

### Classifications:
- **LOW**: $0 \le R < 28$
- **MODERATE**: $28 \le R < 55$
- **HIGH**: $55 \le R < 78$
- **CRITICAL**: $78 \le R \le 100$

---

## 8. Technology Stack

- **Frontend**: React 19, TypeScript 5.8, Tailwind CSS v4, Motion, Lucide Icons
- **Backend API**: Express 4, Node.js (via `tsx` in development, bundled with `esbuild` for production)
- **Data Attestation**: Telegraph Protocol Base-Sepolia Subnet & Miners
- **Build System**: Vite 6.2 + TypeScript + esbuild

---

## 9. Local Development & Setup

### Prerequisites
- Node.js $\ge 18.0.0$
- npm or bun

### Installation

```bash
# Clone repository
git clone https://github.com/peterkehinde673/telegraph-defi-guardian.git
cd telegraph-defi-guardian

# Install dependencies
npm install
```

### Environment Configuration

Create a `.env` file from the provided example:

```bash
cp .env.example .env
```

Configuration variables in `.env`:
```env
# Telegraph Protocol Node Configuration
TELEGRAPH_NODE_URL="https://devnode.telegraphprotocol.com"
TELEGRAPH_ENGINE_URL="http://13.237.89.59:8080"
TELEGRAPH_DAEMON_URL="http://13.237.89.59:8081"
```

### Running Development Server

```bash
npm run dev
```

The application will start at `http://localhost:3000`.

---

## 10. Verification & Test Suite

The repository includes dedicated verification test suites that query live Telegraph Miners and validate normalizer contracts:

```bash
# 1. Type Check & Linting
npm run lint

# 2. Test Telegraph Protocol Miner End-to-End Connectivity
npx tsx scripts/test-telegraph.ts

# 3. Test Normalization Layer (All 8 Intents)
npx tsx scripts/test-normalization.ts

# 4. Test Deterministic Risk Engine (Mathematical Proofs & Edge Cases)
npx tsx scripts/test-risk-engine.ts

# 5. Production Build
npm run build
```

---

## 11. Security & Compliance Notes

1. **Zero Client Secret Leakage**: All Telegraph Node requests, timeouts, and miner dispatches occur exclusively server-side in `/server/*`.
2. **SSRF & Injection Prevention**: User inputs (symbols, contract addresses, domains) are strictly validated and clamped with regular expressions before miner dispatch.
3. **No Synthetic / Fabricated Fallbacks**: The engine refuses to substitute fake or synthetic figures if a miner is unreachable; it produces explicit `missingDataWarnings` and degrades confidence transparently.
4. **Isolated Port Configuration**: Dev server and Express proxy bind cleanly to port `3000` on `0.0.0.0`.

---

## 12. Project Limitations & Roadmap

- **Multi-Chain Gas**: Currently supports Ethereum, Arbitrum, Optimism, Base, and Polygon EVM chains for gas pricing. Solana and non-EVM execution monitoring is planned.
- **Smart Contract Bytecode Analysis**: Future iterations will integrate specialized Telegraph decompilation miners to detect reentrancy and proxy implementation changes directly.

---

## 13. License

Distributed under the **MIT License**. See `LICENSE` for details.
