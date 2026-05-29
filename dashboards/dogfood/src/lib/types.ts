/* ═══════════════════════════════════════════════════════════
   Unified types for all agent dashboards
   ═══════════════════════════════════════════════════════════ */

/* ── Shared across all agents ── */

export interface Agent {
  id: string;
  name: string;
  description: string;
  email: string;
  chain: string;
  network: string;
  protocol: string;
  category?: string;
  walletAddress: string;
  status: "running" | "stopped" | "error";
  uptime: string;
  lastActivity: string;
  config: Record<string, string>;
  tools: string[];
}

export interface BalanceSnapshot {
  ts: string;
  balance: number;
  usdcBalance?: number;
  token0Balance?: number;
  token1Balance?: number;
  targetTokenBalance?: number;
  stableBalance?: number;
}

export interface AgentEvent {
  ts: string;
  type: string;
  level: "info" | "event" | "error" | "warn";
  message: string;
  data?: Record<string, unknown>;
  txHash?: string;
}

/* ── Cetus / Morpho yield types ── */

export interface PositionData {
  tickLower: number;
  tickUpper: number;
  currentTick: number;
  drift: number;
  threshold: number;
  rangeWidth: number;
  inRange: boolean;
  timeInRangePct: number;
  positionOpenedAt: string | null;
  rebalanceCount: number;
  liquidity: string;
}

export interface PerformanceData {
  initialBalance: number;
  currentBalance: number;
  pnl: number;
  pnlPct: number;
  totalGasSpent: number;
  rebalanceCount: number;
  uptimeHours: number;
  estimatedApy: number;
}

export interface VolatilityData {
  volatility: number;
  volatilitySamples: number;
  adaptiveRange: number;
  baseRange: number;
  recommendation: string;
}

export interface PoolYield {
  symbol: string;
  apy: number;
  tvl: number;
  pool?: string;
}

export interface CrossProtocolYield {
  protocol: string;
  type: "lending" | "lp";
  asset: string;
  apy: number;
  tvl: number;
}

export interface YieldScanData {
  cetusTopPools: PoolYield[];
  crossProtocol: CrossProtocolYield[];
  currentPool: {
    symbol: string;
    protocol: string;
    apy: number | null;
    tvl: number | null;
    rank: number | null;
  };
  bestAlternative: CrossProtocolYield | null;
  scanTime: string;
}

/* ── Polymarket trading types ── */

export interface TradeEvent {
  ts: string;
  marketId: string;
  marketQuestion: string;
  side: "YES" | "NO";
  amount: number;
  price: number;
  status: "filled" | "pending" | "cancelled" | "partial";
  txHash?: string;
}

/** Polymarket position — renamed to avoid conflict with Cetus PositionData */
export interface PMPositionData {
  marketId: string;
  marketQuestion: string;
  side: "YES" | "NO";
  amount: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
}

export interface PnLData {
  totalPnl: number;
  totalPnlPct: number;
  winRate: number;
  totalTrades: number;
  totalVolume: number;
  wins: number;
  losses: number;
  bestTrade: number;
  worstTrade: number;
  avgTradeSize: number;
}

export interface MarketData {
  marketId: string;
  question: string;
  category: string;
  volume24h: number;
  liquidity: number;
  endDate: string;
  yesPrice: number;
  noPrice: number;
  watchReason: string;
}

/* ── Polymarket LLM analyst types ── */

export interface AnalysisEvent {
  ts: string;
  marketId: string;
  marketQuestion: string;
  side: "YES" | "NO";
  confidence: number;
  reasoning: string;
  traded: boolean;
  llmProvider?: string;
  llmModel?: string;
  promptTokens?: number;
  completionTokens?: number;
  costEstimate?: number;
}

export interface LLMStatsData {
  totalAnalyses: number;
  tradesPlaced: number;
  tradesSkipped: number;
  avgConfidence: number;
  winRateOnTrades: number;
  llmProvider: string;
  llmModel: string;
  totalLLMCost: number;
  confidenceThreshold: number;
}

/* ── Polymarket arbitrage types ── */

export type ArbStrategy = "complementary" | "related";
export type ArbStatus = "detected" | "executing" | "complete" | "failed";
export type LegStatus = "pending" | "placed" | "partial" | "filled" | "failed" | "cancelled";

export interface ArbLeg {
  orderId: string;
  side: "YES" | "NO";
  amount: number;
  status: LegStatus;
  fillPrice: number | null;
  filledAt: string | null;
}

export interface ArbOpportunity {
  id: string;
  marketA: string;
  marketAQuestion: string;
  marketB: string;
  marketBQuestion: string;
  strategy: ArbStrategy;
  spreadBps: number;
  expectedProfit: number;
  actualProfit: number | null;
  status: ArbStatus;
  detectedAt: string;
  executedAt: string | null;
  completedAt: string | null;
  legA: ArbLeg;
  legB: ArbLeg;
}

export interface OpenArbPosition {
  id: string;
  marketA: string;
  marketAQuestion: string;
  marketB: string;
  marketBQuestion: string;
  legAStatus: LegStatus;
  legBStatus: LegStatus;
  entrySpreadBps: number;
  currentSpreadBps: number;
  unrealizedPnl: number;
  openedAt: string;
}

