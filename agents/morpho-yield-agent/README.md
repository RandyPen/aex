# Morpho Yield Agent

Deposit into the best-APY Morpho vault for a given asset, rebalance when a better vault opens.

## Supported runtimes

- Claude (SKILL.md + CLAUDE.md + MCP config)
- Standalone (Node.js + Dockerfile)
- OpenClaw (AgentSkills SKILL.md)
- Nous / Hermes Agent (AgentSkills SKILL.md)

## Env

| Key                       | Required | Description                                           |
| ------------------------- | -------- | ----------------------------------------------------- |
| `AGENT_ASSET`             | yes      | ERC-20 address (e.g. USDC on Ethereum)                |
| `AGENT_MAX_DEPOSIT_USD`   | yes      | Hard cap on total USD deposited                       |
| `AGENT_MIN_APY_DELTA_BPS` | no       | Minimum APY improvement to rebalance (default 50 bps) |
| `MORPHO_API_URL`          | no       | Defaults to `https://blue-api.morpho.org`             |

## Generate

```bash
npx @human.tech/create-agent-wallet --activity morpho-yield-agent --runtime standalone morpho-agent
```

## Full tutorial

[docs.waap.xyz/recipes/waap-cli-morpho-yield-agent](https://docs.waap.xyz/recipes/waap-cli-morpho-yield-agent) (pending publication — [#386](https://github.com/holonym-foundation/internal-docs/issues/386))
