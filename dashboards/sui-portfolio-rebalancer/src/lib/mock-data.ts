import type {
  Agent,
  BalanceSnapshot,
  AgentEvent,
  RebalanceEvent,
  AllocationState,
  ThresholdState,
  PricePoint,
  PnLData,
} from "./types";

export const agents: Agent[] = [
  {
    id: "sui-portfolio-rebalancer",
    name: "Sui Portfolio Rebalancer",
    description:
      "Monitors SUI/USDC portfolio allocation on Sui mainnet. When SUI price crosses configured thresholds, the agent swaps to maintain target allocation. All transactions require two-party signing via WaaP.",
    email: "webmaster+sui-rebalancer@holonym.id",
    chain: "Sui",
    network: "mainnet",
    protocol: "Portfolio Rebalancer",
    walletAddress: "0x8f4a2b1c3d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a",
    status: "running",
    uptime: "2d 9h 33m",
    lastActivity: "3 min ago",
    config: {
      Strategy: "Threshold-based portfolio rebalancer",
      Pair: "SUI / USDC",
      "Target allocation": "50% SUI / 50% USDC",
      "High threshold": "$4.50",
      "Low threshold": "$3.50",
      "Poll interval": "5 min",
      "Max slippage": "50 bps (0.5%)",
      "Dry run": "Off",
    },
    tools: [
      "@human.tech/waap-cli",
      "@mysten/sui",
    ],
  },
];

export function generatePriceHistory(): PricePoint[] {
  const now = Date.now();
  const points: PricePoint[] = [];

  for (let i = 288; i >= 0; i--) {
    const ts = new Date(now - i * 15 * 60 * 1000).toISOString();
    const price = 3.95 + Math.sin(i * 0.025) * 0.45 + (Math.random() - 0.48) * 0.06;
    points.push({
      ts,
      price: parseFloat(price.toFixed(4)),
    });
  }

  return points;
}

export function generateBalanceHistory(): BalanceSnapshot[] {
  const now = Date.now();
  const points: BalanceSnapshot[] = [];
  let suiBalance = 63.3;
  let usdcBalance = 250.0;

  for (let i = 288; i >= 0; i--) {
    const ts = new Date(now - i * 15 * 60 * 1000).toISOString();
    const suiPrice = 3.95 + Math.sin(i * 0.025) * 0.45 + (Math.random() - 0.48) * 0.06;
    suiBalance += (Math.random() - 0.5) * 0.3;
    usdcBalance += (Math.random() - 0.5) * 1.5;
    suiBalance = Math.max(20, suiBalance);
    usdcBalance = Math.max(50, usdcBalance);
    const balance = suiBalance * suiPrice + usdcBalance;
    points.push({
      ts,
      balance: parseFloat(balance.toFixed(2)),
      targetTokenBalance: parseFloat(suiBalance.toFixed(2)),
      stableBalance: parseFloat(usdcBalance.toFixed(2)),
    });
  }

  return points;
}

export function generateEvents(): AgentEvent[] {
  const now = Date.now();
  return [
    {
      ts: new Date(now - 3 * 60 * 1000).toISOString(),
      type: "price_check",
      level: "info",
      message: "Price check: SUI at $3.9500. Within thresholds ($3.50–$4.50). Holding.",
    },
    {
      ts: new Date(now - 8 * 60 * 1000).toISOString(),
      type: "price_check",
      level: "info",
      message: "Price check: SUI at $3.9480. Within thresholds. No action needed.",
    },
    {
      ts: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
      type: "rebalance_complete",
      level: "event",
      message: "Rebalance complete: SELL 8.2 SUI at $4.5200. Portfolio re-centered to 50/50.",
      txHash: "0xsui_abc123def456789012345678901234567890abcdef01",
    },
    {
      ts: new Date(now - 6.1 * 60 * 60 * 1000).toISOString(),
      type: "threshold_breach",
      level: "warn",
      message: "High threshold breached: SUI at $4.5200 > $4.50. Triggering sell rebalance.",
    },
    {
      ts: new Date(now - 36 * 60 * 60 * 1000).toISOString(),
      type: "rebalance_complete",
      level: "event",
      message: "Rebalance complete: BUY 10.5 SUI at $3.4800. Portfolio re-centered to 50/50.",
      txHash: "0xsui_456def789012345678901234567890abcdef0123ab03",
    },
    {
      ts: new Date(now - 36.1 * 60 * 60 * 1000).toISOString(),
      type: "threshold_breach",
      level: "warn",
      message: "Low threshold breached: SUI at $3.4800 < $3.50. Triggering buy rebalance.",
    },
    {
      ts: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      type: "agent_start",
      level: "info",
      message: "Agent started. Strategy: Portfolio Rebalancer, Chain: Sui, Pair: SUI/USDC",
    },
  ];
}

export function generateRebalanceHistory(): RebalanceEvent[] {
  const now = Date.now();
  return [
    {
      ts: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
      direction: "SELL",
      triggerPrice: 4.52,
      amountSwapped: 8.2,
      amountSwappedSymbol: "SUI",
      usdValue: 37.06,
      gasCost: 0.02,
      gasCostNative: 0.005,
      gasCostSymbol: "SUI",
      txHash: "0xsui_abc123def456789012345678901234567890abcdef01",
    },
    {
      ts: new Date(now - 36 * 60 * 60 * 1000).toISOString(),
      direction: "BUY",
      triggerPrice: 3.48,
      amountSwapped: 10.5,
      amountSwappedSymbol: "SUI",
      usdValue: 36.54,
      gasCost: 0.02,
      gasCostNative: 0.005,
      gasCostSymbol: "SUI",
      txHash: "0xsui_456def789012345678901234567890abcdef0123ab03",
    },
  ];
}

export function generateAllocationState(): AllocationState {
  const currentPrice = 3.95;
  const targetTokenBalance = 63.3;
  const stableBalance = 250.0;
  const targetTokenValueUsd = targetTokenBalance * currentPrice;
  const totalValueUsd = targetTokenValueUsd + stableBalance;
  const currentAllocationPct = (targetTokenValueUsd / totalValueUsd) * 100;
  const targetAllocationPct = 50;
  const deviationPct = currentAllocationPct - targetAllocationPct;

  return {
    targetToken: "SUI",
    stableToken: "USDC",
    currentPrice,
    targetTokenBalance,
    stableBalance,
    targetTokenValueUsd: parseFloat(targetTokenValueUsd.toFixed(2)),
    stableValueUsd: stableBalance,
    totalValueUsd: parseFloat(totalValueUsd.toFixed(2)),
    targetAllocationPct,
    currentAllocationPct: parseFloat(currentAllocationPct.toFixed(1)),
    deviationPct: parseFloat(deviationPct.toFixed(1)),
  };
}

export function generateThresholdState(): ThresholdState {
  return {
    currentPrice: 3.95,
    highThreshold: 4.50,
    lowThreshold: 3.50,
    zone: "hold",
    targetToken: "SUI",
    stableToken: "USDC",
  };
}

export function generatePnL(): PnLData {
  return {
    totalPnl: 8.76,
    totalPnlPct: 1.75,
    winRate: 50.0,
    totalTrades: 2,
    totalVolume: 73.60,
    wins: 1,
    losses: 1,
    bestTrade: 6.20,
    worstTrade: -2.10,
    avgTradeSize: 36.80,
  };
}
