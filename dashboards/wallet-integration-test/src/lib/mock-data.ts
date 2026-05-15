import type { TestRun, TestStats, MonitoredRepo, GasSpendPoint, AgentConfig, AgentEvent } from "./types";

const now = Date.now();

export function generateTestRuns(): TestRun[] {
  return [
    {
      id: "run-001",
      prNumber: 142,
      prTitle: "feat: add ERC-4337 bundler support",
      prUrl: "https://github.com/holonym-foundation/human-id/pull/142",
      repo: "holonym-foundation/human-id",
      timestamp: new Date(now - 25 * 60 * 1000).toISOString(),
      overallStatus: "pass",
      passCount: 5,
      totalCount: 5,
      tests: [
        { name: "SIWE sign", status: "pass", durationMs: 312, txHash: "0xa1b2c3d4e5f6...1001" },
        { name: "send-tx", status: "pass", durationMs: 1847, txHash: "0xa1b2c3d4e5f6...1002" },
        { name: "token approval", status: "pass", durationMs: 2103, txHash: "0xa1b2c3d4e5f6...1003" },
        { name: "contract call", status: "pass", durationMs: 1654, txHash: "0xa1b2c3d4e5f6...1004" },
        { name: "balance check", status: "pass", durationMs: 428 },
      ],
    },
    {
      id: "run-002",
      prNumber: 141,
      prTitle: "fix: session key rotation edge case",
      prUrl: "https://github.com/holonym-foundation/human-id/pull/141",
      repo: "holonym-foundation/human-id",
      timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      overallStatus: "fail",
      passCount: 3,
      totalCount: 5,
      tests: [
        { name: "SIWE sign", status: "pass", durationMs: 287 },
        { name: "send-tx", status: "pass", durationMs: 1923, txHash: "0xb2c3d4e5f6a7...2001" },
        { name: "token approval", status: "pass", durationMs: 2045, txHash: "0xb2c3d4e5f6a7...2002" },
        { name: "contract call", status: "fail", durationMs: 30000, error: "Transaction timed out after 30s -- contract call to staging verifier reverted with UNPREDICTABLE_GAS_LIMIT" },
        { name: "balance check", status: "fail", durationMs: 512, error: "Balance mismatch: expected 0.0847 ETH, got 0.0842 ETH (delta 0.0005 exceeds tolerance 0.0001)" },
      ],
    },
    {
      id: "run-003",
      prNumber: 87,
      prTitle: "chore: bump waap-cli to 0.9.2",
      prUrl: "https://github.com/holonym-foundation/waap-docs/pull/87",
      repo: "holonym-foundation/waap-docs",
      timestamp: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      overallStatus: "pass",
      passCount: 5,
      totalCount: 5,
      tests: [
        { name: "SIWE sign", status: "pass", durationMs: 298, txHash: "0xc3d4e5f6a7b8...3001" },
        { name: "send-tx", status: "pass", durationMs: 1756, txHash: "0xc3d4e5f6a7b8...3002" },
        { name: "token approval", status: "pass", durationMs: 1989, txHash: "0xc3d4e5f6a7b8...3003" },
        { name: "contract call", status: "pass", durationMs: 1432, txHash: "0xc3d4e5f6a7b8...3004" },
        { name: "balance check", status: "pass", durationMs: 391 },
      ],
    },
    {
      id: "run-004",
      prNumber: 142,
      prTitle: "feat: add ERC-4337 bundler support",
      prUrl: "https://github.com/holonym-foundation/human-id/pull/142",
      repo: "holonym-foundation/human-id",
      timestamp: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
      overallStatus: "fail",
      passCount: 4,
      totalCount: 5,
      tests: [
        { name: "SIWE sign", status: "pass", durationMs: 305 },
        { name: "send-tx", status: "pass", durationMs: 1811, txHash: "0xd4e5f6a7b8c9...4001" },
        { name: "token approval", status: "pass", durationMs: 2210, txHash: "0xd4e5f6a7b8c9...4002" },
        { name: "contract call", status: "fail", durationMs: 30000, error: "Transaction timed out after 30s -- contract call to staging verifier reverted with UNPREDICTABLE_GAS_LIMIT" },
        { name: "balance check", status: "pass", durationMs: 445 },
      ],
    },
    {
      id: "run-005",
      prNumber: 86,
      prTitle: "docs: update Sui integration guide",
      prUrl: "https://github.com/holonym-foundation/waap-docs/pull/86",
      repo: "holonym-foundation/waap-docs",
      timestamp: new Date(now - 18 * 60 * 60 * 1000).toISOString(),
      overallStatus: "pass",
      passCount: 5,
      totalCount: 5,
      tests: [
        { name: "SIWE sign", status: "pass", durationMs: 276, txHash: "0xe5f6a7b8c9d0...5001" },
        { name: "send-tx", status: "pass", durationMs: 1698, txHash: "0xe5f6a7b8c9d0...5002" },
        { name: "token approval", status: "pass", durationMs: 1877, txHash: "0xe5f6a7b8c9d0...5003" },
        { name: "contract call", status: "pass", durationMs: 1501, txHash: "0xe5f6a7b8c9d0...5004" },
        { name: "balance check", status: "pass", durationMs: 367 },
      ],
    },
    {
      id: "run-006",
      prNumber: 140,
      prTitle: "refactor: migrate to viem v2",
      prUrl: "https://github.com/holonym-foundation/human-id/pull/140",
      repo: "holonym-foundation/human-id",
      timestamp: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
      overallStatus: "pass",
      passCount: 5,
      totalCount: 5,
      tests: [
        { name: "SIWE sign", status: "pass", durationMs: 291, txHash: "0xf6a7b8c9d0e1...6001" },
        { name: "send-tx", status: "pass", durationMs: 1785, txHash: "0xf6a7b8c9d0e1...6002" },
        { name: "token approval", status: "pass", durationMs: 2056, txHash: "0xf6a7b8c9d0e1...6003" },
        { name: "contract call", status: "pass", durationMs: 1623, txHash: "0xf6a7b8c9d0e1...6004" },
        { name: "balance check", status: "pass", durationMs: 402 },
      ],
    },
  ];
}

