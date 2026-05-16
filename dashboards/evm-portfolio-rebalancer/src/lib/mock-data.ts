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
    id: "evm-portfolio-rebalancer-base",
    name: "EVM Portfolio Rebalancer",
    description:
      "Monitors ETH/USDC portfolio allocation on Base. When ETH price crosses configured thresholds, the agent swaps to maintain target allocation. All transactions require two-party signing via WaaP.",
    email: "webmaster+evm-rebalancer@holonym.id",
    chain: "Base",
    network: "mainnet",
    protocol: "Portfolio Rebalancer",
    walletAddress: "0x7b3e2f1a9c4d8e5f0b6a7c8d9e1f2a3b4c5d6e7f",
    status: "running",
    uptime: "5d 12h 18m",
    lastActivity: "2 min ago",
    config: {
      Strategy: "Threshold-based portfolio rebalancer",
      Pair: "ETH / USDC",
      "Target allocation": "50% ETH / 50% USDC",
      "High threshold": "$2,700",
      "Low threshold": "$2,300",
      "Poll interval": "5 min",
      "Max slippage": "50 bps (0.5%)",
      "Dry run": "Off",
    },
    tools: [
      "@human.tech/waap-cli",
      "viem",
    ],
  },
];

export function generatePriceHistory(): PricePoint[] {
  const now = Date.now();
  const points: PricePoint[] = [];

  for (let i = 288; i >= 0; i--) {
    const ts = new Date(now - i * 15 * 60 * 1000).toISOString();
    const price = 2520 + Math.sin(i * 0.02) * 180 + (Math.random() - 0.48) * 25;
    points.push({
      ts,
      price: parseFloat(price.toFixed(2)),
    });
  }

  return points;
}

export function generateBalanceHistory(): BalanceSnapshot[] {
  const now = Date.now();
  const points: BalanceSnapshot[] = [];
  let ethBalance = 0.198;
  let usdcBalance = 502.0;

  for (let i = 288; i >= 0; i--) {
    const ts = new Date(now - i * 15 * 60 * 1000).toISOString();
    const ethPrice = 2520 + Math.sin(i * 0.02) * 180 + (Math.random() - 0.48) * 25;
    ethBalance += (Math.random() - 0.5) * 0.001;
    usdcBalance += (Math.random() - 0.5) * 2;
    ethBalance = Math.max(0.05, ethBalance);
    usdcBalance = Math.max(100, usdcBalance);
    const balance = ethBalance * ethPrice + usdcBalance;
    points.push({
      ts,
      balance: parseFloat(balance.toFixed(2)),
      targetTokenBalance: parseFloat(ethBalance.toFixed(6)),
      stableBalance: parseFloat(usdcBalance.toFixed(2)),
    });
  }

  return points;
}

export function generateEvents(): AgentEvent[] {
  const now = Date.now();
  return [
    {
      ts: new Date(now - 2 * 60 * 1000).toISOString(),
      type: "price_check",
      level: "info",
      message: "Price check: ETH at $2,520.00. Within thresholds ($2,300–$2,700). Holding.",
    },
    {
      ts: new Date(now - 7 * 60 * 1000).toISOString(),
      type: "price_check",
      level: "info",
      message: "Price check: ETH at $2,518.40. Within thresholds. No action needed.",
    },
    {
      ts: new Date(now - 3.2 * 60 * 60 * 1000).toISOString(),
      type: "rebalance_complete",
      level: "event",
      message: "Rebalance complete: SELL 0.012 ETH at $2,715.30. Portfolio re-centered to 50/50.",
      txHash: "0xabc123def456789012345678901234567890abcdef01",
    },
    {
      ts: new Date(now - 3.3 * 60 * 60 * 1000).toISOString(),
      type: "threshold_breach",
      level: "warn",
      message: "High threshold breached: ETH at $2,715.30 > $2,700. Triggering sell rebalance.",
    },
    {
      ts: new Date(now - 18 * 60 * 60 * 1000).toISOString(),
      type: "rebalance_complete",
      level: "event",
      message: "Rebalance complete: BUY 0.018 ETH at $2,285.10. Portfolio re-centered to 50/50.",
      txHash: "0x456def789012345678901234567890abcdef0123ab03",
    },
    {
      ts: new Date(now - 18.1 * 60 * 60 * 1000).toISOString(),
      type: "threshold_breach",
      level: "warn",
      message: "Low threshold breached: ETH at $2,285.10 < $2,300. Triggering buy rebalance.",
    },
    {
      ts: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      type: "rebalance_complete",
      level: "event",
      message: "Rebalance complete: SELL 0.009 ETH at $2,722.80. Portfolio re-centered.",
      txHash: "0x789abc012345678901234567890123456789def456ab",
    },
    {
      ts: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      type: "agent_start",
      level: "info",
      message: "Agent started. Strategy: Portfolio Rebalancer, Chain: Base, Pair: ETH/USDC",
    },
  ];
}

export function generateRebalanceHistory(): RebalanceEvent[] {
  const now = Date.now();
  return [
    {
      ts: new Date(now - 3.2 * 60 * 60 * 1000).toISOString(),
      direction: "SELL",
      triggerPrice: 2715.30,
      amountSwapped: 0.012,
      amountSwappedSymbol: "ETH",
      usdValue: 32.58,
      gasCost: 0.85,
      gasCostNative: 0.00034,
      gasCostSymbol: "ETH",
      txHash: "0xabc123def456789012345678901234567890abcdef01",
    },
    {
      ts: new Date(now - 18 * 60 * 60 * 1000).toISOString(),
      direction: "BUY",
      triggerPrice: 2285.10,
      amountSwapped: 0.018,
      amountSwappedSymbol: "ETH",
      usdValue: 41.13,
      gasCost: 0.92,
      gasCostNative: 0.00040,
      gasCostSymbol: "ETH",
      txHash: "0x456def789012345678901234567890abcdef0123ab03",
    },
    {
      ts: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      direction: "SELL",
      triggerPrice: 2722.80,
      amountSwapped: 0.009,
      amountSwappedSymbol: "ETH",
      usdValue: 24.51,
      gasCost: 0.78,
      gasCostNative: 0.00029,
      gasCostSymbol: "ETH",
      txHash: "0x789abc012345678901234567890123456789def456ab",
    },
  ];
}

export function generateAllocationState(): AllocationState {
  const currentPrice = 2520.0;
  const targetTokenBalance = 0.198;
  const stableBalance = 502.0;
  const targetTokenValueUsd = targetTokenBalance * currentPrice;
  const totalValueUsd = targetTokenValueUsd + stableBalance;
  const currentAllocationPct = (targetTokenValueUsd / totalValueUsd) * 100;
  const targetAllocationPct = 50;
  const deviationPct = currentAllocationPct - targetAllocationPct;

  return {
    targetToken: "ETH",
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
    currentPrice: 2520.0,
    highThreshold: 2700,
    lowThreshold: 2300,
    zone: "hold",
    targetToken: "ETH",
    stableToken: "USDC",
  };
}

export function generatePnL(): PnLData {
  return {
    totalPnl: 18.42,
    totalPnlPct: 1.84,
    winRate: 66.7,
    totalTrades: 3,
    totalVolume: 98.22,
    wins: 2,
    losses: 1,
    bestTrade: 12.30,
    worstTrade: -3.15,
    avgTradeSize: 32.74,
  };
}
