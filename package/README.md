# @telegraph/mcp-server

MCP server exposing [Telegraph Protocol](https://github.com/telegraphprotocol/Telegraph) AI inference APIs as tools with automatic x402 micropayments.

Connects any MCP-compatible agent (Claude Desktop, Cursor, ElizaOS, LangChain, OpenClaw, Goose, etc.) to Telegraph's network of AI miners — weather forecasting, deepfake detection, LLM inference, AI-text detection, signal monitoring — with zero crypto code in the agent. The MCP server handles private key custody, payment signing, and transaction settlement internally.

> Miners can be Bittensor subnets, hosted models, or any private API integrated via YAML. Some tool and field names still say `subnet` for legacy reasons — read it as "miner".

## Quick Start

### Option A — npx (no clone, recommended once published)

```bash
TELEGRAPH_NODE_URL=http://13.237.89.59:7044 \
TELEGRAPH_ENGINE_URL=http://13.237.89.59:8080 \
TELEGRAPH_DAEMON_URL=http://13.237.89.59:8081 \
TELEGRAPH_EVM_PRIVATE_KEY=0xyour_key_here \
npx -y telegraph-protocol-mcp
```

### Option B — from source

```bash
# 1. Clone and enter
git clone https://github.com/telegraphprotocol/telegraph-mcp
cd telegraph-mcp

# 2. Copy and edit .env
cp .env.example .env
# Edit: set TELEGRAPH_EVM_PRIVATE_KEY=0xyour_key_here

# 3. Install and build
npm install && npm run build

# 4. Run
npm start
```

> Published to npm as [`telegraph-protocol-mcp`](https://www.npmjs.com/package/telegraph-protocol-mcp) and listed on the [MCP Registry](https://registry.modelcontextprotocol.io) as `io.github.telegraphprotocol/telegraph`. Maintainers: see [PUBLISHING.md](./PUBLISHING.md).

## Architecture

```
Agent (Claude / Cursor / Eliza / etc.)
       │
       │ MCP protocol (JSON-RPC over stdio)
       │
┌──────▼─────────────────────────────────────────┐
│  Telegraph MCP Server (runs locally)            │
│                                                 │
│  ┌─────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Node    │  │ Engine   │  │ Daemon        │  │
│  │ :7044   │  │ :8080    │  │ :8081         │  │
│  ├─────────┤  ├──────────┤  ├───────────────┤  │
│  │ Status  │  │ Subnets  │  │ Health        │  │
│  │ Health  │  │ Ask      │  │ Categories    │  │
│  │ Subnets │  │ Direct   │  │ Questions     │  │
│  │ Dynamic │  │          │  │               │  │
│  └─────────┘  └──────────┘  └───────────────┘  │
│                                                 │
│  X402 payment handled transparently:            │
│    request → 402 → sign EIP-3009 → retry        │
└─────────────────────────────────────────────────┘
```

## Configuration

All via environment variables (`.env` file or inline):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAPH_NODE_URL` | Yes | `http://localhost:7044` | Telegraph node URL |
| `TELEGRAPH_ENGINE_URL` | Yes | `http://localhost:8080` | Engine server URL |
| `TELEGRAPH_DAEMON_URL` | Yes | `http://localhost:8081` | Daemon API URL |
| `TELEGRAPH_EVM_PRIVATE_KEY` | Yes* | — | EVM private key (`0x`-prefixed hex) |
| `TELEGRAPH_SOLANA_PRIVATE_KEY` | No* | — | Solana private key (base58) |
| `EVM_NETWORK` | No | `eip155:*` | EVM CAIP-2 network |
| `SVM_NETWORK` | No | `solana:*` | Solana CAIP-2 network |
| `REFRESH_INTERVAL_MS` | No | `300000` | Miner-tool refresh interval (ms). 0 to disable. |

*At least one private key required.

## Available Tools

### Node Tools (no payment)
| Tool | Description |
|------|-------------|
| `tg_node_status` | Node status, public key, chain info |
| `tg_node_subnets_health` | Miner integration health check |
| `tg_node_list_subnets` | Full miner catalog with metadata, schemas, endpoints |

### Engine Tools
| Tool | Payment | Description |
|------|---------|-------------|
| `tg_engine_list_subnets` | Free | List the miners the Engine can route to |
| `tg_engine_ask` | x402 | Auto-routed inference (LLM picks the best miner for your query) |
| `tg_engine_ask_subnet` | x402 | Direct inference through a specific miner by ID |

### Daemon Tools (no payment)
| Tool | Description |
|------|-------------|
| `tg_daemon_health` | Daemon health check |
| `tg_daemon_categories` | Signal categories (POLITICS, ECONOMICS, TECHNOLOGY, CLIMATE, HEALTH, CRYPTO, SPORTS, …) |
| `tg_daemon_questions` | Query collected signals with filters (category, source, time, interest) |

### Dynamic Miner Tools (auto-discovered, x402 payment)
Tools for each miner endpoint are auto-generated from the Telegraph node's live integration registry. The live set changes on-chain, so treat this as a snapshot, not the source of truth (call `tg_node_list_subnets` for the current catalog):

| Miner | Tools |
|--------|-------|
| **Zeus (18)** — Weather | `tg_zeus_predict` |
| **ItsAI (32)** — AI text detection | `tg_itsai_text_detector_detect` |
| **Sapling (33)** — AI content detection | `tg_sapling_ai_detector_detect` |
| **BitMind (34)** — Deepfake | `tg_bitmind_detect_image`, `tg_bitmind_detect_video`, `tg_bitmind_preprocess_video`, `tg_bitmind_get_video_upload_url` |
| **OpenAI (102)** — LLM / images | `tg_openai_chat`, `tg_openai_responses`, `tg_openai_embed`, `tg_openai_images_generate`, `tg_openai_moderate` |

**These update automatically.** New miners registered on-chain appear within 5 minutes. Deregistered miners are cleaned up. The agent always sees only currently valid tools.

> Some tool and field names contain `subnet` for legacy reasons — Telegraph began by integrating Bittensor subnets. Today a **miner** is any provider integrated via YAML, subnet or not.

## How x402 Payments Work

When an agent calls a paid tool (e.g., `tg_engine_ask`):

1. MCP server sends request to Telegraph
2. Telegraph returns HTTP 402 with payment requirements in response header
3. `@x402/fetch` intercepts the 402, signs an EIP-3009 `TransferWithAuthorization` using your private key, attaches the signature as a `PAYMENT` header, and retries
4. Telegraph verifies the payment on-chain via the PayAI facilitator and returns the result

**The agent and LLM never see the payment flow, private key, or blockchain transaction.** It's fully transparent — the agent just sees a tool that returns results.

## Integration Guides

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows).

Using npx (simplest — no clone or build):

```json
{
  "mcpServers": {
    "telegraph": {
      "command": "npx",
      "args": ["-y", "telegraph-protocol-mcp"],
      "env": {
        "TELEGRAPH_NODE_URL": "http://13.237.89.59:7044",
        "TELEGRAPH_ENGINE_URL": "http://13.237.89.59:8080",
        "TELEGRAPH_DAEMON_URL": "http://13.237.89.59:8081",
        "TELEGRAPH_EVM_PRIVATE_KEY": "0xyour_key_here"
      }
    }
  }
}
```

Or pointing at a local build:

```json
{
  "mcpServers": {
    "telegraph": {
      "command": "node",
      "args": ["/path/to/telegraph-mcp/dist/index.js"],
      "env": {
        "TELEGRAPH_NODE_URL": "http://13.237.89.59:7044",
        "TELEGRAPH_ENGINE_URL": "http://13.237.89.59:8080",
        "TELEGRAPH_DAEMON_URL": "http://13.237.89.59:8081",
        "TELEGRAPH_EVM_PRIVATE_KEY": "0xyour_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. The Telegraph tools will appear in the tool list. Try asking *"What's the weather in Lahore?"* or *"Use the Telegraph engine to explain what Bitcoin is."*

### Cursor

Add to Cursor Settings → MCP → Add new MCP server:

```json
{
  "mcpServers": {
    "telegraph": {
      "command": "node",
      "args": ["/path/to/telegraph-mcp/dist/index.js"],
      "env": {
        "TELEGRAPH_NODE_URL": "http://13.237.89.59:7044",
        "TELEGRAPH_ENGINE_URL": "http://13.237.89.59:8080",
        "TELEGRAPH_DAEMON_URL": "http://13.237.89.59:8081",
        "TELEGRAPH_EVM_PRIVATE_KEY": "0xyour_key_here"
      }
    }
  }
}
```

### ElizaOS

In your Eliza character file or MCP plugin config:

```json
{
  "mcp": {
    "telegraph": {
      "command": "node",
      "args": ["/path/to/telegraph-mcp/dist/index.js"],
      "env": {
        "TELEGRAPH_NODE_URL": "http://13.237.89.59:7044",
        "TELEGRAPH_ENGINE_URL": "http://13.237.89.59:8080",
        "TELEGRAPH_DAEMON_URL": "http://13.237.89.59:8081",
        "TELEGRAPH_EVM_PRIVATE_KEY": "0xyour_key_here"
      }
    }
  }
}
```

ElizaOS v0.25+ supports MCP via the `@elizaos/plugin-mcp` package. Enable it in your character's plugin list:

```json
{
  "plugins": ["@elizaos/plugin-mcp"]
}
```

### LangChain / LangGraph

LangChain supports MCP through `langchain-mcp-adapters`:

```bash
pip install langchain-mcp-adapters
```

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

client = MultiServerMCPClient({
    "telegraph": {
        "command": "node",
        "args": ["/path/to/telegraph-mcp/dist/index.js"],
        "env": {
            "TELEGRAPH_NODE_URL": "http://13.237.89.59:7044",
            "TELEGRAPH_ENGINE_URL": "http://13.237.89.59:8080",
            "TELEGRAPH_DAEMON_URL": "http://13.237.89.59:8081",
            "TELEGRAPH_EVM_PRIVATE_KEY": "0xyour_key_here",
        },
        "transport": "stdio",
    }
})

tools = client.get_tools()
# Use tools with your LangChain agent
```

TypeScript/Node.js:

```bash
npm install @langchain/mcp-adapters
```

```typescript
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

const client = new MultiServerMCPClient({
  telegraph: {
    command: "node",
    args: ["/path/to/telegraph-mcp/dist/index.js"],
    env: {
      TELEGRAPH_NODE_URL: "http://13.237.89.59:7044",
      TELEGRAPH_ENGINE_URL: "http://13.237.89.59:8080",
      TELEGRAPH_DAEMON_URL: "http://13.237.89.59:8081",
      TELEGRAPH_EVM_PRIVATE_KEY: "0xyour_key_here",
    },
    transport: "stdio",
  },
});

const tools = await client.getTools();
```

### OpenClaw

OpenClaw natively supports MCP via configuration. Add to `openclaw.config.json`:

```json
{
  "mcpServers": {
    "telegraph": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/telegraph-mcp/dist/index.js"],
      "env": {
        "TELEGRAPH_NODE_URL": "http://13.237.89.59:7044",
        "TELEGRAPH_ENGINE_URL": "http://13.237.89.59:8080",
        "TELEGRAPH_DAEMON_URL": "http://13.237.89.59:8081",
        "TELEGRAPH_EVM_PRIVATE_KEY": "0xyour_key_here"
      }
    }
  }
}
```

### Goose

Goose supports MCP servers through its extensions system. Configuration in `~/.config/goose/config.yaml`:

```yaml
extensions:
  telegraph:
    type: mcp
    command: node
    args:
      - /path/to/telegraph-mcp/dist/index.js
    env:
      TELEGRAPH_NODE_URL: http://13.237.89.59:7044
      TELEGRAPH_ENGINE_URL: http://13.237.89.59:8080
      TELEGRAPH_DAEMON_URL: http://13.237.89.59:8081
      TELEGRAPH_EVM_PRIVATE_KEY: 0xyour_key_here
```

### VS Code / Continue

In Continue's `config.json`:

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "transport": {
          "type": "stdio",
          "command": "node",
          "args": ["/path/to/telegraph-mcp/dist/index.js"],
          "env": {
            "TELEGRAPH_NODE_URL": "http://13.237.89.59:7044",
            "TELEGRAPH_ENGINE_URL": "http://13.237.89.59:8080",
            "TELEGRAPH_DAEMON_URL": "http://13.237.89.59:8081",
            "TELEGRAPH_EVM_PRIVATE_KEY": "0xyour_key_here"
          }
        }
      }
    ]
  }
}
```

### Generic / Any MCP Client

The server uses **MCP stdio transport** — the standard for local MCP servers. Any client that supports the MCP protocol over stdio can use it:

```json
{
  "mcpServers": {
    "telegraph": {
      "command": "node",
      "args": ["/path/to/telegraph-mcp/dist/index.js"],
      "env": {
        "TELEGRAPH_NODE_URL": "http://13.237.89.59:7044",
        "TELEGRAPH_ENGINE_URL": "http://13.237.89.59:8080",
        "TELEGRAPH_DAEMON_URL": "http://13.237.89.59:8081",
        "TELEGRAPH_EVM_PRIVATE_KEY": "0xyour_key_here"
      }
    }
  }
}
```

## Dynamic Tool Discovery

Subnet tools are **not hardcoded**. On startup and every 5 minutes:

1. Fetches live integrations from `GET /miner-dispatcher/integrations` on the Telegraph node
2. Diffs against currently registered tools
3. Adds new subnets → auto-registers tools
4. Removes stale subnets → deletes tools
5. Sends `notifications/tools/list_changed` to connected clients

This means:
- **New subnets** appear automatically within 5 minutes of on-chain registration — no MCP restart needed
- **Removed subnets** are cleaned up — agents won't call non-existent tools
- **Agents always have an accurate view** of what's available on the network

## Security

- **Use a burner wallet.** Never use your main wallet. Fund with only the USDC needed for inference.
- **The private key stays in the MCP process.** Never exposed to the agent or LLM.
- **The MCP server runs locally** over stdio — no network exposure.
- Payments are per-call: typically $0.01 per inference request.

## Development

```bash
npm install          # Install deps
npm run build        # Compile TypeScript
npm run dev          # Dev mode with tsx (hot reload)
npx @modelcontextprotocol/inspector dist/index.js  # Inspect tools
```
