/* ═══════════════════════════════════════════════════════════
   Unified mock data for all agent types (demo mode)
   ═══════════════════════════════════════════════════════════ */

import type {
  Agent,
  BalanceSnapshot,
  AgentEvent,
  PositionData,
  PerformanceData,
  VolatilityData,
  YieldScanData,
  TradeEvent,
  PMPositionData,
  PnLData,
  MarketData,
  AnalysisEvent,
  LLMStatsData,
  ArbOpportunity,
  OpenArbPosition,
  SpreadDataPoint,
  UniRebalanceEvent,
  PoolPosition,
  FeeData,
  DriftPoint,
  GridRebalanceEvent,
  AllocationState,
  ThresholdState,
  PricePoint,
  VoteEvent,
  Proposal,
  VotingStats,
  PaymentScheduleItem,
  PaymentEvent,
  PaymentStats,
  TestRun,
  TestStats,
  MonitoredRepo,
  GasSpendPoint,
} from "./types";

/* ═════════════════════════════════════════════════════════
   Agent definitions
   ═════════════════════════════════════════════════════════ */

export const agents: Agent[] = [
  {
    id: "sui-cetus-yield",
    name: "Cetus Yield Agent",
    description: "Deposits funds into a Cetus Protocol trading pool on Sui and earns a share of trading fees. Monitors the market price and automatically repositions when the price moves outside the earning zone. All transactions require two-party signing via WaaP.",
    email: "webmaster+sui-cetus-yield@holonym.id",
    chain: "Sui",
    network: "mainnet",
    protocol: "Cetus Protocol",
    category: "yield",
    walletAddress: "0x41bc2d53b278911e32c3323b9ecf45c3c3318eb2bd73086825952e0c3a9db604",
    status: "running",
    uptime: "2h 34m",
    lastActivity: "3 min ago",
    config: {
      "Pool": "SUI / USDC",
      "Reposition trigger": "When price moves 100+ units from center",
      "Earning zone width": "200 units (auto-adjusts with volatility)",
      "Reinvest fees": "Yes",
      "Check interval": "Every 5 min",
      "Daily spend limit": "$50",
    },
    tools: ["@human.tech/waap-cli", "@cetusprotocol/cetus-sui-clmm-sdk", "@mysten/sui"],
  },
  {
    id: "poly-trading-alpha",
    name: "Polymarket Trading Agent",
    description: "Scans prediction markets on Polymarket for mispriced outcomes, places trades on high-conviction signals, and manages positions with automated stop-losses.",
    email: "webmaster+poly-trading@holonym.id",
    chain: "Polygon",
    network: "mainnet",
    protocol: "Polymarket",
    category: "trading",
    walletAddress: "0x7a3b1c9e2d4f5a6b8c0d1e2f3a4b5c6d7e8f9a0b",
    status: "running",
    uptime: "14h 22m",
    lastActivity: "1 min ago",
    config: {
      "Strategy": "Edge detection + sentiment divergence",
      "Max position size": "$500 per market",
      "Stop loss": "-15% per position",
      "Take profit": "+40% per position",
      "Scan interval": "Every 2 min",
      "Daily spend limit": "$2,000",
    },
    tools: ["@human.tech/waap-cli", "polymarket-clob-client", "@polygonio/client"],
  },
  {
    id: "poly-llm-analyst",
    name: "Polymarket LLM Analyst",
    description: "Uses large language model reasoning to analyze prediction markets on Polymarket. Places trades only when LLM confidence exceeds threshold.",
    email: "webmaster+poly-llm@holonym.id",
    chain: "Polygon",
    network: "mainnet",
    protocol: "Polymarket",
    category: "trading",
    walletAddress: "0x4b2c8d1e5f6a7b9c0d3e4f5a6b7c8d9e0f1a2b3c",
    status: "running",
    uptime: "22h 47m",
    lastActivity: "3 min ago",
    config: {
      "Strategy": "LLM-driven fundamental analysis",
      "LLM Model": "Claude Sonnet 4",
      "Confidence threshold": "0.72",
      "Max position size": "$400 per market",
      "Analysis interval": "Every 5 min",
      "Daily spend limit": "$1,500",
    },
    tools: ["@human.tech/waap-cli", "polymarket-clob-client", "@anthropic-ai/sdk"],
  },
  {
    id: "poly-arb-alpha",
    name: "Polymarket Arbitrage Agent",
    description: "Monitors complementary and related prediction markets for spread dislocations. Executes two-leg arbitrage trades via WaaP-signed orders.",
    email: "webmaster+poly-arb@holonym.id",
    chain: "Polygon",
    network: "mainnet",
    protocol: "Polymarket",
    category: "trading",
    walletAddress: "0x9c4d2e8f1a3b5c7d6e0f1a2b3c4d5e6f7a8b9c0d",
    status: "running",
    uptime: "9h 44m",
    lastActivity: "28s ago",
    config: {
      "Strategy": "Spread arbitrage (complementary + related markets)",
      "Min spread threshold": "120 bps",
      "Max position size": "$750 per leg",
      "Scan interval": "Every 15s",
      "Daily spend limit": "$5,000",
    },
    tools: ["@human.tech/waap-cli", "polymarket-clob-client", "spread-scanner"],
  },
  {
    id: "uni-v3-rebalancer-base",
    name: "Uniswap v3 LP Rebalancer",
    description: "Monitors a Uniswap v3 concentrated-liquidity ETH/USDC position on Base. Drains and repositions when price drifts out of range.",
    email: "webmaster+uni-rebalancer@holonym.id",
    chain: "Base",
    network: "mainnet",
    protocol: "Uniswap v3",
    category: "yield",
    walletAddress: "0x4a2e8c1d3f5b6a7e9c0d1f2a3b4c5d6e7f8a9b0c",
    status: "running",
    uptime: "3d 7h 41m",
    lastActivity: "4 min ago",
    config: {
      "Pool": "ETH/USDC 0.05%",
      "Range width": "500 bps (+-2.5%)",
      "Poll interval": "15 min",
      "Max deposit": "$10,000",
    },
    tools: ["@human.tech/waap-cli", "viem", "uniswap-v3-sdk"],
  },
  {
    id: "evm-portfolio-rebalancer-base",
    name: "EVM Portfolio Rebalancer",
    description: "Monitors ETH/USDC portfolio allocation on Base. Swaps to maintain target allocation when price crosses thresholds.",
    email: "webmaster+evm-rebalancer@holonym.id",
    chain: "Base",
    network: "mainnet",
    protocol: "Portfolio Rebalancer",
    category: "trading",
    walletAddress: "0x7b3e2f1a9c4d8e5f0b6a7c8d9e1f2a3b4c5d6e7f",
    status: "running",
    uptime: "5d 12h 18m",
    lastActivity: "2 min ago",
    config: {
      "Pair": "ETH / USDC",
      "Target allocation": "50% ETH / 50% USDC",
      "High threshold": "$2,700",
      "Low threshold": "$2,300",
      "Poll interval": "5 min",
    },
    tools: ["@human.tech/waap-cli", "viem"],
  },
  {
    id: "snapshot-gov-alpha",
    name: "Snapshot Governance Agent",
    description: "Monitors DAO proposals on Snapshot, votes according to configured strategy rules, and tracks governance participation across multiple spaces.",
    email: "webmaster+snapshot-gov@holonym.id",
    chain: "Ethereum",
    network: "mainnet",
    protocol: "Snapshot",
    category: "governance",
    walletAddress: "0x4c2e8a1b3f5d6e7a9b0c1d2e3f4a5b6c7d8e9f0a",
    status: "running",
    uptime: "6d 11h",
    lastActivity: "3 min ago",
    config: {
      "Spaces monitored": "4 (Arbitrum DAO, Uniswap, Aave, ENS)",
      "Default vote": "Abstain (unless rule match)",
      "Scan interval": "Every 5 min",
    },
    tools: ["@human.tech/waap-cli", "snapshot-js", "ethers"],
  },
  {
    id: "recurring-pay-alpha",
    name: "Recurring Payments Agent",
    description: "Manages automated recurring payments to contractors, bounties, and operational wallets. Executes scheduled transfers on time.",
    email: "webmaster+recurring-pay@holonym.id",
    chain: "Ethereum",
    network: "mainnet",
    protocol: "ERC-20 Transfers",
    category: "other",
    walletAddress: "0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b",
    status: "running",
    uptime: "12d 5h",
    lastActivity: "2 min ago",
    config: {
      "Active schedules": "3",
      "Retry on failure": "3 attempts with 10 min backoff",
      "Low balance alert": "$200 USDC threshold",
    },
    tools: ["@human.tech/waap-cli", "ethers", "viem"],
  },
  {
    id: "wallet-integration-test",
    name: "Wallet Integration Test Agent",
    description: "Runs automated integration tests against WaaP wallet on staging for every PR. Validates signing, transactions, and balance integrity.",
    email: "webmaster+wallet-test@holonym.id",
    chain: "Ethereum",
    network: "sepolia",
    protocol: "WaaP Test Suite",
    category: "other",
    walletAddress: "0x7a3b1c9e2d4f5a6b8c0d1e2f3a4b5c6d7e8f9a0b",
    status: "running",
    uptime: "1d 0h",
    lastActivity: "25 min ago",
    config: {
      "Test suite": "5 tests (SIWE, send-tx, approval, contract call, balance)",
      "Trigger": "GitHub PR webhook",
      "Timeout per test": "30s",
      "Repos monitored": "holonym-foundation/human-id, holonym-foundation/waap-docs",
    },
    tools: ["@human.tech/waap-cli", "viem", "vitest"],
  },
];

