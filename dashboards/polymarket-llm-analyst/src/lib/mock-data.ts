import type {
  Agent,
  BalanceSnapshot,
  AgentEvent,
  TradeEvent,
  PositionData,
  PnLData,
  MarketData,
  AnalysisEvent,
  LLMStatsData,
} from "./types";

export const agents: Agent[] = [
  {
    id: "poly-llm-analyst",
    name: "Polymarket LLM Analyst",
    description:
      "Uses large language model reasoning to analyze prediction markets on Polymarket. Evaluates market questions against news, fundamentals, and reasoning chains to determine mispriced outcomes. Places trades only when LLM confidence exceeds threshold. All transactions require two-party signing via WaaP.",
    email: "webmaster+poly-llm@holonym.id",
    chain: "Polygon",
    network: "mainnet",
    protocol: "Polymarket",
    walletAddress: "0x4b2c8d1e5f6a7b9c0d3e4f5a6b7c8d9e0f1a2b3c",
    status: "running",
    uptime: "22h 47m",
    lastActivity: "3 min ago",
    config: {
      Strategy: "LLM-driven fundamental analysis + news synthesis",
      "LLM Provider": "Anthropic",
      "LLM Model": "Claude Sonnet 4",
      "Confidence threshold": "0.72",
      "Max position size": "$400 per market",
      "Stop loss": "-12% per position",
      "Take profit": "+35% per position",
      "Analysis interval": "Every 5 min",
      "Daily spend limit": "$1,500",
      "Min liquidity": "$40,000",
    },
    tools: [
      "@human.tech/waap-cli",
      "polymarket-clob-client",
      "@anthropic-ai/sdk",
      "news-api-client",
    ],
  },
];

export function generateBalanceHistory(): BalanceSnapshot[] {
  const now = Date.now();
  const points: BalanceSnapshot[] = [];
  let balance = 800.0;

  for (let i = 96; i >= 0; i--) {
    const ts = new Date(now - i * 15 * 60 * 1000).toISOString();
    balance += (Math.random() - 0.44) * 9;
    balance = Math.max(100, balance);
    points.push({ ts, balance: parseFloat(balance.toFixed(2)) });
  }

  return points;
}

export function generateEvents(): AgentEvent[] {
  const now = Date.now();
  return [
    {
      ts: new Date(now - 3 * 60 * 1000).toISOString(),
      type: "llm_analysis",
      level: "info",
      message: "LLM analysis complete: 'Will BTC exceed $120k by July 2026?' -- confidence 0.81, placing trade",
    },
    {
      ts: new Date(now - 3 * 60 * 1000 - 5000).toISOString(),
      type: "trade_filled",
      level: "event",
      message: "Bought 180 YES shares on 'Will BTC exceed $120k by July 2026?' at $0.44",
      txHash: "0xpoly_llm_abc123...",
    },
    {
      ts: new Date(now - 8 * 60 * 1000).toISOString(),
      type: "llm_analysis",
      level: "info",
      message: "LLM analysis complete: 'Will Apple launch AR glasses in 2026?' -- confidence 0.58, skipping (below threshold)",
    },
    {
      ts: new Date(now - 15 * 60 * 1000).toISOString(),
      type: "llm_analysis",
      level: "info",
      message: "LLM analysis complete: 'Will the Fed cut rates in June 2026?' -- confidence 0.77, placing trade",
    },
    {
      ts: new Date(now - 15 * 60 * 1000 - 4000).toISOString(),
      type: "trade_filled",
      level: "event",
      message: "Bought 120 NO shares on 'Will the Fed cut rates in June 2026?' at $0.59",
      txHash: "0xpoly_llm_def456...",
    },
    {
      ts: new Date(now - 30 * 60 * 1000).toISOString(),
      type: "position_closed",
      level: "event",
      message: "Closed position: 'Will EU pass AI Act amendments by Q3?' -- profit +$28.40",
      txHash: "0xpoly_llm_ghi789...",
    },
    {
      ts: new Date(now - 45 * 60 * 1000).toISOString(),
      type: "balance_snapshot",
      level: "info",
      message: "Wallet balance: $1,087.22 USDC",
    },
    {
      ts: new Date(now - 22 * 60 * 60 * 1000).toISOString(),
      type: "agent_start",
      level: "info",
      message: "Agent started. Strategy: LLM Analyst, Protocol: Polymarket, Network: Polygon mainnet",
    },
  ];
}