export function generateTestStats(): TestStats {
  return {
    totalTestRuns: 6,
    overallPassRate: 66.7,
    avgTestDurationMs: 1287,
    mostCommonFailure: "contract call timeout (UNPREDICTABLE_GAS_LIMIT)",
    reposMonitored: 2,
    prsTestedThisWeek: 4,
  };
}

export function generateMonitoredRepos(): MonitoredRepo[] {
  return [
    {
      name: "human-id",
      fullName: "holonym-foundation/human-id",
      lastPrNumber: 142,
      lastPrTitle: "feat: add ERC-4337 bundler support",
      lastResult: "pass",
      lastTestedAt: new Date(now - 25 * 60 * 1000).toISOString(),
      active: true,
    },
    {
      name: "waap-docs",
      fullName: "holonym-foundation/waap-docs",
      lastPrNumber: 87,
      lastPrTitle: "chore: bump waap-cli to 0.9.2",
      lastResult: "pass",
      lastTestedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      active: true,
    },
  ];
}

export function generateGasSpendHistory(): GasSpendPoint[] {
  const points: GasSpendPoint[] = [];
  let cumulative = 0;

  for (let i = 13; i >= 0; i--) {
    const ts = new Date(now - i * 24 * 60 * 60 * 1000).toISOString();
    const dailySpend = 0.15 + Math.random() * 0.35;
    cumulative += dailySpend;
    points.push({ ts, gasSpendUsd: parseFloat(cumulative.toFixed(4)) });
  }

  return points;
}

export function generateAgentConfig(): AgentConfig {
  return {
    "Wallet address": "0x7a3b...9a0b",
    "Network": "Sepolia (staging)",
    "Test suite": "5 tests (SIWE, send-tx, approval, contract call, balance)",
    "Trigger": "GitHub PR webhook",
    "Timeout per test": "30s",
    "Balance tolerance": "0.0001 ETH",
    "Gas budget per run": "0.05 ETH",
    "Repos monitored": "holonym-foundation/human-id, holonym-foundation/waap-docs",
  };
}

export function generateEvents(): AgentEvent[] {
  return [
    {
      ts: new Date(now - 25 * 60 * 1000).toISOString(),
      type: "test_run_complete",
      level: "event",
      message: "PR #142 -- all 5 tests passed",
      txHash: "0xa1b2c3d4e5f6...1004",
    },
    {
      ts: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      type: "test_run_complete",
      level: "error",
      message: "PR #141 -- 3/5 passed, contract call timed out",
    },
    {
      ts: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      type: "wallet_funded",
      level: "info",
      message: "Wallet topped up: +0.1 ETH from faucet",
      txHash: "0xfaucet...abc123",
    },
    {
      ts: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      type: "test_run_complete",
      level: "event",
      message: "PR #87 (waap-docs) -- all 5 tests passed",
    },
    {
      ts: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
      type: "test_run_complete",
      level: "warn",
      message: "PR #142 -- 4/5 passed, contract call failed",
    },
    {
      ts: new Date(now - 18 * 60 * 60 * 1000).toISOString(),
      type: "test_run_complete",
      level: "event",
      message: "PR #86 (waap-docs) -- all 5 tests passed",
    },
    {
      ts: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      type: "agent_start",
      level: "info",
      message: "Agent started. Monitoring 2 repos on Sepolia staging",
    },
  ];
}