export interface SpreadDataPoint {
  ts: string;
  pair: string;
  spreadBps: number;
}

/* ── Uniswap rebalancer types ── */

export interface UniRebalanceEvent {
  ts: string;
  oldTickLower: number;
  oldTickUpper: number;
  newTickLower: number;
  newTickUpper: number;
  triggerReason: "out_of_range_above" | "out_of_range_below" | "manual";
  gasCostEth: number;
  gasCostUsd: number;
  token0Recovered: number;
  token1Recovered: number;
  txHash?: string;
}

export interface PoolPosition {
  tokenId: string;
  pool: string;
  token0Symbol: string;
  token1Symbol: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  currentTick: number;
  inRange: boolean;
  liquidity: string;
  token0Amount: number;
  token1Amount: number;
  token0ValueUsd: number;
  token1ValueUsd: number;
  totalValueUsd: number;
  priceLower: number;
  priceUpper: number;
  currentPrice: number;
}

export interface FeeData {
  totalFeesToken0: number;
  totalFeesToken1: number;
  totalFeesUsd: number;
  fees24hToken0: number;
  fees24hToken1: number;
  fees24hUsd: number;
  feeApyEstimate: number;
  feesCollectedCount: number;
}

export interface DriftPoint {
  ts: string;
  currentTick: number;
  rangeCenterTick: number;
  driftBps: number;
  price: number;
}

/* ── EVM / Sui portfolio rebalancer types ── */

export interface GridRebalanceEvent {
  ts: string;
  direction: "BUY" | "SELL";
  triggerPrice: number;
  amountSwapped: number;
  amountSwappedSymbol: string;
  usdValue: number;
  gasCost: number;
  gasCostNative: number;
  gasCostSymbol: string;
  txHash?: string;
}

export interface AllocationState {
  targetToken: string;
  stableToken: string;
  currentPrice: number;
  targetTokenBalance: number;
  stableBalance: number;
  targetTokenValueUsd: number;
  stableValueUsd: number;
  totalValueUsd: number;
  targetAllocationPct: number;
  currentAllocationPct: number;
  deviationPct: number;
}

export interface ThresholdState {
  currentPrice: number;
  highThreshold: number;
  lowThreshold: number;
  zone: "hold" | "sell_zone" | "buy_zone";
  targetToken: string;
  stableToken: string;
}

export interface PricePoint {
  ts: string;
  price: number;
}

/* ── Snapshot governance types ── */

export interface VoteEvent {
  ts: string;
  proposalId: string;
  proposalTitle: string;
  spaceName: string;
  choice: "For" | "Against" | "Abstain";
  votingPower: number;
  proposalStatus: "active" | "closed" | "passed" | "failed";
  txHash?: string;
}

export interface Proposal {
  proposalId: string;
  title: string;
  spaceName: string;
  status: "active" | "closed" | "passed" | "failed";
  endTs: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  quorum: number;
  agentVoted: boolean;
  agentChoice?: "For" | "Against" | "Abstain";
}

export interface VotingStats {
  totalVotesCast: number;
  spacesMonitored: number;
  participationRate: number;
  votesThisWeek: number;
  votesThisMonth: number;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  avgVotingPower: number;
}

/* ── Recurring payments types ── */

export interface PaymentScheduleItem {
  id: string;
  recipient: string;
  label: string;
  token: string;
  amount: number;
  interval: "weekly" | "biweekly" | "monthly" | "quarterly";
  nextDueDate: string;
  lastPaidDate: string | null;
  status: "active" | "paused";
}

export interface PaymentEvent {
  ts: string;
  scheduleId: string;
  recipient: string;
  label: string;
  amount: number;
  token: string;
  txHash: string;
  status: "sent" | "failed" | "pending";
}

export interface PaymentStats {
  totalPaymentsSent: number;
  totalUsdValue: number;
  activeSchedules: number;
  nextPaymentDue: string;
  paymentsThisMonth: number;
  failedPayments: number;
  totalSchedules: number;
}

/* ── Wallet integration test types ── */

export type TestStatus = "pass" | "fail";

export interface IndividualTest {
  name: string;
  status: TestStatus;
  durationMs: number;
  txHash?: string;
  error?: string;
}

export interface TestRun {
  id: string;
  prNumber: number;
  prTitle: string;
  prUrl: string;
  repo: string;
  timestamp: string;
  overallStatus: TestStatus;
  passCount: number;
  totalCount: number;
  tests: IndividualTest[];
}

export interface TestStats {
  totalTestRuns: number;
  overallPassRate: number;
  avgTestDurationMs: number;
  mostCommonFailure: string;
  reposMonitored: number;
  prsTestedThisWeek: number;
}

export interface MonitoredRepo {
  name: string;
  fullName: string;
  lastPrNumber: number | null;
  lastPrTitle: string | null;
  lastResult: TestStatus | null;
  lastTestedAt: string | null;
  active: boolean;
}

export interface GasSpendPoint {
  ts: string;
  gasSpendUsd: number;
}
