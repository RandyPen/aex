import type {
  Agent,
  BalanceSnapshot,
  AgentEvent,
  PnLData,
  ArbOpportunity,
  OpenArbPosition,
  SpreadDataPoint,
} from "./types";

/* ── Agent definition ── */

export const agents: Agent[] = [
  {
    id: "poly-arb-alpha",
    name: "Polymarket Arbitrage Agent",
    description:
      "Monitors complementary and related prediction markets on Polymarket for spread dislocations. When a spread exceeds the threshold, executes two-leg arbitrage trades via WaaP-signed orders to capture the differential.",
    email: "webmaster+poly-arb@holonym.id",
    chain: "Polygon",
    network: "mainnet",
    protocol: "Polymarket",
    walletAddress: "0x9c4d2e8f1a3b5c7d6e0f1a2b3c4d5e6f7a8b9c0d",
    status: "running",
    uptime: "9h 44m",
    lastActivity: "28s ago",
    config: {
      Strategy: "Spread arbitrage (complementary + related markets)",
      "Min spread threshold": "120 bps",
      "Max position size": "$750 per leg",
      "Leg timeout": "30s (cancel if unfilled)",
      "Scan interval": "Every 15s",
      "Daily spend limit": "$5,000",
      "Min liquidity": "$25,000 per market",
      "Max concurrent arbs": "4",
    },
    tools: [
      "@human.tech/waap-cli",
      "polymarket-clob-client",
      "spread-scanner",
    ],
  },
];

/* ── Balance history ── */

export function generateBalanceHistory(): BalanceSnapshot[] {
  const now = Date.now();
  const points: BalanceSnapshot[] = [];
  let balance = 2500.0;

  for (let i = 96; i >= 0; i--) {
    const ts = new Date(now - i * 15 * 60 * 1000).toISOString();
    // Arb agent: slow steady growth with occasional small drops
    const r = Math.random();
    if (r < 0.15) {
      balance -= Math.random() * 8; // failed arb or slippage
    } else {
      balance += Math.random() * 5; // small consistent gains
    }
    balance = Math.max(2000, balance);
    points.push({ ts, balance: parseFloat(balance.toFixed(2)) });
  }

  return points;
}

/* ── Events ── */

export function generateEvents(): AgentEvent[] {
  const now = Date.now();
  return [
    {
      ts: new Date(now - 28 * 1000).toISOString(),
      type: "arb_detected",
      level: "event",
      message: "Spread detected: 185 bps between 'BTC > $130k by Sep' YES and 'BTC > $125k by Sep' NO",
    },
    {
      ts: new Date(now - 2 * 60 * 1000).toISOString(),
      type: "arb_complete",
      level: "event",
      message: "Arb complete: captured $12.40 on Fed rate pair (both legs filled)",
      txHash: "0xarb_fed_001...",
    },
    {
      ts: new Date(now - 5 * 60 * 1000).toISOString(),
      type: "leg_filled",
      level: "info",
      message: "Leg B filled: 300 NO shares on 'Fed holds rates Jun 2026' at $0.38",
      txHash: "0xarb_fed_legb...",
    },
    {
      ts: new Date(now - 5.5 * 60 * 1000).toISOString(),
      type: "leg_filled",
      level: "info",
      message: "Leg A filled: 300 YES shares on 'Fed cuts rates Jun 2026' at $0.59",
      txHash: "0xarb_fed_lega...",
    },
    {
      ts: new Date(now - 12 * 60 * 1000).toISOString(),
      type: "arb_failed",
      level: "error",
      message: "Arb failed: Leg B timed out on 'EU AI regulation' pair. Leg A unwound at -$3.10",
    },
    {
      ts: new Date(now - 18 * 60 * 1000).toISOString(),
      type: "spread_scan",
      level: "info",
      message: "Scanned 412 market pairs, found 7 with spread > 120 bps",
    },
    {
      ts: new Date(now - 35 * 60 * 1000).toISOString(),
      type: "arb_complete",
      level: "event",
      message: "Arb complete: captured $8.75 on election polling pair",
      txHash: "0xarb_elec_001...",
    },
    {
      ts: new Date(now - 55 * 60 * 1000).toISOString(),
      type: "balance_snapshot",
      level: "info",
      message: "Wallet balance: $2,847.22 USDC",
    },
    {
      ts: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      type: "arb_complete",
      level: "event",
      message: "Arb complete: captured $22.50 on BTC price range pair",
      txHash: "0xarb_btc_001...",
    },
    {
      ts: new Date(now - 9.5 * 60 * 60 * 1000).toISOString(),
      type: "agent_start",
      level: "info",
      message: "Agent started. Mode: arbitrage, Protocol: Polymarket, Network: Polygon mainnet",
    },
  ];
}

/* ── Arb opportunities ── */