/* ═════════════════════════════════════════════════════════
   Cetus / Yield mock data
   ═════════════════════════════════════════════════════════ */

export function generateBalanceHistory(): BalanceSnapshot[] {
  const now = Date.now();
  const points: BalanceSnapshot[] = [];
  let balance = 10.0;
  for (let i = 48; i >= 0; i--) {
    const ts = new Date(now - i * 30 * 60 * 1000).toISOString();
    balance += (Math.random() - 0.45) * 0.15;
    balance = Math.max(0, balance);
    points.push({ ts, balance: parseFloat(balance.toFixed(4)) });
  }
  return points;
}

export function generateEvents(): AgentEvent[] {
  const now = Date.now();
  return [
    { ts: new Date(now - 3 * 60 * 1000).toISOString(), type: "position_check", level: "info", message: "Position in range (drift: 42 ticks, threshold: 100)" },
    { ts: new Date(now - 8 * 60 * 1000).toISOString(), type: "rebalance_complete", level: "event", message: "Rebalance complete. New range: [1240, 1640]", txHash: "0xabc123..." },
    { ts: new Date(now - 9 * 60 * 1000).toISOString(), type: "remove_liquidity_complete", level: "event", message: "Removed liquidity. Collected 0.023 SUI in fees", txHash: "0x789abc..." },
    { ts: new Date(now - 9.5 * 60 * 1000).toISOString(), type: "drift_detected", level: "info", message: "Price drifted 112 ticks from center (threshold: 100)" },
    { ts: new Date(now - 2 * 60 * 60 * 1000).toISOString(), type: "agent_start", level: "info", message: "Agent started. Pool: SUI/USDC, Network: mainnet" },
  ];
}

