import type { TestStats as TestStatsType } from "@/lib/types";

interface TestStatsProps {
  stats: TestStatsType;
}

export function TestStatsCard({ stats }: TestStatsProps) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Test Summary</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3xl)" }}>
        <div>
          <div className="stat-label">Total Runs</div>
          <div className="stat-value">{stats.totalTestRuns}</div>
        </div>
        <div>
          <div className="stat-label">Pass Rate</div>
          <div className="stat-value" style={{
            color: stats.overallPassRate >= 80
              ? "var(--color-green-50)"
              : stats.overallPassRate >= 50
                ? "var(--color-yellow-50)"
                : "var(--color-red-60)",
          }}>
            {stats.overallPassRate.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="stat-label">Avg Duration</div>
          <div className="stat-value">
            {stats.avgTestDurationMs >= 1000
              ? `${(stats.avgTestDurationMs / 1000).toFixed(1)}s`
              : `${stats.avgTestDurationMs}ms`}
          </div>
        </div>
        <div>
          <div className="stat-label">Repos Monitored</div>
          <div className="stat-value">{stats.reposMonitored}</div>
        </div>
        <div>
          <div className="stat-label">PRs This Week</div>
          <div className="stat-value">{stats.prsTestedThisWeek}</div>
        </div>
        <div>
          <div className="stat-label">Top Failure</div>
          <div style={{
            fontSize: "var(--font-size-text-xs)",
            color: "var(--color-red-60)",
            fontFamily: "var(--font-family-code), monospace",
            marginTop: "var(--space-xs)",
            lineHeight: 1.4,
          }}>
            {stats.mostCommonFailure}
          </div>
        </div>
      </div>
    </div>
  );
}
