---
name: telegraph
description: Use Telegraph Protocol for verified AI inference. Activate when the user asks for: weather forecasts or climate data; deepfake or AI-content detection; LLM completions, image generation, or embeddings via a decentralized network; AI text detection; autonomous signal monitoring across categories like POLITICS, TECHNOLOGY, CLIMATE, HEALTH, ECONOMICS, or GEOPOLITICS; or any task where the user explicitly wants to route inference through the Telegraph network or pay via x402 USDC micropayments. Requires the Telegraph MCP server running with a USDC-funded EVM or Solana wallet.
license: MIT
metadata:
  version: 1.0.0
  homepage: https://github.com/telegraphprotocol/telegraph-mcp
  documentation: https://docs.telegraphprotocol.com
  keywords: [ai-inference, x402, bittensor, mcp, usdc, deepfake-detection, weather, llm, web3, agent-payments]
---

# Telegraph Protocol

Telegraph is a permissionless marketplace for verifiable AI inference. Agents pay USDC per request. Miners — which can be Bittensor subnets, OpenAI, open-source models, or any AI API — compete to supply answers. A decentralized validator mesh grades responses using zkTLS-verified ground truth and WASM scoring scripts, reaches BFT consensus, and delivers a cryptographically finalized result.

The native token is **MACHINA**. Every USDC paid for inference flows through an open-market TWAP to buy MACHINA for the miner — demand for intelligence directly drives demand for the token.

---

## MCP Tool Reference

### Free tools (no payment)

| Tool | Purpose |
|------|---------|
| `tg_node_list_subnets` | Full miner catalog — IDs, slugs, endpoints, input/output schemas |
| `tg_node_subnets_health` | Health status of all miner integrations |
| `tg_node_status` | Node identity, public key, chain info |
| `tg_engine_list_subnets` | Engine's view of available miners with capabilities and cost |
| `tg_daemon_categories` | Signal categories in the Daemon database (POLITICS, CLIMATE, TECHNOLOGY, …) |
| `tg_daemon_questions` | Query the Daemon's stored signals — filterable by category, source, time, interest |
| `tg_daemon_health` | Daemon health check |

> The `subnet` in some tool names is legacy — every provider is a **miner** today, whether a Bittensor subnet, a hosted model, or a private API.

### Paid tools (x402 USDC per call)

| Tool | Purpose |
|------|---------|
| `tg_engine_ask` | Auto-routed inference — Engine's LLM router selects the best miner for your query |
| `tg_engine_ask_subnet` | Direct inference to a specific miner by ID |
| Dynamic tools (auto-discovered) | Per-miner tools generated from the live integration registry (see below) |

---

## Access Modes

### 1. Auto-routed inference (recommended)
The Engine classifies your natural language query into an Intent and routes to the highest-ranked miner for that task:

```
tg_engine_ask(query="7-day weather forecast for Dubai")
tg_engine_ask(query="Is this image AI-generated?")
tg_engine_ask(query="Summarize the latest clinical trial results for GLP-1 drugs")
```

The response includes `routing.reasoning` — which subnet was chosen and why.

### 2. Direct miner inference
Route to a specific miner when you know exactly what you want:

```
tg_engine_ask_subnet(subnet_id="18", method="GET", endpoint="/predict", payload={lat: 25.2, lon: 55.3, variable: "hourly"})
tg_engine_ask_subnet(subnet_id="34", method="POST", endpoint="/", payload={image_url: "https://..."})
tg_engine_ask_subnet(subnet_id="102", method="POST", endpoint="/chat", payload={model: "gpt-4o-mini", messages: [...]})
```

### 3. Daemon signal feed (free reads)
The Daemon runs autonomously every 3 hours — collecting data from registered sources (weather APIs, market feeds, news and social feeds), routing questions through miners, and storing verified results. Reading these is free:

```
tg_daemon_categories()
# → live list of categories with current counts

tg_daemon_questions(category="CLIMATE", limit=10)
tg_daemon_questions(category="TECHNOLOGY", sort="interest", min_interest=5)
tg_daemon_questions(source="polymarket", since_hours=24)
```