export function generatePosition(): PositionData {
  return { tickLower: 69420, tickUpper: 69840, currentTick: 69675, drift: 45, threshold: 100, rangeWidth: 420, inRange: true, timeInRangePct: 98, positionOpenedAt: new Date(Date.now() - 3 * 3600000).toISOString(), rebalanceCount: 0, liquidity: "28943021" };
}

export function generatePerformance(): PerformanceData {
  return { initialBalance: 4.1255, currentBalance: 0.8144, pnl: -3.3111, pnlPct: -80.26, totalGasSpent: 0.01, rebalanceCount: 0, uptimeHours: 22, estimatedApy: 0 };
}

export function generateVolatility(): VolatilityData {
  return { volatility: 8.3, volatilitySamples: 45, adaptiveRange: 200, baseRange: 200, recommendation: "The market is calm. The current earning zone is well-sized for steady fee income." };
}

export function generateYieldScan(): YieldScanData {
  return {
    cetusTopPools: [{ symbol: "USDC-SUI", apy: 23.5, tvl: 6116080 }, { symbol: "HASUI-SUI", apy: 0.02, tvl: 3836171 }, { symbol: "USDC-USDY", apy: 0.11, tvl: 3751726 }],
    crossProtocol: [
      { protocol: "bluefin-spot", type: "lp", asset: "SUI-USDC", apy: 32.6, tvl: 3270836 },
      { protocol: "cetus-clmm", type: "lp", asset: "USDC-SUI", apy: 23.5, tvl: 6116080 },
      { protocol: "kai-finance", type: "lending", asset: "SUI", apy: 6.2, tvl: 3710052 },
    ],
    currentPool: { symbol: "SUI/USDC", protocol: "cetus-clmm", apy: 23.5, tvl: 6116080, rank: 1 },
    bestAlternative: { protocol: "bluefin-spot", type: "lp", asset: "SUI-USDC", apy: 32.6, tvl: 3270836 },
    scanTime: new Date().toISOString(),
  };
}

/* ═════════════════════════════════════════════════════════
   Polymarket trading mock data
   ═════════════════════════════════════════════════════════ */

