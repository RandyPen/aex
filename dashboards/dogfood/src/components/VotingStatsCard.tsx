"use client";

import type { VotingStats } from "@/lib/types";

interface VotingStatsCardProps {
  stats: VotingStats;
}

export function VotingStatsCard({ stats }: VotingStatsCardProps) {
  const rows: { label: string; value: string; color?: string; detail?: string }[] = [
    {
      label: "Total Votes Cast",
      value: stats.totalVotesCast.toString(),
    },
    {
      label: "Spaces Monitored",
      value: stats.spacesMonitored.toString(),
    },
    {
      label: "Participation Rate",
      value: `${stats.participationRate.toFixed(1)}%`,
      color: stats.participationRate >= 75 ? "var(--color-green-50)" : "var(--color-yellow-50)",
    },
    {
      label: "Votes This Week",
      value: stats.votesThisWeek.toString(),
    },
    {
      label: "Votes This Month",
      value: stats.votesThisMonth.toString(),
    },
    {
      label: "Average Voting Power",
      value: stats.avgVotingPower.toLocaleString(),
    },
  ];

  const totalChoices = stats.forVotes + stats.againstVotes + stats.abstainVotes;
  const forPct = totalChoices > 0 ? (stats.forVotes / totalChoices) * 100 : 0;
  const againstPct = totalChoices > 0 ? (stats.againstVotes / totalChoices) * 100 : 0;
  const abstainPct = totalChoices > 0 ? (stats.abstainVotes / totalChoices) * 100 : 0;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Voting Statistics</span>
      </div>

      {rows.map((row) => (
        <div key={row.label} className="config-row">
          <span className="config-key">{row.label}</span>
          <div style={{ textAlign: "right" }}>
            <span
              className="config-value"
              style={{ color: row.color || "var(--color-text-90)" }}
            >
              {row.value}
            </span>
            {row.detail && (
              <div style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
                {row.detail}
              </div>
            )}
          </div>
        </div>
      ))}

      <div style={{
        marginTop: "var(--space-2xl)",
        padding: "var(--space-2xl)",
        background: "var(--color-background-10)",
        borderRadius: "var(--radi-md)",
        fontSize: "var(--font-size-text-xs)",
      }}>
        <div style={{ color: "var(--color-text-40)", marginBottom: "var(--space-md)" }}>
          Vote distribution
        </div>
        <div style={{
          display: "flex",
          height: "8px",
          borderRadius: "var(--radi-full)",
          overflow: "hidden",
          marginBottom: "var(--space-md)",
        }}>
          <div style={{ width: `${forPct}%`, background: "var(--color-green-50)" }} />
          <div style={{ width: `${againstPct}%`, background: "var(--color-red-60)" }} />
          <div style={{ width: `${abstainPct}%`, background: "var(--color-yellow-50)" }} />
        </div>
        <div style={{ display: "flex", gap: "var(--space-3xl)" }}>
          <div>
            <span style={{ color: "var(--color-green-50)" }}>For: </span>
            <span className="mono" style={{ color: "var(--color-text-60)" }}>{stats.forVotes} ({forPct.toFixed(0)}%)</span>
          </div>
          <div>
            <span style={{ color: "var(--color-red-60)" }}>Against: </span>
            <span className="mono" style={{ color: "var(--color-text-60)" }}>{stats.againstVotes} ({againstPct.toFixed(0)}%)</span>
          </div>
          <div>
            <span style={{ color: "var(--color-yellow-50)" }}>Abstain: </span>
            <span className="mono" style={{ color: "var(--color-text-60)" }}>{stats.abstainVotes} ({abstainPct.toFixed(0)}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
