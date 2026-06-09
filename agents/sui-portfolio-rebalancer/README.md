# Portfolio Rebalancer (Sui)

Grid-trading style portfolio rebalancer running on **Sui mainnet** via **Cetus DEX**. The agent monitors a target token's price and executes swaps to maintain a target USD allocation when price crosses configurable thresholds.

## Supported runtimes

- Claude (SKILL.md + CLAUDE.md + MCP config)
- Standalone (Node.js + Dockerfile)
- OpenClaw (AgentSkills SKILL.md)
- Nous / Hermes Agent (AgentSkills SKILL.md)

## Strategy

The agent watches the price of a target token (e.g. SUI) denominated in a quote token (e.g. USDC) by reading the Cetus concentrated-liquidity pool's `sqrtPrice` on-chain.

- **Price >= HIGH_PRICE_THRESHOLD**: The target token has appreciated. The agent sells enough of it to bring the position back to `TARGET_ALLOCATION_USD`.
- **Price <= LOW_PRICE_THRESHOLD**: The target token has dropped. The agent buys more to bring the position up to `TARGET_ALLOCATION_USD`.
- **Between thresholds**: No action. The agent logs the price and waits.

This is a classic grid / mean-reversion approach: sell into strength, buy into weakness.

## Cetus DEX + Aggregator Routing

Cetus is the primary concentrated-liquidity DEX on Sui. The agent reads pool state (sqrtPrice) via the Cetus CLMM SDK for price monitoring, then uses the **Cetus aggregator** to find the optimal swap route when a rebalance is triggered. The aggregator searches across all available Cetus pools and may split orders across multiple pools for better execution than a single direct pool swap. Transactions are signed and submitted through `waap-cli send-tx` (non-custodial 2-party computation -- no raw private key in the environment).

## Anatomy of `send-tx` (2PC signing)

This template never holds the agent's private key. Signing is split across **two parties** -- the agent process (this code) and the WaaP server (a remote co-signer) -- using a 2-party threshold-ECDSA (2PC-MPC) scheme. Neither side can sign alone.

### Data flow

```
+-------------------+        +-------------------+        +---------------+
|  agent process    |        |  waap-cli         |        |  WaaP server  |
|  (this template)  |        |  (local CLI)      |        |  (co-signer)  |
+-------------------+        +-------------------+        +---------------+
        |                            |                            |
        | 1. build PTB               |                            |
        |    via @mysten/sui         |                            |
        |    + cetus aggregator      |                            |
        |                            |                            |
        | 2. tx.build({ client })    |                            |
        |    -> raw tx bytes (b64)   |                            |
        |                            |                            |
        | 3. spawn `waap-cli         |                            |
        |    send-tx --tx-bytes ...` |                            |
        | -------------------------->|                            |
        |                            | 4. auth with local         |
        |                            |    session token           |
        |                            | -------------------------->|
        |                            |                            |
        |                            | 5. 2PC signing protocol    |
        |                            |    (multi-round)           |
        |                            | <-------- rounds --------> |
        |                            |                            |
        |                            | 6. assemble final          |
        |                            |    signature locally       |
        |                            |                            |
        |                            | 7. submit signed tx        |
        |                            |    to Sui fullnode         |
        |                            | ---> (Sui RPC) --->        |
        |                            |                            |
        | 8. JSON result on stdout   |                            |
        |    { event:"result",       |                            |
        |      txHash, ... }         |                            |
        | <--------------------------|                            |
        |                            |                            |
        | 9. agent calls             |                            |
        |    sui.waitForTransaction  |                            |
        |    to confirm on-chain     |                            |
        |                            |                            |
```

Key points:

- **The agent never sees a raw private key.** The key share lives inside `~/.waap-cli/` (encrypted at rest); the matching share lives on the WaaP server. Neither share alone can produce a valid signature.
- **What crosses the process boundary is base64-encoded tx bytes** -- the exact serialized PTB that the Sui fullnode will execute. Nothing about strategy, balances, or env vars leaves the agent process.
- **The CLI is the auth boundary.** `waap-cli signup` / `login` provisions the local share + session token. The agent inherits whatever session the CLI has -- no extra config.
- **TEE attestation** (declared in `activity.json` under `eip8004.supportedTrust`) lets the server prove it's running unmodified co-signer code inside a trusted enclave. Clients that verify the attestation get a stronger guarantee that the server-side share isn't being exfiltrated.