export function generateTrades(): TradeEvent[] {
  const now = Date.now();
  return [
    { ts: new Date(now - 1 * 60 * 1000).toISOString(), marketId: "btc-120k", marketQuestion: "Will BTC exceed $120k by July 2026?", side: "YES", amount: 200, price: 0.42, status: "filled", txHash: "0xpoly_abc123..." },
    { ts: new Date(now - 12 * 60 * 1000).toISOString(), marketId: "fed-cut", marketQuestion: "Will the Fed cut rates in June 2026?", side: "NO", amount: 150, price: 0.61, status: "filled", txHash: "0xpoly_def456..." },
    { ts: new Date(now - 3 * 60 * 60 * 1000).toISOString(), marketId: "eth-pectra", marketQuestion: "Will Ethereum complete Pectra upgrade by Q2 2026?", side: "YES", amount: 300, price: 0.78, status: "filled", txHash: "0xpoly_mno345..." },
  ];
}

export function generatePMPositions(): PMPositionData[] {
  return [
    { marketId: "btc-120k", marketQuestion: "Will BTC exceed $120k by July 2026?", side: "YES", amount: 200, avgPrice: 0.42, currentPrice: 0.47, pnl: 10.0, pnlPct: 11.9 },
    { marketId: "fed-cut", marketQuestion: "Will the Fed cut rates in June 2026?", side: "NO", amount: 150, avgPrice: 0.61, currentPrice: 0.58, pnl: 4.5, pnlPct: 4.92 },
    { marketId: "spacex", marketQuestion: "Will SpaceX achieve Starship orbital flight by August 2026?", side: "YES", amount: 400, avgPrice: 0.65, currentPrice: 0.71, pnl: 24.0, pnlPct: 9.23 },
  ];
}

export function generatePnL(): PnLData {
  return { totalPnl: 247.83, totalPnlPct: 24.78, winRate: 68.4, totalTrades: 57, totalVolume: 14250.0, wins: 39, losses: 18, bestTrade: 186.50, worstTrade: -87.25, avgTradeSize: 250.0 };
}

export function generateWatchedMarkets(): MarketData[] {
  return [
    { marketId: "nvidia", question: "Will NVIDIA beat Q2 2026 earnings estimates?", category: "Finance", volume24h: 2450000, liquidity: 890000, endDate: "2026-08-15", yesPrice: 0.72, noPrice: 0.28, watchReason: "High volume spike + sentiment divergence" },
    { marketId: "recession", question: "Will the US enter recession in 2026?", category: "Economics", volume24h: 1830000, liquidity: 1250000, endDate: "2026-12-31", yesPrice: 0.23, noPrice: 0.77, watchReason: "Edge: model predicts 31% vs market 23%" },
    { marketId: "openai-ipo", question: "Will OpenAI IPO in 2026?", category: "Tech", volume24h: 980000, liquidity: 520000, endDate: "2026-12-31", yesPrice: 0.41, noPrice: 0.59, watchReason: "Recent news catalyst + price momentum" },
  ];
}

/* ═════════════════════════════════════════════════════════
   LLM Analyst mock data
   ═════════════════════════════════════════════════════════ */

export function generateAnalyses(): AnalysisEvent[] {
  const now = Date.now();
  return [
    { ts: new Date(now - 3 * 60 * 1000).toISOString(), marketId: "btc-120k", marketQuestion: "Will BTC exceed $120k by July 2026?", side: "YES", confidence: 0.81, reasoning: "BTC at $108k with strong ETF inflows. Post-halving cycle supports $120k.", traded: true, llmModel: "Claude Sonnet 4", promptTokens: 2840, completionTokens: 312, costEstimate: 0.012 },
    { ts: new Date(now - 8 * 60 * 1000).toISOString(), marketId: "apple-ar", marketQuestion: "Will Apple launch AR glasses in 2026?", side: "NO", confidence: 0.58, reasoning: "Vision Pro underperforming. Lighter model likely 2027+.", traded: false, llmModel: "Claude Sonnet 4", promptTokens: 3120, completionTokens: 287, costEstimate: 0.013 },
    { ts: new Date(now - 15 * 60 * 1000).toISOString(), marketId: "fed-cut", marketQuestion: "Will the Fed cut rates in June 2026?", side: "NO", confidence: 0.77, reasoning: "CPI sticky at 3.1%. Employment strong. FOMC projects elevated rates.", traded: true, llmModel: "Claude Sonnet 4", promptTokens: 3450, completionTokens: 341, costEstimate: 0.015 },
    { ts: new Date(now - 55 * 60 * 1000).toISOString(), marketId: "spacex", marketQuestion: "Will SpaceX achieve Starship orbital flight by August 2026?", side: "YES", confidence: 0.88, reasoning: "5 IFTs complete, Raptor 3 reliable. Multiple shots before Aug.", traded: true, llmModel: "Claude Sonnet 4", promptTokens: 2750, completionTokens: 276, costEstimate: 0.011 },
  ];
}

