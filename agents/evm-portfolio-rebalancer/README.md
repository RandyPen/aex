# Portfolio Rebalancer / Grid Trading Agent (EVM)

A WaaP-powered agent that monitors a token's price on Uniswap V3 and rebalances holdings when the price crosses configurable thresholds. Operates as a simple grid trading strategy: sell when price is high, buy when price is low, maintaining a target USD allocation.

## Strategy

The agent maintains a target USD allocation of a given token (e.g. $1,000 worth of WETH). Two price thresholds define the trading grid:

- **High threshold**: When the token price rises above this level, the agent sells enough tokens to bring holdings back to the target allocation.
- **Low threshold**: When the token price falls below this level, the agent buys enough tokens to bring holdings back to the target allocation.
- **In range**: When price is between thresholds, the agent does nothing.

This captures profit on the way up and accumulates on the way down, similar to a grid bot or constant-rebalance strategy.

## Example Scenario

Configuration:
- Token: WETH, Quote: USDC
- Target allocation: $1,000
- High price threshold: $2,700
- Low price threshold: $2,300
- Current WETH price: $2,500

At $2,500 WETH, the agent holds ~0.4 WETH ($1,000 worth). The agent polls price every 30 seconds.

**Price rises to $2,750:**
The agent's WETH is now worth $1,100 (0.4 * $2,750). To rebalance to $1,000, it sells ~0.0364 WETH ($100 worth) via Uniswap V3, receiving ~100 USDC.

**Price drops to $2,200:**
The agent's remaining WETH (~0.3636) is now worth ~$800. To rebalance to $1,000, it buys ~0.0909 WETH ($200 worth) using USDC via Uniswap V3.

Over time, this captures value from volatility while maintaining consistent exposure.

## Configuration

All configuration is via environment variables. Copy `dot-env.example` to `.env` and fill in values.

### Required

| Variable | Description |
|---|---|
| `TARGET_TOKEN` | Address of the token to rebalance (e.g. WETH) |
| `QUOTE_TOKEN` | Address of the quote/stable token (e.g. USDC) |
| `TARGET_ALLOCATION_USD` | Dollar value of TARGET_TOKEN holdings to maintain |
| `HIGH_PRICE_THRESHOLD` | Sell trigger price (USD) |
| `LOW_PRICE_THRESHOLD` | Buy trigger price (USD) |
| `DEX_ROUTER` | Uniswap V3 SwapRouter02 contract address |
| `POOL_ADDRESS` | Uniswap V3 pool address for the token pair |

### Optional

| Variable | Default | Description |
|---|---|---|
| `POOL_FEE` | `3000` | Pool fee tier in basis points |
| `TARGET_DECIMALS` | `18` | Decimals for TARGET_TOKEN |
| `QUOTE_DECIMALS` | `6` | Decimals for QUOTE_TOKEN |
| `TOKEN0_IS_TARGET` | `true` | Whether TARGET_TOKEN is token0 in the pool |
| `POLL_INTERVAL_MS` | `30000` | Milliseconds between price checks |
| `SLIPPAGE_BPS` | `50` | Maximum slippage (50 = 0.5%) |
| `AGENT_LOG_FILE` | `./logs/<agentId>.jsonl` | Path to structured log file |

## Running

```bash
npm install
cp dot-env.example .env
# Fill in .env values

# Development (with hot reload)
npm run dev

# Production
npm start
```

Requires `waap-cli` to be installed and authenticated (`waap-cli signup` / `waap-cli login`).

## How It Works

1. Queries the Uniswap V3 pool's `slot0()` to get `sqrtPriceX96`
2. Converts to a human-readable price using token decimals
3. Compares against high/low thresholds
4. If a rebalance is needed, encodes a Uniswap V3 `exactInputSingle` call
5. Submits the swap transaction via `waap-cli send-tx` (2PC-MPC signing, no raw private key)
6. Logs all events as structured JSONL for dashboard ingestion

## Signing

All transaction signing is handled by WaaP CLI using 2-party computation. No private keys are stored in the environment. The agent calls `waap-cli send-tx` which coordinates with the WaaP network for secure co-signing.

## Log Events

The agent emits structured JSON log lines:

- `agent_start` -- Agent initialization with config summary
- `price_check` -- Current price, thresholds, and whether in range
- `rebalance_triggered` -- Direction (buy/sell), amount, current price
- `rebalance_complete` -- Successful swap with transaction hash
- `rebalance_failed` -- Error details on failed swap
- `balance_snapshot` -- Current token balances in wallet
