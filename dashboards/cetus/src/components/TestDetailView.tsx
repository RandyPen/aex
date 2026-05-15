import type { IndividualTest } from "@/lib/types";

interface TestDetailViewProps {
  tests: IndividualTest[];
}

export function TestDetailView({ tests }: TestDetailViewProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
      {tests.map((test, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-2xl)",
            padding: "var(--space-lg) 0",
            borderBottom: i < tests.length - 1 ? "1px solid var(--color-border-20)" : "none",
          }}
        >
          <span className={`status-dot ${test.status}`} style={{ marginTop: 4 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2xl)", marginBottom: "var(--space-xs)" }}>
              <span style={{ fontWeight: "var(--font-weight-semi)", fontSize: "var(--font-size-text-sm)" }}>
                {test.name}
              </span>
              <span className={`tag tag-${test.status}`}>
                {test.status}
              </span>
              <span className="mono" style={{ color: "var(--color-text-40)" }}>
                {test.durationMs >= 1000
                  ? `${(test.durationMs / 1000).toFixed(1)}s`
                  : `${test.durationMs}ms`}
              </span>
            </div>
            {test.txHash && (
              <div className="mono" style={{ color: "var(--color-emerald-50)", fontSize: "var(--font-size-text-xs)" }}>
                tx: {test.txHash}
              </div>
            )}
            {test.error && (
              <div style={{
                marginTop: "var(--space-sm)",
                padding: "var(--space-md) var(--space-lg)",
                background: "var(--color-red-5)",
                borderRadius: "var(--radi-sm)",
                fontSize: "var(--font-size-text-xs)",
                color: "var(--color-red-70)",
                fontFamily: "var(--font-family-code), monospace",
                lineHeight: 1.5,
              }}>
                {test.error}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