export function generateLLMStats(): LLMStatsData {
  return { totalAnalyses: 128, tradesPlaced: 42, tradesSkipped: 86, avgConfidence: 0.68, winRateOnTrades: 71.4, llmProvider: "Anthropic", llmModel: "Claude Sonnet 4", totalLLMCost: 1.64, confidenceThreshold: 0.72 };
}

/* ═════════════════════════════════════════════════════════
   Arbitrage mock data
   ═════════════════════════════════════════════════════════ */

export function generateArbOpportunities(): ArbOpportunity[] {
  const now = Date.now();
  return [
    {
      id: "arb-001", marketA: "fed-cuts", marketAQuestion: "Will the Fed cut rates in June 2026?", marketB: "fed-holds", marketBQuestion: "Will the Fed hold rates in June 2026?",
      strategy: "complementary", spreadBps: 310, expectedProfit: 14.20, actualProfit: 12.40, status: "complete",
      detectedAt: new Date(now - 6 * 60 * 1000).toISOString(), executedAt: new Date(now - 5.5 * 60 * 1000).toISOString(), completedAt: new Date(now - 2 * 60 * 1000).toISOString(),
      legA: { orderId: "a-001", side: "YES", amount: 300, status: "filled", fillPrice: 0.59, filledAt: new Date(now - 5.5 * 60 * 1000).toISOString() },
      legB: { orderId: "b-001", side: "NO", amount: 300, status: "filled", fillPrice: 0.38, filledAt: new Date(now - 5 * 60 * 1000).toISOString() },
    },
    {
      id: "arb-002", marketA: "btc-130k", marketAQuestion: "Will BTC exceed $130k by Sep 2026?", marketB: "btc-125k", marketBQuestion: "Will BTC exceed $125k by Sep 2026?",
      strategy: "related", spreadBps: 185, expectedProfit: 11.50, actualProfit: null, status: "executing",
      detectedAt: new Date(now - 28 * 1000).toISOString(), executedAt: new Date(now - 20 * 1000).toISOString(), completedAt: null,
      legA: { orderId: "a-002", side: "NO", amount: 350, status: "filled", fillPrice: 0.71, filledAt: new Date(now - 15 * 1000).toISOString() },
      legB: { orderId: "b-002", side: "YES", amount: 350, status: "placed", fillPrice: null, filledAt: null },
    },
  ];
}

export function generateOpenPositions(): OpenArbPosition[] {
  const now = Date.now();
  return [
    { id: "arb-002", marketA: "btc-130k", marketAQuestion: "Will BTC exceed $130k by Sep 2026?", marketB: "btc-125k", marketBQuestion: "Will BTC exceed $125k by Sep 2026?", legAStatus: "filled", legBStatus: "placed", entrySpreadBps: 185, currentSpreadBps: 172, unrealizedPnl: 4.55, openedAt: new Date(now - 20 * 1000).toISOString() },
  ];
}

export function generateSpreadHistory(): SpreadDataPoint[] {
  const now = Date.now();
  const pairs = ["Fed cuts / Fed holds", "BTC $130k / BTC $125k", "NVIDIA beat / miss"];
  const points: SpreadDataPoint[] = [];
  for (let i = 48; i >= 0; i--) {
    const ts = new Date(now - i * 30 * 60 * 1000).toISOString();
    for (const pair of pairs) {
      const base = pair.includes("Fed") ? 280 : pair.includes("BTC") ? 175 : 260;
      const spread = Math.max(50, base + (Math.random() - 0.5) * 160);
      points.push({ ts, pair, spreadBps: Math.round(spread) });
    }
  }
  return points;
}

/* ═════════════════════════════════════════════════════════
   Uniswap rebalancer mock data
   ═════════════════════════════════════════════════════════ */

export function generateUniRebalanceHistory(): UniRebalanceEvent[] {
  const now = Date.now();
  return [
    { ts: new Date(now - 2.5 * 60 * 60 * 1000).toISOString(), oldTickLower: 201200, oldTickUpper: 202200, newTickLower: 201650, newTickUpper: 202650, triggerReason: "out_of_range_above", gasCostEth: 0.00082, gasCostUsd: 2.05, token0Recovered: 2.14, token1Recovered: 3187.5, txHash: "0xabc123def..." },
    { ts: new Date(now - 18 * 60 * 60 * 1000).toISOString(), oldTickLower: 201400, oldTickUpper: 202400, newTickLower: 201200, newTickUpper: 202200, triggerReason: "out_of_range_below", gasCostEth: 0.00091, gasCostUsd: 2.28, token0Recovered: 2.08, token1Recovered: 3310.0, txHash: "0x456def789..." },
  ];
}

