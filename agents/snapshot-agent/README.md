# Snapshot Governance Agent

Never miss a DAO vote. This agent polls configured Snapshot spaces, signs vote messages via EIP-712, and submits them to the Snapshot Sequencer.

Runs on any EVM chain (votes are off-chain, chain is metadata).

## Supported runtimes

- Claude (SKILL.md + CLAUDE.md + MCP config)
- Standalone (Node.js + Dockerfile)
- OpenClaw (AgentSkills SKILL.md)
- Nous / Hermes Agent (AgentSkills SKILL.md)

## Env

| Key                   | Required | Description                                                   |
| --------------------- | -------- | ------------------------------------------------------------- |
| `SNAPSHOT_SPACES`     | yes      | Comma-separated space IDs, e.g. `aave.eth,uniswap.eth`        |
| `SNAPSHOT_HUB_URL`    | no       | Defaults to `https://hub.snapshot.org`                        |
| `AGENT_VOTE_STRATEGY` | no       | `delegate` (default), `conservative`, or `abstain-on-unknown` |

## Generate

```bash
npx @human.tech/create-agent-wallet --activity snapshot-agent --runtime standalone snapshot-agent
```

## Full tutorial

[docs.waap.xyz/recipes/waap-cli-snapshot-agent](https://docs.waap.xyz/recipes/waap-cli-snapshot-agent) (pending publication by Soe — [#384](https://github.com/holonym-foundation/internal-docs/issues/384))
