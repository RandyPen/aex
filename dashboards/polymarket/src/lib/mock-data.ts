import type { Agent, BalanceSnapshot, AgentEvent, TradeEvent, PositionData, PnLData, MarketData } from "./types";

export const agents: Agent[] = [
  {
    id: "poly-trading-alpha",
    name: "Polymarket Trading Agent",
    description: "Scans prediction markets on Polymarket for mispriced outcomes, places trades on high-conviction signals, and manages positions with automated stop-losses. All transactions require two-party signing via WaaP.",
    email: "webmaster+poly-trading@holonym.id",
    chain: "Polygon",
    network: "mainnet",
    protocol: "Polymarket",
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
      "Min liquidity": "$50,000",
      "Min edge threshold": "5%",
    },
    tools: [
      "@human.tech/waap-cli",
      "polymarket-clob-client",
      "@polygonio/client",
    ],
  },
];

export function generateBalanceHistory(): BalanceSnapshot[] {
  const now = Date.now();
  const points: BalanceSnapshot[] = [];
  let balance = 1000.0;

  for (let i = 96; i >= 0; i--) {
    const ts = new Date(now - i * 15 * 60 * 1000).toISOString();
    balance += (Math.random() - 0.42) * 12;
    balance = Math.max(100, balance);
    points.push({ ts, balance: parseFloat(balance.toFixed(2)) });
  }

  return points;
}

export function generateEvents(): AgentEvent[] {
  const now = Date.now();
  return [
    {
      ts: new Date(now - 1 * 60 * 1000).toISOString(),
      type: "trade_filled",
      level: "event",
      message: "Bought 200 YES shares on 'Will BTC exceed $120k by July 2026?' at $0.42",
      txHash: "0xpoly_abc123...",
    },
    {
      ts: new Date(now - 4 * 60 * 1000).toISOString(),
      type: "market_scan",
      level: "info",
      message: "Scanned 847 markets, found 3 with edge > 5%",
    },
    {
      ts: new Date(now - 12 * 60 * 1000).toISOString(),
      type: "trade_filled",
      level: "event",
      message: "Sold 150 NO shares on 'Will Fed cut rates in June 2026?' at $0.61",
      txHash: "0xpoly_def456...",
    },
    {
      ts: new Date(now - 18 * 60 * 1000).toISOString(),
      type: "position_closed",
      level: "event",
      message: "Closed position: 'Will EU pass AI Act amendments by Q3?' -- profit +$34.20",
      txHash: "0xpoly_ghi789...",
    },
    {
      ts: new Date(now - 25 * 60 * 1000).toISOString(),
      type: "stop_loss",
      level: "warn",
      message: "Stop-loss triggered on 'Will Apple launch AR glasses in 2026?' at -15.2%",
      txHash: "0xpoly_jkl012...",
    },
    {
      ts: new Date(now - 45 * 60 * 1000).toISOString(),
      type: "balance_snapshot",
      level: "info",
      message: "Wallet balance: $1,247.83 USDC",
    },
    {
      ts: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      type: "market_scan",
      level: "info",
      message: "Scanned 831 markets, found 5 with edge > 5%",
    },
    {
      ts: new Date(now - 14 * 60 * 60 * 1000).toISOString(),
      type: "agent_start",
      level: "info",
      message: "Agent started. Protocol: Polymarket, Network: Polygon mainnet",
    },
  ];
}

export function generateTrades(): TradeEvent[] {
  const now = Date.now();
  return [
    {
      ts: new Date(now - 1 * 60 * 1000).toISOString(),
      marketId: "btc-120k-july-2026",
      marketQuestion: "Will BTC exceed $120k by July 2026?",
      side: "YES",
      amount: 200,
      price: 0.42,
      status: "filled",
      txHash: "0xpoly_abc123...",
    },
    {
      ts: new Date(now - 12 * 60 * 1000).toISOString(),
      marketId: "fed-cut-june-2026",
      marketQuestion: "Will the Fed cut rates in June 2026?",
      side: "NO",
      amount: 150,
      price: 0.61,
      status: "filled",
      txHash: "0xpoly_def456...",
    },
    {
      ts: new Date(now - 18 * 60 * 1000).toISOString(),
      marketId: "eu-ai-act-q3",
      marketQuestion: "Will EU pass AI Act amendments by Q3 2026?",
      side: "YES",
      amount: 100,
      price: 0.72,
      status: "filled",
      txHash: "0xpoly_ghi789...",
    },
    {
      ts: new Date(now - 25 * 60 * 1000).toISOString(),
      marketId: "apple-ar-2026",
      marketQuestion: "Will Apple launch AR glasses in 2026?",
      side: "YES",
      amount: 175,
      price: 0.33,
      status: "filled",
      txHash: "0xpoly_jkl012...",
    },
    {
      ts: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      marketId: "eth-merge-upgrade-q2",
      marketQuestion: "Will Ethereum complete Pectra upgrade by Q2 2026?",
      side: "YES",
      amount: 300,
      price: 0.78,
      status: "filled",
      txHash: "0xpoly_mno345...",
    },
    {
      ts: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      marketId: "trump-pardon-count",
      marketQuestion: "Will Trump issue > 50 pardons by end of 2026?",
      side: "NO",
      amount: 250,
      price: 0.55,
      status: "filled",
      txHash: "0xpoly_pqr678...",
    },
    {
      ts: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
      marketId: "spacex-starship-orbit",
      marketQuestion: "Will SpaceX achieve Starship orbital flight by August 2026?",
      side: "YES",
      amount: 400,
      price: 0.65,
      status: "filled",
      txHash: "0xpoly_stu901...",
    },
  ];
}