### 4. Dynamic miner tools (auto-discovered)
On startup, the MCP server fetches the live integration registry and generates per-endpoint tools for every active miner. These update every 5 minutes without restart. The live set changes on-chain — treat the table below as a snapshot, not the source of truth:

| Tool (auto-generated) | Miner | Capability |
|-----------------------|-------|-----------|
| `tg_zeus_predict` | Zeus (18) | Weather forecast |
| `tg_itsai_text_detector_detect` | ItsAI (32) | AI text detection |
| `tg_sapling_ai_detector_detect` | Sapling (33) | AI content detection |
| `tg_bitmind_detect_image` | BitMind (34) | Deepfake image detection |
| `tg_bitmind_detect_video` | BitMind (34) | Deepfake video detection |
| `tg_openai_chat` | OpenAI (102) | LLM chat |
| `tg_openai_images_generate` | OpenAI (102) | Image generation |
| `tg_openai_embed` | OpenAI (102) | Text embeddings |
| `tg_openai_moderate` | OpenAI (102) | Content moderation |

Use `tg_node_list_subnets` to see the current live catalog with full schemas.

---

## Active Intents

The Engine's LLM router maps queries to canonical Intents:

| Category | Intents |
|----------|---------|
| Language | `LANGUAGE_GENERATION`, `CHAT_COMPLETION`, `TEXT_GENERATION`, `HIGH_PERFORMANCE_INFERENCE`, `EMBEDDINGS`, `CONTENT_MODERATION` |
| Weather | `WEATHER_CHECK`, `WEATHER_FORECAST`, `STORM_ALERT`, `WEATHER_RISK_ASSESSMENT` |
| Vision | `MULTIMODAL_INFERENCE`, `IMAGE_GENERATION`, `TEXT_TO_IMAGE` |
| Search | `WEB_SEARCH`, `TWITTER_SEARCH`, `NEWS_SEARCH`, `RESEARCH_SYNTHESIS`, `FACT_CHECK` |
| Authenticity | `DEEPFAKE_DETECTION`, `MEDIA_AUTHENTICITY_CHECK`, `AI_TEXT_DETECTION`, `TEXT_AUTHENTICITY_CHECK`, `IMAGE_VERIFICATION`, `VIDEO_VERIFICATION` |
| Tasks | `TASK_COMPLETION`, `AGENT_TASK` |

---

## Payments

All paid calls use **x402** — an HTTP-native micropayment protocol. The MCP server handles the full flow transparently: receives the 402 challenge, signs the USDC transfer using your configured private key, and retries. The agent never sees the payment step.

- **Network**: Base Sepolia (testnet) — USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Typical cost**: $0.01 – $0.05 per inference call
- **Pricing**: miner's floor price × demand multiplier (rises with 24h request volume for the Intent)
- **Use a burner wallet** — fund with only the USDC you need; never use a main wallet

---

## Setup

1. Clone and build:
   ```bash
   git clone https://github.com/telegraphprotocol/telegraph-mcp
   cd telegraph-mcp && npm install && npm run build
   ```

2. Add to your MCP client config (Claude Desktop, Cursor, etc.):
   ```json
   {
     "mcpServers": {
       "telegraph": {
         "command": "node",
         "args": ["/path/to/Telegraph-MCP/dist/index.js"],
         "env": {
           "TELEGRAPH_NODE_URL": "http://13.237.89.59:7044",
           "TELEGRAPH_ENGINE_URL": "http://13.237.89.59:8080",
           "TELEGRAPH_DAEMON_URL": "http://13.237.89.59:8081",
           "TELEGRAPH_EVM_PRIVATE_KEY": "0xyour_burner_wallet_key"
         }
       }
     }
   }
   ```

Full integration guides for Claude Desktop, Cursor, ElizaOS, LangChain, Goose, and others are in the [README](https://github.com/telegraphprotocol/telegraph-mcp#readme).
