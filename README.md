# Agent Exchange (AEX)

> Discover, deploy, and operate AI agents that move money on-chain.

**Agent Exchange** is human.tech's open catalog of AI agents. Every agent here is a complete, working program — fork it, scaffold a new one in 60 seconds with `npx @human.tech/create-agent-wallet`, or run one curated by us with live mainnet performance data.

This repository is the public, open-source home for everything builders touch: the CLI scaffolder, agent templates, recipes, audits, and the manifest schema that ties them together. The hosted Browse UI and the operations backend live in a separate private repo (`holonym-foundation/aex-ui`).

## What's here

| Path | Purpose |
|------|---------|
| `packages/create-agent-wallet/` | The `npx @human.tech/create-agent-wallet` CLI scaffolder + the registry of activities (templates) that it scaffolds from |
| `packages/create-agent-wallet/registry/activities/<slug>/` | One folder per starter agent: manifest, recipe, per-runtime templates, audits |
| `agents/` | Internally-running dogfood agents (the instances we operate ourselves) |
| `dashboards/` | Per-agent monitoring dashboards (open-source, can be self-hosted) |
| `dashboards/_shared/` | Reusable dashboard components |
| `.claude/skills/` | Maintainer skills: `caw-add-activity`, `caw-audit`, `caw-add-dashboard` |
| `.github/workflows/` | CI including weekly template-health smoke tests |

> Migration in progress: the `packages/create-agent-wallet/` directory is being moved here from [silk PR #859](https://github.com/holonym-foundation/silk/pull/859). Until that completes, the canonical CLI source lives in silk; this README will be updated when the migration lands.

## Quick start

Once the CLI lands here, scaffolding a new agent looks like:

```bash
npx @human.tech/create-agent-wallet
# pick an activity (Cetus yield, Morpho yield, Polymarket prediction, Snapshot governance, ...)
# pick a runtime (Claude, Standalone, OpenClaw, Nous)
# pick a chain
# done — your project runs
```

## Browse running agents

The hosted Browse UI (with live mainnet performance data per agent) lives at `agentexchange.xyz` / `waap.human.tech/exchange` (URL TBD; one redirects to the other).

## Catalog (planned)

Initial starter set:

| Slug | Chain | Protocol | What it does |
|------|-------|----------|--------------|
| `sui-cetus-yield_optimizer` | Sui | Cetus | Concentrated-liquidity yield agent — opens a position in the SUI/USDC pool, repositions when price drifts |
| `evm-morpho-yield_optimizer` | EVM (Base) | Morpho | Lending/borrow position manager — supplies stablecoins and rebalances across vaults |
| `evm-polymarket-prediction` | Polygon | Polymarket | Prediction-market trader using signals you define |
| `evm-snapshot-governance_voter` | EVM | Snapshot | DAO vote caster following your delegation rules |
| `evm-uniswap-rebalancer` | EVM | Uniswap v3 | LP range rebalancer |
| `blank-project` | Any | None | Empty scaffold for your own logic |

More framework variants and use cases are added on a rolling cadence — see [`packages/create-agent-wallet/registry/activities/`](packages/create-agent-wallet/registry/activities/) for the live list.

## Built on WaaP

Every agent in AEX uses [WaaP (Wallet-as-a-Protocol)](https://waap.xyz) for signing:

- **Split-key signing.** The agent never holds a whole private key. Your share is required for every transaction — the agent cannot sign alone.
- **Scoped Privileges.** Spend caps, address allowlists, and time windows enforced on-chain. The agent operates inside the bounds you set.
- **Telegram approvals.** High-risk actions ping you for one-tap approval. Human-in-the-loop is the default.
- **Identity-gated and compliance-gated.** [Human Passport](https://passport.human.tech) adds Sybil-resistant identity (Proof of Humanity, 1:N face dedup) plus delegated KYC, AML, biometric, and other compliance checks.

WaaP itself has been audited by Cure53, Hexens, Least Authority, and Halborn. Per-agent audits (when conducted) live in each agent's `audits/` folder.

## Contributing

We welcome contributions — new starter agents, framework variants, recipes, audits, bug fixes, doc improvements.

- Read [CONTRIBUTING.md](./CONTRIBUTING.md) for the workflow, naming convention, and DCO sign-off requirement
- Open an issue before starting non-trivial work
- Use the `caw-add-activity` skill (in `.claude/skills/`) to scaffold a new starter

## License

[Apache-2.0](./LICENSE) for everything in this repository. Forks are welcome under the license.

## Trademark

"AEX," "Agent Exchange," "human.tech," "WaaP," and "Human Passport" are trademarks of Holonym Foundation. The code in this repository is licensed under Apache-2.0; the trademarks are not. Forks may use the code but should not use the names without permission.

## Security

See [SECURITY.md](./SECURITY.md) for vulnerability reporting and incident response. Email security@holonym.id for disclosures.

## Links

- **WaaP** — https://waap.xyz
- **Human Passport** — https://passport.human.tech
- **human.tech** — https://human.tech
- **Roadmap (internal)** — [holonym-foundation/internal-docs#807](https://github.com/holonym-foundation/internal-docs/issues/807)