export function generateTrades(): TradeEvent[] {
  const now = Date.now();
  return [
    {
      ts: new Date(now - 3 * 60 * 1000).toISOString(),
      marketId: "btc-120k-july-2026",
      marketQuestion: "Will BTC exceed $120k by July 2026?",
      side: "YES",
      amount: 180,
      price: 0.44,
      status: "filled",
      txHash: "0xpoly_llm_abc123...",
    },
    {
      ts: new Date(now - 15 * 60 * 1000).toISOString(),
      marketId: "fed-cut-june-2026",
      marketQuestion: "Will the Fed cut rates in June 2026?",
      side: "NO",
      amount: 120,
      price: 0.59,
      status: "filled",
      txHash: "0xpoly_llm_def456...",
    },
    {
      ts: new Date(now - 30 * 60 * 1000).toISOString(),
      marketId: "eu-ai-act-q3",
      marketQuestion: "Will EU pass AI Act amendments by Q3 2026?",
      side: "YES",
      amount: 90,
      price: 0.71,
      status: "filled",
      txHash: "0xpoly_llm_ghi789...",
    },
    {
      ts: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      marketId: "eth-pectra-q2",
      marketQuestion: "Will Ethereum complete Pectra upgrade by Q2 2026?",
      side: "YES",
      amount: 250,
      price: 0.79,
      status: "filled",
      txHash: "0xpoly_llm_jkl012...",
    },
    {
      ts: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      marketId: "trump-pardon-count",
      marketQuestion: "Will Trump issue > 50 pardons by end of 2026?",
      side: "NO",
      amount: 200,
      price: 0.53,
      status: "filled",
      txHash: "0xpoly_llm_mno345...",
    },
    {
      ts: new Date(now - 9 * 60 * 60 * 1000).toISOString(),
      marketId: "spacex-starship-orbit",
      marketQuestion: "Will SpaceX achieve Starship orbital flight by August 2026?",
      side: "YES",
      amount: 320,
      price: 0.67,
      status: "filled",
      txHash: "0xpoly_llm_pqr678...",
    },
  ];
}

export function generatePositions(): PositionData[] {
  return [
    {
      marketId: "btc-120k-july-2026",
      marketQuestion: "Will BTC exceed $120k by July 2026?",
      side: "YES",
      amount: 180,
      avgPrice: 0.44,
      currentPrice: 0.48,
      pnl: 7.2,
      pnlPct: 9.09,
    },
    {
      marketId: "fed-cut-june-2026",
      marketQuestion: "Will the Fed cut rates in June 2026?",
      side: "NO",
      amount: 120,
      avgPrice: 0.59,
      currentPrice: 0.56,
      pnl: 3.6,
      pnlPct: 5.08,
    },
    {
      marketId: "spacex-starship-orbit",
      marketQuestion: "Will SpaceX achieve Starship orbital flight by August 2026?",
      side: "YES",
      amount: 320,
      avgPrice: 0.67,
      currentPrice: 0.72,
      pnl: 16.0,
      pnlPct: 7.46,
    },
  ];
}

export function generatePnL(): PnLData {
  return {
    totalPnl: 187.22,
    totalPnlPct: 23.4,
    winRate: 71.4,
    totalTrades: 42,
    totalVolume: 9870.0,
    wins: 30,
    losses: 12,
    bestTrade: 142.3,
    worstTrade: -68.5,
    avgTradeSize: 235.0,
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
      watchReason: "LLM flagged: strong supply chain signals + analyst consensus divergence",
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
      watchReason: "LLM analysis: yield curve + labor data suggest 34% probability vs market 23%",
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
      watchReason: "LLM reasoning: recent board restructuring + revenue growth trajectory",
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
      watchReason: "Tail event monitor -- LLM assigns 8% vs market 12%, potential short",
    },
  ];
}

