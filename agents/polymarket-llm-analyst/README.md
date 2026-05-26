# Polymarket LLM Analyst

AI-driven prediction market trading agent that uses a Large Language Model (LLM) to analyze Polymarket questions and place bets based on confidence scores. Built on the WaaP (Wallet-as-a-Protocol) CLI for non-custodial key management.

## Supported runtimes

- Claude (SKILL.md + CLAUDE.md + MCP config)
- Standalone (Node.js + Dockerfile)
- OpenClaw (AgentSkills SKILL.md)
- Nous / Hermes Agent (AgentSkills SKILL.md)

## How it works

1. Polls the Polymarket Gamma API for active markets
2. Sends each market question (plus context like current prices, volume, description) to an LLM
3. The LLM returns a structured analysis: side (YES/NO), confidence (0-1), and reasoning
4. If confidence exceeds the threshold (default 0.7), the agent builds an EIP-712 order, signs it via WaaP CLI, and submits it to the Polymarket CLOB
5. All decisions are logged as structured JSON for dashboard ingest

## Supported LLM providers

- **anthropic** -- Claude (claude-sonnet-4-20250514)
- **openai** -- GPT (gpt-4o)

No SDK dependencies required. The agent calls each provider's HTTP API directly using fetch/undici.

## Prerequisites

- Node.js 20+
- `@human.tech/waap-cli` installed and configured
- A WaaP session with USDC on Polygon
- Polymarket account + CLOB API credentials
- An API key for your chosen LLM provider (Anthropic or OpenAI)

## Run locally

```bash
cp .env.example .env
# Fill in LLM_PROVIDER, LLM_API_KEY, AGENT_MAX_ORDER_USD, and Polymarket creds
npm install
npm run dev
```

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| LLM_PROVIDER | Yes | -- | `anthropic` or `openai` |
| LLM_API_KEY | Yes | -- | API key for the LLM provider |
| AGENT_MAX_ORDER_USD | Yes | -- | Hard cap on USD per order |
| CONFIDENCE_THRESHOLD | No | 0.7 | Minimum confidence to place a bet |
| LLM_DELAY_MS | No | 1000 | Rate limit delay between LLM calls (ms) |
| AGENT_POLL_INTERVAL_MS | No | 60000 | Interval between market scan cycles (ms) |
| POLYMARKET_API_URL | No | https://clob.polymarket.com | CLOB endpoint |
| POLY_API_KEY | Yes | -- | Polymarket L2 auth API key |
| POLY_API_SECRET | Yes | -- | Polymarket L2 auth secret |
| POLY_PASSPHRASE | Yes | -- | Polymarket L2 auth passphrase |

## Logging

The agent writes structured JSON lines to stdout and to `./logs/<agent-id>.jsonl`. Event types:

- `agent_start` -- startup configuration and wallet address
- `market_scan` -- market discovery results
- `llm_analysis` -- LLM response for each market (question, side, confidence, reasoning)
- `order_placed` -- order built, signed, and submitted
- `order_failed` -- order submission error
- `balance_snapshot` -- wallet balance checkpoint

## Architecture

This agent reuses the same WaaP CLI integration patterns as the Polymarket Signal Trader:

- `waap-cli whoami` to resolve the agent's wallet address
- `waap-cli sign-typed-data` for EIP-712 order signing via 2-party computation (no raw private key in memory)
- HMAC-authenticated CLOB submission with Polymarket L2 credentials

The LLM layer sits between market discovery and order construction. It acts as the signal source, replacing manual or rule-based strategies with natural language reasoning.
