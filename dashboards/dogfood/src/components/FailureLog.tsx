import type { TestRun } from "@/lib/types";

interface FailureLogProps {
  runs: TestRun[];
}

function formatRelativeTime(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

interface FailureEntry {
  runId: string;
  prNumber: number;
  prTitle: string;
  prUrl: string;
  repo: string;
  timestamp: string;
  testName: string;
  error: string;
  durationMs: number;
  suggestedFix: string;
}

function suggestFix(testName: string, error: string): string {
  if (error.includes("timed out") || error.includes("UNPREDICTABLE_GAS_LIMIT")) {
    return "Check staging contract deployment. The verifier contract may need redeployment or the gas estimation is failing due to a revert in the contract logic.";
  }
  if (error.includes("Balance mismatch")) {
    return "A prior transaction may have consumed unexpected gas. Check the test ordering and ensure the balance snapshot is taken after all pending transactions confirm.";
  }
  if (error.includes("SIWE") || error.includes("sign")) {
    return "Verify the SIWE message domain matches the staging environment. Check that the wallet's signing key has not rotated.";
  }
  return "Review the error details and check staging environment health.";
}

export function FailureLog({ runs }: FailureLogProps) {
  const failures: FailureEntry[] = [];

  for (const run of runs) {
    for (const test of run.tests) {
      if (test.status === "fail" && test.error) {
        failures.push({
          runId: run.id,
          prNumber: run.prNumber,
          prTitle: run.prTitle,
          prUrl: run.prUrl,
          repo: run.repo,
          timestamp: run.timestamp,
          testName: test.name,
          error: test.error,
          durationMs: test.durationMs,
          suggestedFix: suggestFix(test.name, test.error),
        });
      }
    }
  }

  if (failures.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Failure Log</span>
        </div>
        <p style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-sm)" }}>
          No failures recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Failure Log</span>
        <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-red-60)" }}>
          {failures.length} failure{failures.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3xl)" }}>
        {failures.map((f, i) => (
          <div
            key={i}
            style={{
              padding: "var(--space-2xl)",
              background: "var(--color-red-5)",
              borderRadius: "var(--radi-md)",
              border: "1px solid var(--color-red-20)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-lg)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                <span className="status-dot fail" />
                <span style={{ fontWeight: "var(--font-weight-semi)", fontSize: "var(--font-size-text-sm)" }}>
                  {f.testName}
                </span>
                <span style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)" }}>
                  in
                </span>
                <a
                  href={f.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "var(--font-size-text-sm)", color: "var(--color-text-90)", textDecoration: "none" }}
                >
                  #{f.prNumber} {f.prTitle}
                </a>
              </div>
              <span className="mono" style={{ color: "var(--color-text-40)" }}>
                {formatRelativeTime(f.timestamp)}
              </span>
            </div>

            <div style={{
              padding: "var(--space-md) var(--space-lg)",
              background: "var(--color-background-0)",
              borderRadius: "var(--radi-sm)",
              fontFamily: "var(--font-family-code), monospace",
              fontSize: "var(--font-size-text-xs)",
              color: "var(--color-red-70)",
              lineHeight: 1.5,
              marginBottom: "var(--space-lg)",
            }}>
              {f.error}
            </div>

            <div style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-60)", lineHeight: 1.5 }}>
              <span style={{ fontWeight: "var(--font-weight-semi)", color: "var(--color-text-40)" }}>Suggested fix: </span>
              {f.suggestedFix}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