export function generateAnalyses(): AnalysisEvent[] {
  const now = Date.now();
  return [
    {
      ts: new Date(now - 3 * 60 * 1000).toISOString(),
      marketId: "btc-120k-july-2026",
      marketQuestion: "Will BTC exceed $120k by July 2026?",
      side: "YES",
      confidence: 0.81,
      reasoning:
        "BTC is currently trading at $108k with strong institutional inflows via ETFs. The halving supply shock is still playing out. On-chain metrics show decreasing exchange reserves. Macro tailwinds from potential Fed easing support risk assets. Historical post-halving cycles suggest a run to $120k is plausible within the timeframe. Market prices this at 44% which underestimates the momentum.",
      traded: true,
      llmProvider: "Anthropic",
      llmModel: "Claude Sonnet 4",
      promptTokens: 2840,
      completionTokens: 312,
      costEstimate: 0.012,
    },
    {
      ts: new Date(now - 8 * 60 * 1000).toISOString(),
      marketId: "apple-ar-2026",
      marketQuestion: "Will Apple launch AR glasses in 2026?",
      side: "NO",
      confidence: 0.58,
      reasoning:
        "Apple Vision Pro sales have underperformed expectations. Supply chain reports suggest a lighter, cheaper model is in development but unlikely before 2027. Apple has historically delayed product launches to ensure quality. However, recent patent filings for lightweight AR optics introduce some uncertainty. Confidence is moderate, not enough to trade.",
      traded: false,
      llmProvider: "Anthropic",
      llmModel: "Claude Sonnet 4",
      promptTokens: 3120,
      completionTokens: 287,
      costEstimate: 0.013,
    },
    {
      ts: new Date(now - 15 * 60 * 1000).toISOString(),
      marketId: "fed-cut-june-2026",
      marketQuestion: "Will the Fed cut rates in June 2026?",
      side: "NO",
      confidence: 0.77,
      reasoning:
        "Recent CPI data shows inflation sticky at 3.1%. Fed minutes indicate a cautious stance with no urgency to cut. Employment remains strong at 3.7% unemployment. The Fed has emphasized data-dependence and most FOMC members project rates staying elevated through mid-2026. CME FedWatch tool shows only 28% probability of a June cut, but the market is pricing NO at 59% -- there is edge on the NO side.",
      traded: true,
      llmProvider: "Anthropic",
      llmModel: "Claude Sonnet 4",
      promptTokens: 3450,
      completionTokens: 341,
      costEstimate: 0.015,
    },
    {
      ts: new Date(now - 25 * 60 * 1000).toISOString(),
      marketId: "eu-ai-act-q3",
      marketQuestion: "Will EU pass AI Act amendments by Q3 2026?",
      side: "YES",
      confidence: 0.84,
      reasoning:
        "The EU AI Act implementation is on schedule. The European Commission has published draft amendments for the high-risk classification system. Member states have signaled broad support. The European Parliament committee vote is scheduled for June 2026 with plenary expected in July. Legislative tracking databases show no significant blockers. The 71% market price undervalues the near-certainty of procedural completion.",
      traded: true,
      llmProvider: "Anthropic",
      llmModel: "Claude Sonnet 4",
      promptTokens: 2960,
      completionTokens: 298,
      costEstimate: 0.012,
    },
    {
      ts: new Date(now - 40 * 60 * 1000).toISOString(),
      marketId: "nvidia-earnings-beat",
      marketQuestion: "Will NVIDIA beat Q2 2026 earnings estimates?",
      side: "YES",
      confidence: 0.69,
      reasoning:
        "NVIDIA has beaten earnings estimates in 8 of the last 10 quarters. Data center demand remains strong. However, recent reports of hyperscaler capex slowdowns introduce uncertainty. Supply chain checks show strong H100/H200 shipments but the bar has been raised by consensus. The 72% market price is roughly fair -- not enough edge to justify a position.",
      traded: false,
      llmProvider: "Anthropic",
      llmModel: "Claude Sonnet 4",
      promptTokens: 3680,
      completionTokens: 324,
      costEstimate: 0.016,
    },
    {
      ts: new Date(now - 55 * 60 * 1000).toISOString(),
      marketId: "spacex-starship-orbit",
      marketQuestion: "Will SpaceX achieve Starship orbital flight by August 2026?",
      side: "YES",
      confidence: 0.88,
      reasoning:
        "SpaceX has completed 5 integrated flight tests with progressively better results. The last test achieved near-orbital velocity. Raptor 3 engines show improved reliability. FAA licensing for the next attempt is already in progress. SpaceX's cadence of attempts (roughly every 2-3 months) gives them multiple shots before August 2026. The 67% market price significantly undervalues the cumulative probability of success across multiple attempts.",
      traded: true,
      llmProvider: "Anthropic",
      llmModel: "Claude Sonnet 4",
      promptTokens: 2750,
      completionTokens: 276,
      costEstimate: 0.011,
    },
    {
      ts: new Date(now - 1.5 * 60 * 60 * 1000).toISOString(),
      marketId: "openai-ipo-2026",
      marketQuestion: "Will OpenAI IPO in 2026?",
      side: "YES",
      confidence: 0.52,
      reasoning:
        "OpenAI has restructured from a nonprofit to a capped-profit entity. Revenue reportedly exceeded $3B annualized. Several board members have IPO experience. However, Sam Altman has publicly stated no near-term IPO plans. Regulatory scrutiny and the nonprofit conversion timeline add complexity. The 41% market price may actually be slightly high. Low confidence, no trade.",
      traded: false,
      llmProvider: "Anthropic",
      llmModel: "Claude Sonnet 4",
      promptTokens: 3200,
      completionTokens: 305,
      costEstimate: 0.014,
    },
    {
      ts: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      marketId: "eth-pectra-q2",
      marketQuestion: "Will Ethereum complete Pectra upgrade by Q2 2026?",
      side: "YES",
      confidence: 0.91,
      reasoning:
        "Pectra (Prague/Electra) has been successfully deployed on all testnets. The core devs have set a mainnet target date of May 2026. All client teams report readiness. The upgrade scope was reduced to ensure timely delivery. Historical precedent shows Ethereum upgrades typically ship within 1-2 months of testnet completion. The 79% market price heavily underestimates the probability given the advanced state of testing.",
      traded: true,
      llmProvider: "Anthropic",
      llmModel: "Claude Sonnet 4",
      promptTokens: 2580,
      completionTokens: 264,
      costEstimate: 0.01,
    },
    {
      ts: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      marketId: "us-recession-2026",
      marketQuestion: "Will the US enter recession in 2026?",
      side: "YES",
      confidence: 0.45,
      reasoning:
        "Leading indicators are mixed. The yield curve has normalized after inversion. Consumer spending remains resilient but credit card delinquencies are rising. Manufacturing PMI is borderline contractionary. The labor market shows early signs of cooling. On balance, recession risk is elevated but not dominant. The 23% market price is roughly in line with my estimate of 28-34%. Insufficient edge for a trade.",
      traded: false,
      llmProvider: "Anthropic",
      llmModel: "Claude Sonnet 4",
      promptTokens: 4100,
      completionTokens: 358,
      costEstimate: 0.018,
    },
    {
      ts: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
      marketId: "trump-pardon-count",
      marketQuestion: "Will Trump issue > 50 pardons by end of 2026?",
      side: "NO",
      confidence: 0.74,
      reasoning:
        "Trump has issued 23 pardons and commutations so far in his term. The pace has slowed since the initial wave. Historical patterns suggest presidents issue most pardons near the end of their term, not the middle. To reach 50 by end of 2026 would require an acceleration without clear political motivation. The 53% NO price offers moderate edge given the historical base rate.",
      traded: true,
      llmProvider: "Anthropic",
      llmModel: "Claude Sonnet 4",
      promptTokens: 2890,
      completionTokens: 291,
      costEstimate: 0.012,
    },
    {
      ts: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      marketId: "btc-200k-2026",
      marketQuestion: "Will Bitcoin reach $200k in 2026?",
      side: "NO",
      confidence: 0.63,
      reasoning:
        "While BTC has strong momentum, a move to $200k from current ~$108k would require an 85% rally. Post-halving cycles have shown diminishing returns. Institutional adoption via ETFs provides a floor but may also dampen volatility. The 12% market price may overstate the probability. However, tail events are hard to price and crypto can move faster than expected. Moderate confidence, below threshold.",
      traded: false,
      llmProvider: "Anthropic",
      llmModel: "Claude Sonnet 4",
      promptTokens: 3350,
      completionTokens: 318,
      costEstimate: 0.014,
    },
    {
      ts: new Date(now - 7 * 60 * 60 * 1000).toISOString(),
      marketId: "world-cup-host-2034",
      marketQuestion: "Will FIFA confirm Saudi Arabia as 2034 World Cup host?",
      side: "YES",
      confidence: 0.96,
      reasoning:
        "Saudi Arabia is the sole bidder for 2034 World Cup. FIFA has already signaled support. The evaluation report was positive. No competing bids were submitted by the deadline. The formal vote is a procedural formality. The 94% market price slightly underestimates what is essentially a certainty barring an unprecedented reversal.",
      traded: true,
      llmProvider: "Anthropic",
      llmModel: "Claude Sonnet 4",
      promptTokens: 1850,
      completionTokens: 198,
      costEstimate: 0.007,
    },
  ];
}

export function generateLLMStats(): LLMStatsData {
  return {
    totalAnalyses: 128,
    tradesPlaced: 42,
    tradesSkipped: 86,
    avgConfidence: 0.68,
    winRateOnTrades: 71.4,
    llmProvider: "Anthropic",
    llmModel: "Claude Sonnet 4",
    totalLLMCost: 1.64,
    confidenceThreshold: 0.72,
  };
}
