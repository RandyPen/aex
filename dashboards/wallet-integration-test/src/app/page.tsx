"use client";

import { StatCard } from "@/components/StatCard";
import { TestRunHistory } from "@/components/TestRunHistory";
import { TestStatsCard } from "@/components/TestStats";
import { RepoMonitor } from "@/components/RepoMonitor";
import { FailureLog } from "@/components/FailureLog";
import { BalanceChart } from "@/components/BalanceChart";
import { EventList } from "@/components/EventList";
import { AgentConfig } from "@/components/AgentConfig";
import {
  generateTestRuns,
  generateTestStats,
  generateMonitoredRepos,
  generateGasSpendHistory,
  generateAgentConfig,
  generateEvents,
} from "@/lib/mock-data";

export default function Dashboard() {
  const testRuns = generateTestRuns();
  const stats = generateTestStats();
  const repos = generateMonitoredRepos();
  const gasHistory = generateGasSpendHistory();
  const config = generateAgentConfig();
  const events = generateEvents();

  const passedRuns = testRuns.filter((r) => r.overallStatus === "pass").length;
  const failedRuns = testRuns.filter((r) => r.overallStatus === "fail").length;

  return (
    <div className="container" style={{ paddingTop: "var(--space-6xl)", paddingBottom: "var(--space-10xl)" }}>
      <header style={{ marginBottom: "var(--space-6xl)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-lg)", marginBottom: "var(--space-sm)" }}>
          <h1 style={{ fontSize: "var(--font-size-h3)", fontWeight: "var(--font-weight-semi)" }}>
            Wallet Integration Test Agent
          </h1>
          <span className="status-dot running" />
        </div>
        <p style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-md)", maxWidth: "720px", lineHeight: 1.55 }}>
          Connects its own wallet, runs real transactions against staging on every PR,
          and posts pass/fail results. Tests: SIWE sign, send-tx, token approval, contract call, balance check.
        </p>
      </header>

      {/* Quick stats */}
      <div className="grid grid-4" style={{ marginBottom: "var(--space-4xl)" }}>
        <StatCard label="Status" value="Running" indicator="running" />
        <StatCard
          label="Pass Rate"
          value={`${stats.overallPassRate.toFixed(1)}%`}
          color={stats.overallPassRate >= 80 ? "var(--color-green-50)" : "var(--color-yellow-50)"}
        />
        <StatCard
          label="Runs"
          value={`${passedRuns} passed / ${failedRuns} failed`}
        />
        <StatCard label="PRs This Week" value={String(stats.prsTestedThisWeek)} />
      </div>

      {/* Test stats + repo monitor */}
      <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
        <TestStatsCard stats={stats} />
        <RepoMonitor repos={repos} />
      </div>

      {/* Test run history (expandable) */}
      <div style={{ marginBottom: "var(--space-4xl)" }}>
        <TestRunHistory runs={testRuns} />
      </div>

      {/* Failure log */}
      <div style={{ marginBottom: "var(--space-4xl)" }}>
        <FailureLog runs={testRuns} />
      </div>

      {/* Gas spend chart + recent activity */}
      <div className="grid grid-2" style={{ marginBottom: "var(--space-4xl)" }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Gas Spend Over Time</span>
            <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>Cumulative USD</span>
          </div>
          <BalanceChart data={gasHistory} />
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Activity</span>
          </div>
          <EventList events={events} />
        </div>
      </div>

      {/* Agent config */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Agent Configuration</span>
        </div>
        <AgentConfig config={config} />
      </div>
    </div>
  );
}
