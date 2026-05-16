import type {
  Agent,
  BalanceSnapshot,
  AgentEvent,
  RebalanceEvent,
  PoolPosition,
  FeeData,
  PnLData,
  DriftPoint,
} from "./types";

export const agents: Agent[] = [
  {
    id: "uni-v3-rebalancer-base",
    name: "Uniswap v3 LP Rebalancer",
    description:
      "Monitors a Uniswap v3 concentrated-liquidity ETH/USDC position on Base. When price drifts out of the configured tick range, the agent removes liquidity, collects fees, and drains assets back to the operator wallet. All transactions require two-party signing via WaaP.",
    email: "webmaster+uni-rebalancer@holonym.id",
    chain: "Base",
    network: "mainnet",
    protocol: "Uniswap v3",
    walletAddress: "0x4a2e8c1d3f5b6a7e9c0d1f2a3b4c5d6e7f8a9b0c",
    status: "running",
    uptime: "3d 7h 41m",
    lastActivity: "4 min ago",
    config: {
      Strategy: "Concentrated liquidity rebalancer",
      Pool: "ETH/USDC 0.05%",
      "Range width": "500 bps (+-2.5%)",
      "Max slippage": "200 bps (2%)",
      "Poll interval": "15 min",
      "Max deposit": "$10,000",
      "Dry run": "Off",
    },
    tools: [
      "@human.tech/waap-cli",
      "viem",
      "uniswap-v3-sdk",
    ],
  },
];

export function generateBalanceHistory(): BalanceSnapshot[] {
  const now = Date.now();
  const points: BalanceSnapshot[] = [];
  let balance = 8500.0;
  let token0 = 2.1; // ETH
  let token1 = 3200; // USDC

  for (let i = 288; i >= 0; i--) {
    const ts = new Date(now - i * 15 * 60 * 1000).toISOString();
    const ethPrice = 2500 + Math.sin(i * 0.03) * 150 + (Math.random() - 0.48) * 30;
    token0 += (Math.random() - 0.5) * 0.02;
    token1 += (Math.random() - 0.5) * 15;
    token0 = Math.max(0.5, token0);
    token1 = Math.max(500, token1);
    balance = token0 * ethPrice + token1;
    points.push({
      ts,
      balance: parseFloat(balance.toFixed(2)),
      token0Balance: parseFloat(token0.toFixed(4)),
      token1Balance: parseFloat(token1.toFixed(2)),
    });
  }

  return points;
}

export function generateEvents(): AgentEvent[] {
  const now = Date.now();
  return [
    {
      ts: new Date(now - 4 * 60 * 1000).toISOString(),
      type: "range_check",
      level: "info",
      message: "Position in range. Current tick: 202148, range: [201650, 202650]. No action needed.",
    },
    {
      ts: new Date(now - 19 * 60 * 1000).toISOString(),
      type: "range_check",
      level: "info",
      message: "Position in range. Current tick: 202105, range: [201650, 202650].",
    },
    {
      ts: new Date(now - 2.5 * 60 * 60 * 1000).toISOString(),
      type: "rebalance_complete",
      level: "event",
      message: "Rebalanced position. Drained liquidity from [201200, 202200] and collected fees. Tokens sent to operator wallet.",
      txHash: "0xabc123def456789012345678901234567890abcdef01",
    },
    {
      ts: new Date(now - 2.6 * 60 * 60 * 1000).toISOString(),
      type: "out_of_range",
      level: "warn",
      message: "Position out of range! Current tick 202310 above upper tick 202200. Triggering rebalance.",
    },
    {
      ts: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      type: "fee_collection",
      level: "event",
      message: "Collected 0.0031 ETH + 7.82 USDC in accrued swap fees.",
      txHash: "0xfee789012345678901234567890123456789abcdef02",
    },
    {
      ts: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
      type: "balance_snapshot",
      level: "info",
      message: "Portfolio: 2.14 ETH ($5,350.00) + 3,187.50 USDC. Total: $8,537.50",
    },
    {
      ts: new Date(now - 18 * 60 * 60 * 1000).toISOString(),
      type: "rebalance_complete",
      level: "event",
      message: "Rebalanced position. New range centered on tick 201925. Drained from [201400, 202400].",
      txHash: "0x456def789012345678901234567890abcdef0123ab03",
    },
    {
      ts: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      type: "agent_start",
      level: "info",
      message: "Agent started. Protocol: Uniswap v3, Chain: Base, Pool: ETH/USDC 0.05%",
    },
  ];
}

