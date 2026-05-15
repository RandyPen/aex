"use client";

import { useState } from "react";
import type { TestRun } from "@/lib/types";
import { TestDetailView } from "./TestDetailView";

interface TestRunHistoryProps {
  runs: TestRun[];
}

function formatRelativeTime(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

function repoShortName(fullName: string): string {
  return fullName.split("/").pop() || fullName;
}

export function TestRunHistory({ runs }: TestRunHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Test Run History</span>
        <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
          {runs.length} runs
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>PR</th>
              <th>Repo</th>
              <th>When</th>
              <th>Result</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <>
                <tr
                  key={run.id}
                  className="expandable-row"
                  onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}
                >
                  <td>
                    <a
                      href={run.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "var(--color-text-90)", textDecoration: "none" }}
                    >
                      <span style={{ fontWeight: "var(--font-weight-semi)" }}>#{run.prNumber}</span>
                      <span style={{ color: "var(--color-text-60)", marginLeft: "var(--space-md)" }}>
                        {run.prTitle}
                      </span>
                    </a>
                  </td>
                  <td>
                    <span className="tag tag-repo">{repoShortName(run.repo)}</span>
                  </td>
                  <td>
                    <span className="mono" style={{ color: "var(--color-text-40)" }}>
                      {formatRelativeTime(run.timestamp)}
                    </span>
                  </td>
                  <td>
                    <span className={`tag tag-${run.overallStatus}`}>
                      {run.passCount}/{run.totalCount} passed
                    </span>
                  </td>
                  <td>
                    <span className={`status-dot ${run.overallStatus}`} />
                    {run.overallStatus === "pass" ? "Pass" : "Fail"}
                  </td>
                  <td style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)" }}>
                    {expandedId === run.id ? "collapse" : "expand"}
                  </td>
                </tr>
                {expandedId === run.id && (
                  <tr key={`${run.id}-detail`} className="detail-row">
                    <td colSpan={6}>
                      <div className="detail-content">
                        <TestDetailView tests={run.tests} />
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
