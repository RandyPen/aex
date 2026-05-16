import type { Agent, BalanceSnapshot, AgentEvent, VoteEvent, Proposal, VotingStats } from "./types";

export const agents: Agent[] = [
  {
    id: "snapshot-gov-alpha",
    name: "Snapshot Governance Agent",
    description: "Monitors DAO proposals on Snapshot, votes according to configured strategy rules, and tracks governance participation across multiple spaces. All vote transactions require two-party signing via WaaP.",
    email: "webmaster+snapshot-gov@holonym.id",
    chain: "Ethereum",
    network: "mainnet",
    protocol: "Snapshot",
    walletAddress: "0x4c2e8a1b3f5d6e7a9b0c1d2e3f4a5b6c7d8e9f0a",
    status: "running",
    uptime: "6d 11h",
    lastActivity: "3 min ago",
    config: {
      "Strategy": "Rule-based per space + delegation fallback",
      "Spaces monitored": "4 (Arbitrum DAO, Uniswap, Aave, ENS)",
      "Default vote": "Abstain (unless rule match)",
      "Min voting power": "100 tokens",
      "Scan interval": "Every 5 min",
      "Auto-vote": "Enabled for Arbitrum DAO (always FOR on treasury proposals)",
      "Quorum alert": "Notify when proposal at 80% quorum",
    },
    tools: [
      "@human.tech/waap-cli",
      "snapshot-js",
      "ethers",
    ],
  },
];

export function generateBalanceHistory(): BalanceSnapshot[] {
  const now = Date.now();
  const points: BalanceSnapshot[] = [];
  let balance = 25000.0;

  for (let i = 96; i >= 0; i--) {
    const ts = new Date(now - i * 15 * 60 * 1000).toISOString();
    balance += (Math.random() - 0.48) * 80;
    balance = Math.max(20000, balance);
    points.push({ ts, balance: parseFloat(balance.toFixed(2)) });
  }

  return points;
}

export function generateEvents(): AgentEvent[] {
  const now = Date.now();
  return [
    {
      ts: new Date(now - 3 * 60 * 1000).toISOString(),
      type: "vote_cast",
      level: "event",
      message: "Voted FOR on AIP-42: Treasury diversification into stablecoins",
      txHash: "0xsnap_abc123...",
    },
    {
      ts: new Date(now - 15 * 60 * 1000).toISOString(),
      type: "proposal_scan",
      level: "info",
      message: "Scanned 4 spaces, found 2 active proposals requiring attention",
    },
    {
      ts: new Date(now - 45 * 60 * 1000).toISOString(),
      type: "vote_cast",
      level: "event",
      message: "Voted AGAINST on UNI-RC-047: Fee switch activation for V3 pools",
      txHash: "0xsnap_def456...",
    },
    {
      ts: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      type: "proposal_closed",
      level: "info",
      message: "Proposal passed: AIP-41 Security council member rotation",
    },
    {
      ts: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
      type: "quorum_alert",
      level: "warn",
      message: "ENS proposal EP-5.12 at 82% quorum with 6h remaining",
    },
    {
      ts: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
      type: "vote_cast",
      level: "event",
      message: "Voted FOR on AAVE-V3.2: Risk parameter update for wstETH market",
      txHash: "0xsnap_ghi789...",
    },
    {
      ts: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
      type: "agent_start",
      level: "info",
      message: "Agent started. Protocol: Snapshot, Network: Ethereum mainnet",
    },
  ];
}

export function generateVoteHistory(): VoteEvent[] {
  const now = Date.now();
  return [
    {
      ts: new Date(now - 3 * 60 * 1000).toISOString(),
      proposalId: "aip-42",
      proposalTitle: "AIP-42: Treasury diversification into stablecoins",
      spaceName: "Arbitrum DAO",
      choice: "For",
      votingPower: 12500,
      proposalStatus: "active",
      txHash: "0xsnap_abc123...",
    },
    {
      ts: new Date(now - 45 * 60 * 1000).toISOString(),
      proposalId: "uni-rc-047",
      proposalTitle: "UNI-RC-047: Fee switch activation for V3 pools",
      spaceName: "Uniswap",
      choice: "Against",
      votingPower: 3200,
      proposalStatus: "active",
      txHash: "0xsnap_def456...",
    },
    {
      ts: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
      proposalId: "aave-v3.2",
      proposalTitle: "AAVE-V3.2: Risk parameter update for wstETH market",
      spaceName: "Aave",
      choice: "For",
      votingPower: 8400,
      proposalStatus: "closed",
      txHash: "0xsnap_ghi789...",
    },
    {
      ts: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      proposalId: "aip-41",
      proposalTitle: "AIP-41: Security council member rotation",
      spaceName: "Arbitrum DAO",
      choice: "For",
      votingPower: 12500,
      proposalStatus: "passed",
      txHash: "0xsnap_jkl012...",
    },
    {
      ts: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      proposalId: "ens-ep-5.11",
      proposalTitle: "EP-5.11: ENS Labs funding renewal for 2026",
      spaceName: "ENS",
      choice: "Abstain",
      votingPower: 1800,
      proposalStatus: "failed",
      txHash: "0xsnap_mno345...",
    },
  ];
}

export function generateProposals(): Proposal[] {
  const now = Date.now();
  return [
    {
      proposalId: "aip-42",
      title: "AIP-42: Treasury diversification into stablecoins",
      spaceName: "Arbitrum DAO",
      status: "active",
      endTs: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(),
      forVotes: 18_400_000,
      againstVotes: 3_200_000,
      abstainVotes: 1_100_000,
      quorum: 20_000_000,
      agentVoted: true,
      agentChoice: "For",
    },
    {
      proposalId: "ens-ep-5.12",
      title: "EP-5.12: Wildcard resolution standard update",
      spaceName: "ENS",
      status: "active",
      endTs: new Date(now + 6 * 60 * 60 * 1000).toISOString(),
      forVotes: 450_000,
      againstVotes: 120_000,
      abstainVotes: 80_000,
      quorum: 800_000,
      agentVoted: false,
    },
  ];
}

export function generateVotingStats(): VotingStats {
  return {
    totalVotesCast: 47,
    spacesMonitored: 4,
    participationRate: 89.4,
    votesThisWeek: 3,
    votesThisMonth: 12,
    forVotes: 28,
    againstVotes: 11,
    abstainVotes: 8,
    avgVotingPower: 7680,
  };
}
