export interface Agent {
  id: string;
  name: string;
  description: string;
  email: string;
  chain: string;
  network: string;
  protocol: string;
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
}

export interface AgentEvent {
  ts: string;
  type: string;
  level: "info" | "event" | "error" | "warn";
  message: string;
  data?: Record<string, unknown>;
  txHash?: string;
}

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
