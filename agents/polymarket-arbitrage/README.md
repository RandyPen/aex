# Polymarket Arbitrage Agent

Autonomous agent that scans Polymarket prediction markets for price discrepancies, identifies arbitrage opportunities, signs EIP-712 orders with the local WaaP wallet, and submits both legs to the Polymarket CLOB.

Runs on **Polygon** (chain id `137`).

## How it works

The agent runs two arbitrage detection strategies on each scan cycle:

### Complementary market arbitrage

Within a single market, YES and NO tokens should sum to 1.00 (minus fees). When they don't:

- **Sum > 1.0**: Sell both YES and NO tokens. The excess above 1.0 is guaranteed profit.
- **Sum < 1.0**: Buy both YES and NO tokens. On resolution, one side pays 1.0 per share. The deficit below 1.0 is your guaranteed profit.

### Related market arbitrage

Within an event containing multiple markets, logically opposing outcomes should have consistent implied probabilities. The agent groups markets by event via the Gamma API and flags pairs where the probability sum deviates from 1.0.

Example: An event has "Candidate X wins" at 60% and "Candidate X loses" at 50%. Both can't be right. Buy the underpriced side, sell the overpriced side.

### Fee awareness

Polymarket charges approximately 2% round-trip per leg (~1% maker + ~1% taker). The agent subtracts estimated fees from the raw spread before comparing against `MIN_SPREAD_BPS`. Only opportunities with post-fee profit above the threshold are executed.

### Execution

Both legs of an arbitrage are placed as close together as possible to minimize execution risk. If leg A succeeds but leg B fails, the agent logs a warning for manual review.

## Env vars

| Key                      | Required | Default                       | Description                                                          |
| ------------------------ | -------- | ----------------------------- | -------------------------------------------------------------------- |
| `POLYMARKET_API_URL`     | no       | `https://clob.polymarket.com` | CLOB endpoint                                                        |
| `AGENT_POLL_INTERVAL_MS` | no       | `30000`                       | Scan interval (default 30s -- faster than signal trader for arb)     |
| `AGENT_MAX_ORDER_USD`    | **yes**  | --                            | Hard cap per order leg                                               |
| `MIN_SPREAD_BPS`         | no       | `50`                          | Minimum spread in basis points after fees to trigger a trade (0.5%)  |
| `POLY_API_KEY`           | **yes**  | --                            | CLOB L2 auth -- API key                                              |
| `POLY_API_SECRET`        | **yes**  | --                            | CLOB L2 auth -- secret for HMAC signature                           |
| `POLY_PASSPHRASE`        | **yes**  | --                            | CLOB L2 auth -- passphrase                                          |
| `POLY_ADDRESS`           | no       | `waap-cli whoami`             | Wallet address tied to the API key                                   |

Mint CLOB credentials via Polymarket's clob-client `deriveApiKey()` or `POST /auth/derive-api-key` (signed L1 EIP-712). See [Polymarket CLOB authentication docs](https://docs.polymarket.com/developers/CLOB/authentication).

## Log events

All events are structured JSON lines (stdout + `./logs/<agent-id>.jsonl`), compatible with AEX dashboard ingest:

| Event              | Description                                                     |
| ------------------ | --------------------------------------------------------------- |
| `agent_start`      | Agent initialized with config and wallet address                |
| `market_scan`      | Fetched events and scanned for opportunities                    |
| `arb_opportunity`  | Detected an arbitrage opportunity (includes spread, profit)     |
| `order_placed`     | Built, signed, and submitted an order leg                       |
| `order_failed`     | An order leg failed to sign or submit                           |
| `arb_complete`     | Both legs of an arbitrage successfully submitted                |
| `balance_snapshot` | Wallet and position summary                                     |

## Generate it

```bash
npx @human.tech/create-agent-wallet \
  --activity polymarket-arbitrage \
  --runtime standalone \
  polymarket-arb
```

## Risks

- **Leg risk**: If one leg fills but the other does not, you hold a directional position instead of a hedged one. The agent logs partial fills for manual review.
- **Latency**: Arbitrage opportunities are fleeting. The default 30s poll interval is a starting point. For production, consider websocket price feeds.
- **Fee estimation**: The 2% round-trip fee is approximate. Actual fees depend on maker/taker status and may change. Monitor real fills against expected profits.
- **Related market heuristics**: Cross-market arb detection uses price-sum heuristics, not semantic analysis. Not all flagged pairs are true complements. Review logs before lowering `MIN_SPREAD_BPS`.