### Why a subprocess instead of an SDK call

This template shells out to `waap-cli` (via `execa`) rather than calling a WaaP SDK directly. Pros:

- Zero key material in the agent's address space.
- The CLI handles session refresh, retry, and protocol upgrades on its own release cadence.
- Trivial to swap in any other 2PC / MPC backend that exposes a "give me bytes, get back a digest" CLI.

If you're writing your own integration and want to skip the subprocess, look for `@human.tech/waap-sdk` -- the equivalent in code is roughly:

```ts
// pseudocode -- check the published SDK for the actual API surface
import { WaapClient } from '@human.tech/waap-sdk'
const waap = await WaapClient.fromLocalSession()           // reads ~/.waap-cli/
const txBytes = await tx.build({ client: sui })            // same Transaction object
const { digest } = await waap.signAndSendTx({              // 2PC happens inside
  chain: 'sui:mainnet',
  txBytes,
})
```

The contract is the same: hand over bytes, get back a digest.

## Example: SUI/USDC rebalancing

Suppose you hold SUI and USDC, and you want to keep roughly $500 in SUI at all times:

| Parameter               | Value                              |
| ----------------------- | ---------------------------------- |
| TARGET_TOKEN_TYPE       | 0x2::sui::SUI                      |
| QUOTE_TOKEN_TYPE        | (USDC type on Sui mainnet)         |
| TARGET_ALLOCATION_USD   | 500                                |
| HIGH_PRICE_THRESHOLD    | 4.50                               |
| LOW_PRICE_THRESHOLD     | 3.00                               |
| CETUS_POOL_ID           | (SUI/USDC pool on Cetus)           |

When SUI hits $4.50, the agent calculates how much SUI to sell so that the remaining SUI position is worth $500. When SUI drops to $3.00, it buys SUI to bring the position back to $500.

## Env vars

| Key                    | Required | Default | Description                                                |
| ---------------------- | -------- | ------- | ---------------------------------------------------------- |
| TARGET_TOKEN_TYPE      | yes      |         | Sui type string for the target token                       |
| QUOTE_TOKEN_TYPE       | yes      |         | Sui type string for the quote token                        |
| TARGET_ALLOCATION_USD  | yes      |         | USD value to maintain in the target token                  |
| HIGH_PRICE_THRESHOLD   | yes      |         | Sell threshold (USD price of target token)                 |
| LOW_PRICE_THRESHOLD    | yes      |         | Buy threshold (USD price of target token)                  |
| CETUS_POOL_ID          | yes      |         | Cetus pool object ID                                       |
| POLL_INTERVAL_MS       | no       | 60000   | Milliseconds between price checks                          |
| SLIPPAGE_BPS           | no       | 50      | Max slippage in basis points                               |
| NETWORK                | no       | mainnet | Sui network (mainnet or testnet)                           |
| SUI_RPC                | no       |         | Sui RPC endpoint override                                  |
| WAAP_AGENT_ADDRESS     | no       |         | Sui wallet address (bypass waap-cli whoami)                |
| CETUS_AGGREGATOR_URL   | no       |         | Cetus aggregator API endpoint override                     |
| AGENT_LOG_FILE         | no       |         | Path for JSON-line log file                                |

## Generate and run

```bash
npx @human.tech/create-agent-wallet --activity sui-portfolio-rebalancer --runtime standalone my-rebalancer
cd my-rebalancer
cp .env.example .env
# edit .env -- set all REQUIRED values
npm install
waap-cli signup --email you+rebalancer@example.com --password '...'
waap-cli chain set sui:mainnet
npm run dev
```

## Log events

The agent emits structured JSON-line logs:

- `agent_start` -- agent initialized with config
- `price_check` -- current price read from pool
- `rebalance_triggered` -- price crossed a threshold, swap initiated
- `rebalance_complete` -- swap confirmed on-chain
- `rebalance_failed` -- swap failed
- `balance_snapshot` -- periodic target + quote token balances