export function generatePoolPosition(): PoolPosition {
  return {
    tokenId: "847291", pool: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640",
    token0Symbol: "ETH", token1Symbol: "USDC", fee: 500,
    tickLower: 201650, tickUpper: 202650, currentTick: 202148, inRange: true,
    liquidity: "4892710384571028", token0Amount: 2.14, token1Amount: 3187.5,
    token0ValueUsd: 5350.0, token1ValueUsd: 3187.5, totalValueUsd: 8537.5,
    priceLower: 2385.2, priceUpper: 2625.8, currentPrice: 2500.0,
  };
}

export function generateFeeData(): FeeData {
  return { totalFeesToken0: 0.0247, totalFeesToken1: 62.35, totalFeesUsd: 124.1, fees24hToken0: 0.0031, fees24hToken1: 7.82, fees24hUsd: 15.57, feeApyEstimate: 22.4, feesCollectedCount: 7 };
}

export function generateDriftHistory(): DriftPoint[] {
  const now = Date.now();
  const points: DriftPoint[] = [];
  const center = 202150;
  for (let i = 288; i >= 0; i--) {
    const ts = new Date(now - i * 15 * 60 * 1000).toISOString();
    const drift = Math.sin(i * 0.025) * 350 + (Math.random() - 0.5) * 80;
    const tick = center + Math.round(drift);
    points.push({ ts, currentTick: tick, rangeCenterTick: center, driftBps: Math.round(drift), price: parseFloat((2500 * Math.pow(1.0001, tick - center)).toFixed(2)) });
  }
  return points;
}

/* ═════════════════════════════════════════════════════════
   EVM Portfolio Rebalancer mock data
   ═════════════════════════════════════════════════════════ */

export function generateGridRebalanceHistory(): GridRebalanceEvent[] {
  const now = Date.now();
  return [
    { ts: new Date(now - 3.2 * 60 * 60 * 1000).toISOString(), direction: "SELL", triggerPrice: 2715.30, amountSwapped: 0.012, amountSwappedSymbol: "ETH", usdValue: 32.58, gasCost: 0.85, gasCostNative: 0.00034, gasCostSymbol: "ETH", txHash: "0xabc123def..." },
    { ts: new Date(now - 18 * 60 * 60 * 1000).toISOString(), direction: "BUY", triggerPrice: 2285.10, amountSwapped: 0.018, amountSwappedSymbol: "ETH", usdValue: 41.13, gasCost: 0.92, gasCostNative: 0.00040, gasCostSymbol: "ETH", txHash: "0x456def789..." },
  ];
}

export function generateAllocationState(): AllocationState {
  const price = 2520.0, eth = 0.198, usdc = 502.0;
  const ethUsd = eth * price, total = ethUsd + usdc, pct = (ethUsd / total) * 100;
  return { targetToken: "ETH", stableToken: "USDC", currentPrice: price, targetTokenBalance: eth, stableBalance: usdc, targetTokenValueUsd: parseFloat(ethUsd.toFixed(2)), stableValueUsd: usdc, totalValueUsd: parseFloat(total.toFixed(2)), targetAllocationPct: 50, currentAllocationPct: parseFloat(pct.toFixed(1)), deviationPct: parseFloat((pct - 50).toFixed(1)) };
}

export function generateThresholdState(): ThresholdState {
  return { currentPrice: 2520.0, highThreshold: 2700, lowThreshold: 2300, zone: "hold", targetToken: "ETH", stableToken: "USDC" };
}

export function generatePriceHistory(): PricePoint[] {
  const now = Date.now();
  const points: PricePoint[] = [];
  for (let i = 288; i >= 0; i--) {
    const ts = new Date(now - i * 15 * 60 * 1000).toISOString();
    points.push({ ts, price: parseFloat((2520 + Math.sin(i * 0.02) * 180 + (Math.random() - 0.48) * 25).toFixed(2)) });
  }
  return points;
}

/* ═════════════════════════════════════════════════════════
   Snapshot Governance mock data
   ═════════════════════════════════════════════════════════ */