export function generatePositions(): PositionData[] {
  return [
    {
      marketId: "btc-120k-july-2026",
      marketQuestion: "Will BTC exceed $120k by July 2026?",
      side: "YES",
      amount: 200,
      avgPrice: 0.42,
      currentPrice: 0.47,
      pnl: 10.0,
      pnlPct: 11.9,
    },
    {
      marketId: "fed-cut-june-2026",
      marketQuestion: "Will the Fed cut rates in June 2026?",
      side: "NO",
      amount: 150,
      avgPrice: 0.61,
      currentPrice: 0.58,
      pnl: 4.5,
      pnlPct: 4.92,
    },
    {
      marketId: "spacex-starship-orbit",
      marketQuestion: "Will SpaceX achieve Starship orbital flight by August 2026?",
      side: "YES",
      amount: 400,
      avgPrice: 0.65,
      currentPrice: 0.71,
      pnl: 24.0,
      pnlPct: 9.23,
    },
    {
      marketId: "eth-merge-upgrade-q2",
      marketQuestion: "Will Ethereum complete Pectra upgrade by Q2 2026?",
      side: "YES",
      amount: 300,
      avgPrice: 0.78,
      currentPrice: 0.82,
      pnl: 12.0,
      pnlPct: 5.13,
    },
  ];
}

export function generatePnL(): PnLData {
  return {
    totalPnl: 247.83,
    totalPnlPct: 24.78,
    winRate: 68.4,
    totalTrades: 57,
    totalVolume: 14250.0,
    wins: 39,
    losses: 18,
    bestTrade: 186.50,
    worstTrade: -87.25,
    avgTradeSize: 250.0,
  };
}

export function generateWatchedMarkets(): MarketData[] {
  return [
    {
      marketId: "nvidia-earnings-beat",
      question: "Will NVIDIA beat Q2 2026 earnings estimates?",
      category: "Finance",
      volume24h: 2450000,
      liquidity: 890000,
      endDate: "2026-08-15",
      yesPrice: 0.72,
      noPrice: 0.28,
      watchReason: "High volume spike + sentiment divergence detected",
    },
    {
      marketId: "us-recession-2026",
      question: "Will the US enter recession in 2026?",
      category: "Economics",
      volume24h: 1830000,
      liquidity: 1250000,
      endDate: "2026-12-31",
      yesPrice: 0.23,
      noPrice: 0.77,
      watchReason: "Edge: model predicts 31% vs market 23%",
    },
    {
      marketId: "openai-ipo-2026",
      question: "Will OpenAI IPO in 2026?",
      category: "Tech",
      volume24h: 980000,
      liquidity: 520000,
      endDate: "2026-12-31",
      yesPrice: 0.41,
      noPrice: 0.59,
      watchReason: "Recent news catalyst + price momentum",
    },
    {
      marketId: "world-cup-host-2034",
      question: "Will FIFA confirm Saudi Arabia as 2034 World Cup host?",
      category: "Sports",
      volume24h: 670000,
      liquidity: 340000,
      endDate: "2026-07-01",
      yesPrice: 0.94,
      noPrice: 0.06,
      watchReason: "Near-certain resolution, monitoring for arb",
    },
    {
      marketId: "btc-200k-2026",
      question: "Will Bitcoin reach $200k in 2026?",
      category: "Crypto",
      volume24h: 3200000,
      liquidity: 1890000,
      endDate: "2026-12-31",
      yesPrice: 0.12,
      noPrice: 0.88,
      watchReason: "Tail event monitor -- high payout if triggered",
    },
  ];
}
