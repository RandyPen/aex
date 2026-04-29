import type { Agent, BalanceSnapshot, AgentEvent, PositionData, PerformanceData, VolatilityData, YieldScanData } from "./types";

export const agents: Agent[] = [
  {
    id: "sui-cetus-yield",
    name: "Cetus Yield Agent",
    description: "Deposits funds into a Cetus Protocol trading pool on Sui and earns a share of trading fees. Monitors the market price and automatically repositions when the price moves outside the earning zone. All transactions require two-party signing via WaaP.",
    email: "webmaster+sui-cetus-yield@holonym.id",
    chain: "Sui",
    network: "mainnet",
    protocol: "Cetus Protocol",
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
    tools: [
      "@human.tech/waap-cli",
      "@cetusprotocol/cetus-sui-clmm-sdk",
      "@mysten/sui",
    ],
  },
];

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
    {
      ts: new Date(now - 3 * 60 * 1000).toISOString(),
      type: "position_check",
      level: "info",
      message: "Position in range (drift: 42 ticks, threshold: 100)",
    },
    {
      ts: new Date(now - 8 * 60 * 1000).toISOString(),
      type: "rebalance_complete",
      level: "event",
      message: "Rebalance complete. New range: [1240, 1640]",
      txHash: "0xabc123...",
    },
    {
      ts: new Date(now - 8.5 * 60 * 1000).toISOString(),
      type: "open_position_complete",
      level: "event",
      message: "Opened position at ticks [1240, 1640]",
      txHash: "0xdef456...",
    },
    {
      ts: new Date(now - 9 * 60 * 1000).toISOString(),
      type: "remove_liquidity_complete",
      level: "event",
      message: "Removed liquidity. Collected 0.023 SUI in fees",
      txHash: "0x789abc...",
    },
    {
      ts: new Date(now - 9.5 * 60 * 1000).toISOString(),
      type: "drift_detected",
      level: "info",
      message: "Price drifted 112 ticks from center (threshold: 100)",
    },
    {
      ts: new Date(now - 35 * 60 * 1000).toISOString(),
      type: "position_check",
      level: "info",
      message: "Position in range (drift: 67 ticks, threshold: 100)",
    },
    {
      ts: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      type: "agent_start",
      level: "info",
      message: "Agent started. Pool: SUI/USDC, Network: mainnet",
    },
  ];
}

export function generatePosition(): PositionData {
  return {
    tickLower: 69420,
    tickUpper: 69840,
    currentTick: 69675,
    drift: 45,
    threshold: 100,
    rangeWidth: 420,
    inRange: true,
    timeInRangePct: 98,
    positionOpenedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    rebalanceCount: 0,
    liquidity: "28943021",
  };
}

export function generatePerformance(): PerformanceData {
  return {
    initialBalance: 4.1255,
    currentBalance: 0.8144,
    pnl: -3.3111,
    pnlPct: -80.26,
    totalGasSpent: 0.01,
    rebalanceCount: 0,
    uptimeHours: 22,
    estimatedApy: 0,
  };
}

export function generateVolatility(): VolatilityData {
  return {
    volatility: 8.3,
    volatilitySamples: 45,
    adaptiveRange: 200,
    baseRange: 200,
    recommendation: "The market is calm. The current earning zone is well-sized for steady fee income.",
  };
}

export function generateYieldScan(): YieldScanData {
  return {
    cetusTopPools: [
      { symbol: "USDC-SUI", apy: 23.5, tvl: 6116080 },
      { symbol: "HASUI-SUI", apy: 0.02, tvl: 3836171 },
      { symbol: "USDC-USDY", apy: 0.11, tvl: 3751726 },
    ],
    crossProtocol: [
      { protocol: "bluefin-spot", type: "lp", asset: "SUI-USDC", apy: 32.6, tvl: 3270836 },
      { protocol: "cetus-clmm", type: "lp", asset: "USDC-SUI", apy: 23.5, tvl: 6116080 },
      { protocol: "kai-finance", type: "lending", asset: "SUI", apy: 6.2, tvl: 3710052 },
      { protocol: "scallop-lend", type: "lending", asset: "SUI", apy: 2.9, tvl: 3359492 },
      { protocol: "navi-lending", type: "lending", asset: "HASUI", apy: 1.3, tvl: 24445021 },
    ],
    currentPool: { symbol: "SUI/USDC", protocol: "cetus-clmm", apy: 23.5, tvl: 6116080, rank: 1 },
    bestAlternative: { protocol: "bluefin-spot", type: "lp", asset: "SUI-USDC", apy: 32.6, tvl: 3270836 },
    scanTime: new Date().toISOString(),
  };
}