export function generateVoteHistory(): VoteEvent[] {
  const now = Date.now();
  return [
    { ts: new Date(now - 3 * 60 * 1000).toISOString(), proposalId: "aip-42", proposalTitle: "AIP-42: Treasury diversification into stablecoins", spaceName: "Arbitrum DAO", choice: "For", votingPower: 12500, proposalStatus: "active", txHash: "0xsnap_abc123..." },
    { ts: new Date(now - 45 * 60 * 1000).toISOString(), proposalId: "uni-rc-047", proposalTitle: "UNI-RC-047: Fee switch activation for V3 pools", spaceName: "Uniswap", choice: "Against", votingPower: 3200, proposalStatus: "active", txHash: "0xsnap_def456..." },
    { ts: new Date(now - 8 * 60 * 60 * 1000).toISOString(), proposalId: "aave-v3.2", proposalTitle: "AAVE-V3.2: Risk parameter update for wstETH market", spaceName: "Aave", choice: "For", votingPower: 8400, proposalStatus: "closed", txHash: "0xsnap_ghi789..." },
    { ts: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), proposalId: "aip-41", proposalTitle: "AIP-41: Security council member rotation", spaceName: "Arbitrum DAO", choice: "For", votingPower: 12500, proposalStatus: "passed", txHash: "0xsnap_jkl012..." },
  ];
}

export function generateProposals(): Proposal[] {
  const now = Date.now();
  return [
    { proposalId: "aip-42", title: "AIP-42: Treasury diversification into stablecoins", spaceName: "Arbitrum DAO", status: "active", endTs: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(), forVotes: 18_400_000, againstVotes: 3_200_000, abstainVotes: 1_100_000, quorum: 20_000_000, agentVoted: true, agentChoice: "For" },
    { proposalId: "ens-5.12", title: "EP-5.12: Wildcard resolution standard update", spaceName: "ENS", status: "active", endTs: new Date(now + 6 * 60 * 60 * 1000).toISOString(), forVotes: 450_000, againstVotes: 120_000, abstainVotes: 80_000, quorum: 800_000, agentVoted: false },
  ];
}

export function generateVotingStats(): VotingStats {
  return { totalVotesCast: 47, spacesMonitored: 4, participationRate: 89.4, votesThisWeek: 3, votesThisMonth: 12, forVotes: 28, againstVotes: 11, abstainVotes: 8, avgVotingPower: 7680 };
}

/* ═════════════════════════════════════════════════════════
   Recurring Payments mock data
   ═════════════════════════════════════════════════════════ */

export function generatePaymentSchedules(): PaymentScheduleItem[] {
  const now = Date.now();
  return [
    { id: "s-001", recipient: "0x9abc...1234", label: "Contractor payment", token: "USDC", amount: 500, interval: "monthly", nextDueDate: new Date(now + 27 * 24 * 60 * 60 * 1000).toISOString(), lastPaidDate: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), status: "active" },
    { id: "s-002", recipient: "0x5678...efgh", label: "Dev bounty", token: "ETH", amount: 0.1, interval: "biweekly", nextDueDate: new Date(now + 12 * 24 * 60 * 60 * 1000).toISOString(), lastPaidDate: new Date(now - 2 * 60 * 60 * 1000).toISOString(), status: "active" },
    { id: "s-003", recipient: "0x1234...abcd", label: "Agent fuel top-up", token: "ETH", amount: 0.05, interval: "weekly", nextDueDate: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(), lastPaidDate: new Date(now - 2 * 60 * 1000).toISOString(), status: "active" },
  ];
}

export function generatePaymentHistory(): PaymentEvent[] {
  const now = Date.now();
  return [
    { ts: new Date(now - 2 * 60 * 1000).toISOString(), scheduleId: "s-003", recipient: "0x1234...abcd", label: "Agent fuel top-up", amount: 0.05, token: "ETH", txHash: "0xpay_abc123...", status: "sent" },
    { ts: new Date(now - 2 * 60 * 60 * 1000).toISOString(), scheduleId: "s-002", recipient: "0x5678...efgh", label: "Dev bounty", amount: 0.1, token: "ETH", txHash: "0xpay_def456...", status: "sent" },
    { ts: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), scheduleId: "s-001", recipient: "0x9abc...1234", label: "Contractor payment", amount: 500, token: "USDC", txHash: "0xpay_ghi789...", status: "sent" },
    { ts: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), scheduleId: "s-003", recipient: "0x1234...abcd", label: "Agent fuel top-up", amount: 0.05, token: "ETH", txHash: "", status: "failed" },
  ];
}

