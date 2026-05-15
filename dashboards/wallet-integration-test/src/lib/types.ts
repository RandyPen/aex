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

export interface AgentConfig {
  [key: string]: string;
}

export interface AgentEvent {
  ts: string;
  type: string;
  level: "info" | "event" | "error" | "warn";
  message: string;
  txHash?: string;
}
