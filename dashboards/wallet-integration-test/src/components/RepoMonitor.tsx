import type { MonitoredRepo } from "@/lib/types";

interface RepoMonitorProps {
  repos: MonitoredRepo[];
}

function formatRelativeTime(ts: string | null): string {
  if (!ts) return "never";
  const ms = Date.now() - new Date(ts).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

export function RepoMonitor({ repos }: RepoMonitorProps) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Monitored Repos</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
        {repos.map((repo) => (
          <div
            key={repo.fullName}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "var(--space-lg) 0",
              borderBottom: "1px solid var(--color-border-20)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                <a
                  href={`https://github.com/${repo.fullName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontWeight: "var(--font-weight-semi)",
                    fontSize: "var(--font-size-text-sm)",
                    color: "var(--color-text-90)",
                    textDecoration: "none",
                  }}
                >
                  {repo.fullName}
                </a>
                <span className={`tag tag-${repo.active ? "active" : "inactive"}`}>
                  {repo.active ? "active" : "inactive"}
                </span>
              </div>
              {repo.lastPrNumber && (
                <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
                  Last: #{repo.lastPrNumber} {repo.lastPrTitle}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2xl)", flexShrink: 0 }}>
              {repo.lastResult && (
                <span className={`tag tag-${repo.lastResult}`}>
                  {repo.lastResult}
                </span>
              )}
              <span className="mono" style={{ color: "var(--color-text-40)" }}>
                {formatRelativeTime(repo.lastTestedAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