export function generatePaymentStats(): PaymentStats {
  const now = Date.now();
  return { totalPaymentsSent: 34, totalUsdValue: 8470.50, activeSchedules: 3, nextPaymentDue: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(), paymentsThisMonth: 6, failedPayments: 1, totalSchedules: 3 };
}

/* ═════════════════════════════════════════════════════════
   Wallet Integration Test mock data
   ═════════════════════════════════════════════════════════ */

export function generateTestRuns(): TestRun[] {
  const now = Date.now();
  return [
    {
      id: "run-001", prNumber: 142, prTitle: "feat: add ERC-4337 bundler support", prUrl: "https://github.com/holonym-foundation/human-id/pull/142", repo: "holonym-foundation/human-id", timestamp: new Date(now - 25 * 60 * 1000).toISOString(), overallStatus: "pass", passCount: 5, totalCount: 5,
      tests: [
        { name: "SIWE sign", status: "pass", durationMs: 312, txHash: "0xa1b2...1001" },
        { name: "send-tx", status: "pass", durationMs: 1847, txHash: "0xa1b2...1002" },
        { name: "token approval", status: "pass", durationMs: 2103, txHash: "0xa1b2...1003" },
        { name: "contract call", status: "pass", durationMs: 1654, txHash: "0xa1b2...1004" },
        { name: "balance check", status: "pass", durationMs: 428 },
      ],
    },
    {
      id: "run-002", prNumber: 141, prTitle: "fix: session key rotation edge case", prUrl: "https://github.com/holonym-foundation/human-id/pull/141", repo: "holonym-foundation/human-id", timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(), overallStatus: "fail", passCount: 3, totalCount: 5,
      tests: [
        { name: "SIWE sign", status: "pass", durationMs: 287 },
        { name: "send-tx", status: "pass", durationMs: 1923, txHash: "0xb2c3...2001" },
        { name: "token approval", status: "pass", durationMs: 2045, txHash: "0xb2c3...2002" },
        { name: "contract call", status: "fail", durationMs: 30000, error: "Transaction timed out after 30s -- contract call to staging verifier reverted with UNPREDICTABLE_GAS_LIMIT" },
        { name: "balance check", status: "fail", durationMs: 512, error: "Balance mismatch: expected 0.0847 ETH, got 0.0842 ETH (delta 0.0005 exceeds tolerance 0.0001)" },
      ],
    },
    {
      id: "run-003", prNumber: 87, prTitle: "chore: bump waap-cli to 0.9.2", prUrl: "https://github.com/holonym-foundation/waap-docs/pull/87", repo: "holonym-foundation/waap-docs", timestamp: new Date(now - 5 * 60 * 60 * 1000).toISOString(), overallStatus: "pass", passCount: 5, totalCount: 5,
      tests: [
        { name: "SIWE sign", status: "pass", durationMs: 298, txHash: "0xc3d4...3001" },
        { name: "send-tx", status: "pass", durationMs: 1756, txHash: "0xc3d4...3002" },
        { name: "token approval", status: "pass", durationMs: 1989, txHash: "0xc3d4...3003" },
        { name: "contract call", status: "pass", durationMs: 1432, txHash: "0xc3d4...3004" },
        { name: "balance check", status: "pass", durationMs: 391 },
      ],
    },
  ];
}

export function generateTestStats(): TestStats {
  return { totalTestRuns: 6, overallPassRate: 66.7, avgTestDurationMs: 1287, mostCommonFailure: "contract call timeout (UNPREDICTABLE_GAS_LIMIT)", reposMonitored: 2, prsTestedThisWeek: 4 };
}

export function generateMonitoredRepos(): MonitoredRepo[] {
  const now = Date.now();
  return [
    { name: "human-id", fullName: "holonym-foundation/human-id", lastPrNumber: 142, lastPrTitle: "feat: add ERC-4337 bundler support", lastResult: "pass", lastTestedAt: new Date(now - 25 * 60 * 1000).toISOString(), active: true },
    { name: "waap-docs", fullName: "holonym-foundation/waap-docs", lastPrNumber: 87, lastPrTitle: "chore: bump waap-cli to 0.9.2", lastResult: "pass", lastTestedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(), active: true },
  ];
}

export function generateGasSpendHistory(): GasSpendPoint[] {
  const now = Date.now();
  const points: GasSpendPoint[] = [];
  let cumulative = 0;
  for (let i = 13; i >= 0; i--) {
    const ts = new Date(now - i * 24 * 60 * 60 * 1000).toISOString();
    cumulative += 0.15 + Math.random() * 0.35;
    points.push({ ts, gasSpendUsd: parseFloat(cumulative.toFixed(4)) });
  }
  return points;
}