export function generateRebalanceHistory(): RebalanceEvent[] {
  const now = Date.now();
  return [
    {
      ts: new Date(now - 2.5 * 60 * 60 * 1000).toISOString(),
      oldTickLower: 201200,
      oldTickUpper: 202200,
      newTickLower: 201650,
      newTickUpper: 202650,
      triggerReason: "out_of_range_above",
      gasCostEth: 0.00082,
      gasCostUsd: 2.05,
      token0Recovered: 2.14,
      token1Recovered: 3187.5,
      txHash: "0xabc123def456789012345678901234567890abcdef01",
    },
    {
      ts: new Date(now - 18 * 60 * 60 * 1000).toISOString(),
      oldTickLower: 201400,
      oldTickUpper: 202400,
      newTickLower: 201200,
      newTickUpper: 202200,
      triggerReason: "out_of_range_below",
      gasCostEth: 0.00091,
      gasCostUsd: 2.28,
      token0Recovered: 2.08,
      token1Recovered: 3310.0,
      txHash: "0x456def789012345678901234567890abcdef0123ab03",
    },
    {
      ts: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      oldTickLower: 200800,
      oldTickUpper: 201800,
      newTickLower: 201400,
      newTickUpper: 202400,
      triggerReason: "out_of_range_above",
      gasCostEth: 0.00078,
      gasCostUsd: 1.95,
      token0Recovered: 1.95,
      token1Recovered: 3520.0,
      txHash: "0x789abc012345678901234567890123456789def456ab",
    },
    {
      ts: new Date(now - 2.8 * 24 * 60 * 60 * 1000).toISOString(),
      oldTickLower: 200200,
      oldTickUpper: 201200,
      newTickLower: 200800,
      newTickUpper: 201800,
      triggerReason: "out_of_range_above",
      gasCostEth: 0.00085,
      gasCostUsd: 2.13,
      token0Recovered: 1.88,
      token1Recovered: 3650.0,
      txHash: "0xdef456789012345678901234567890abcdef012345cd",
    },
  ];
}

export function generatePoolPosition(): PoolPosition {
  return {
    tokenId: "847291",
    pool: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640",
    token0Symbol: "ETH",
    token1Symbol: "USDC",
    fee: 500,
    tickLower: 201650,
    tickUpper: 202650,
    currentTick: 202148,
    inRange: true,
    liquidity: "4892710384571028",
    token0Amount: 2.14,
    token1Amount: 3187.5,
    token0ValueUsd: 5350.0,
    token1ValueUsd: 3187.5,
    totalValueUsd: 8537.5,
    priceLower: 2385.2,
    priceUpper: 2625.8,
    currentPrice: 2500.0,
  };
}

export function generateFeeData(): FeeData {
  return {
    totalFeesToken0: 0.0247,
    totalFeesToken1: 62.35,
    totalFeesUsd: 124.1,
    fees24hToken0: 0.0031,
    fees24hToken1: 7.82,
    fees24hUsd: 15.57,
    feeApyEstimate: 22.4,
    feesCollectedCount: 7,
  };
}

export function generatePnL(): PnLData {
  return {
    totalPnl: 124.1,
    totalPnlPct: 1.48,
    winRate: 75.0,
    totalTrades: 8,
    totalVolume: 68300.0,
    wins: 6,
    losses: 2,
    bestTrade: 42.5,
    worstTrade: -8.73,
    avgTradeSize: 8537.5,
  };
}

export function generateDriftHistory(): DriftPoint[] {
  const now = Date.now();
  const points: DriftPoint[] = [];
  const rangeCenterTick = 202150;

  for (let i = 288; i >= 0; i--) {
    const ts = new Date(now - i * 15 * 60 * 1000).toISOString();
    const drift = Math.sin(i * 0.025) * 350 + (Math.random() - 0.5) * 80;
    const currentTick = rangeCenterTick + Math.round(drift);
    const driftBps = Math.round(drift);
    const price = 2500 * Math.pow(1.0001, currentTick - rangeCenterTick);

    points.push({
      ts,
      currentTick,
      rangeCenterTick,
      driftBps,
      price: parseFloat(price.toFixed(2)),
    });
  }

  return points;
}