export function generateArbOpportunities(): ArbOpportunity[] {
  const now = Date.now();
  return [
    {
      id: "arb-001",
      marketA: "fed-cuts-jun-2026",
      marketAQuestion: "Will the Fed cut rates in June 2026?",
      marketB: "fed-holds-jun-2026",
      marketBQuestion: "Will the Fed hold rates in June 2026?",
      strategy: "complementary",
      spreadBps: 310,
      expectedProfit: 14.20,
      actualProfit: 12.40,
      status: "complete",
      detectedAt: new Date(now - 6 * 60 * 1000).toISOString(),
      executedAt: new Date(now - 5.5 * 60 * 1000).toISOString(),
      completedAt: new Date(now - 2 * 60 * 1000).toISOString(),
      legA: { orderId: "ord-a-001", side: "YES", amount: 300, status: "filled", fillPrice: 0.59, filledAt: new Date(now - 5.5 * 60 * 1000).toISOString() },
      legB: { orderId: "ord-b-001", side: "NO", amount: 300, status: "filled", fillPrice: 0.38, filledAt: new Date(now - 5 * 60 * 1000).toISOString() },
    },
    {
      id: "arb-002",
      marketA: "eu-ai-strict-2026",
      marketAQuestion: "Will EU pass strict AI regulations by 2026?",
      marketB: "eu-ai-framework-q3",
      marketBQuestion: "Will EU finalize AI framework by Q3 2026?",
      strategy: "related",
      spreadBps: 245,
      expectedProfit: 9.80,
      actualProfit: -3.10,
      status: "failed",
      detectedAt: new Date(now - 15 * 60 * 1000).toISOString(),
      executedAt: new Date(now - 14 * 60 * 1000).toISOString(),
      completedAt: new Date(now - 12 * 60 * 1000).toISOString(),
      legA: { orderId: "ord-a-002", side: "YES", amount: 200, status: "filled", fillPrice: 0.52, filledAt: new Date(now - 13.5 * 60 * 1000).toISOString() },
      legB: { orderId: "ord-b-002", side: "NO", amount: 200, status: "failed", fillPrice: null, filledAt: null },
    },
    {
      id: "arb-003",
      marketA: "trump-approval-55",
      marketAQuestion: "Will Trump approval exceed 55% by Jul 2026?",
      marketB: "trump-approval-50",
      marketBQuestion: "Will Trump approval exceed 50% by Jul 2026?",
      strategy: "related",
      spreadBps: 180,
      expectedProfit: 8.75,
      actualProfit: 8.75,
      status: "complete",
      detectedAt: new Date(now - 40 * 60 * 1000).toISOString(),
      executedAt: new Date(now - 38 * 60 * 1000).toISOString(),
      completedAt: new Date(now - 35 * 60 * 1000).toISOString(),
      legA: { orderId: "ord-a-003", side: "NO", amount: 250, status: "filled", fillPrice: 0.62, filledAt: new Date(now - 37 * 60 * 1000).toISOString() },
      legB: { orderId: "ord-b-003", side: "YES", amount: 250, status: "filled", fillPrice: 0.44, filledAt: new Date(now - 36 * 60 * 1000).toISOString() },
    },
    {
      id: "arb-004",
      marketA: "btc-130k-sep-2026",
      marketAQuestion: "Will BTC exceed $130k by Sep 2026?",
      marketB: "btc-125k-sep-2026",
      marketBQuestion: "Will BTC exceed $125k by Sep 2026?",
      strategy: "related",
      spreadBps: 185,
      expectedProfit: 11.50,
      actualProfit: null,
      status: "executing",
      detectedAt: new Date(now - 28 * 1000).toISOString(),
      executedAt: new Date(now - 20 * 1000).toISOString(),
      completedAt: null,
      legA: { orderId: "ord-a-004", side: "NO", amount: 350, status: "filled", fillPrice: 0.71, filledAt: new Date(now - 15 * 1000).toISOString() },
      legB: { orderId: "ord-b-004", side: "YES", amount: 350, status: "placed", fillPrice: null, filledAt: null },
    },
    {
      id: "arb-005",
      marketA: "btc-range-100-120",
      marketAQuestion: "Will BTC stay between $100k-$120k in Q3 2026?",
      marketB: "btc-above-120k-q3",
      marketBQuestion: "Will BTC exceed $120k in Q3 2026?",
      strategy: "complementary",
      spreadBps: 420,
      expectedProfit: 24.00,
      actualProfit: 22.50,
      status: "complete",
      detectedAt: new Date(now - 2.5 * 60 * 60 * 1000).toISOString(),
      executedAt: new Date(now - 2.4 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      legA: { orderId: "ord-a-005", side: "YES", amount: 400, status: "filled", fillPrice: 0.44, filledAt: new Date(now - 2.3 * 60 * 60 * 1000).toISOString() },
      legB: { orderId: "ord-b-005", side: "NO", amount: 400, status: "filled", fillPrice: 0.52, filledAt: new Date(now - 2.2 * 60 * 60 * 1000).toISOString() },
    },
    {
      id: "arb-006",
      marketA: "spacex-orbit-aug",
      marketAQuestion: "Will SpaceX achieve orbital flight by Aug 2026?",
      marketB: "spacex-orbit-2026",
      marketBQuestion: "Will SpaceX achieve orbital flight in 2026?",
      strategy: "related",
      spreadBps: 155,
      expectedProfit: 6.20,
      actualProfit: 6.20,
      status: "complete",
      detectedAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
      executedAt: new Date(now - 3.9 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(now - 3.8 * 60 * 60 * 1000).toISOString(),
      legA: { orderId: "ord-a-006", side: "YES", amount: 200, status: "filled", fillPrice: 0.68, filledAt: new Date(now - 3.85 * 60 * 60 * 1000).toISOString() },
      legB: { orderId: "ord-b-006", side: "NO", amount: 200, status: "filled", fillPrice: 0.30, filledAt: new Date(now - 3.82 * 60 * 60 * 1000).toISOString() },
    },
    {
      id: "arb-007",
      marketA: "nvidia-beat-q2",
      marketAQuestion: "Will NVIDIA beat Q2 2026 earnings?",
      marketB: "nvidia-miss-q2",
      marketBQuestion: "Will NVIDIA miss Q2 2026 earnings?",
      strategy: "complementary",
      spreadBps: 280,
      expectedProfit: 15.00,
      actualProfit: null,
      status: "detected",
      detectedAt: new Date(now - 5 * 1000).toISOString(),
      executedAt: null,
      completedAt: null,
      legA: { orderId: "ord-a-007", side: "YES", amount: 300, status: "pending", fillPrice: null, filledAt: null },
      legB: { orderId: "ord-b-007", side: "YES", amount: 300, status: "pending", fillPrice: null, filledAt: null },
    },
    {
      id: "arb-008",
      marketA: "eth-5k-2026",
      marketAQuestion: "Will ETH exceed $5k in 2026?",
      marketB: "eth-4k-q3-2026",
      marketBQuestion: "Will ETH exceed $4k by Q3 2026?",
      strategy: "related",
      spreadBps: 195,
      expectedProfit: 7.80,
      actualProfit: -5.40,
      status: "failed",
      detectedAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
      executedAt: new Date(now - 5.9 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(now - 5.7 * 60 * 60 * 1000).toISOString(),
      legA: { orderId: "ord-a-008", side: "NO", amount: 250, status: "filled", fillPrice: 0.55, filledAt: new Date(now - 5.85 * 60 * 60 * 1000).toISOString() },
      legB: { orderId: "ord-b-008", side: "YES", amount: 250, status: "cancelled", fillPrice: null, filledAt: null },
    },
  ];
}

/* ── Open positions ── */

export function generateOpenPositions(): OpenArbPosition[] {
  const now = Date.now();
  return [
    {
      id: "arb-004",
      marketA: "btc-130k-sep-2026",
      marketAQuestion: "Will BTC exceed $130k by Sep 2026?",
      marketB: "btc-125k-sep-2026",
      marketBQuestion: "Will BTC exceed $125k by Sep 2026?",
      legAStatus: "filled",
      legBStatus: "placed",
      entrySpreadBps: 185,
      currentSpreadBps: 172,
      unrealizedPnl: 4.55,
      openedAt: new Date(now - 20 * 1000).toISOString(),
    },
  ];
}

/* ── Spread history for chart ── */

export function generateSpreadHistory(): SpreadDataPoint[] {
  const now = Date.now();
  const pairs = [
    "Fed cuts / Fed holds",
    "BTC $130k / BTC $125k",
    "NVIDIA beat / miss",
    "EU AI strict / framework",
  ];
  const points: SpreadDataPoint[] = [];

  for (let i = 48; i >= 0; i--) {
    const ts = new Date(now - i * 30 * 60 * 1000).toISOString();
    for (const pair of pairs) {
      let base: number;
      if (pair.includes("Fed")) base = 280;
      else if (pair.includes("BTC")) base = 175;
      else if (pair.includes("NVIDIA")) base = 260;
      else base = 220;

      const spread = Math.max(50, base + (Math.random() - 0.5) * 160);
      points.push({ ts, pair, spreadBps: Math.round(spread) });
    }
  }

  return points;
}

/* ── PnL ── */

export function generatePnL(): PnLData {
  return {
    totalPnl: 347.22,
    totalPnlPct: 13.89,
    winRate: 75.0,
    totalTrades: 32,
    totalVolume: 18400.0,
    wins: 24,
    losses: 8,
    bestTrade: 42.50,
    worstTrade: -12.80,
    avgTradeSize: 575.0,
  };
}
