import type { Agent } from "@/lib/types";

interface AgentExplainerProps {
  agent: Agent;
  currentStatus: "trading" | "scanning" | "idle" | "stopped";
  openPositions?: number;
}

const statusConfig = {
  trading: {
    label: "Actively trading",
    color: "var(--color-green-50)",
    bg: "var(--color-green-5)",
    description: "The agent is placing trades on prediction markets based on its edge detection signals.",
  },
  scanning: {
    label: "Scanning markets",
    color: "var(--color-blue-50)",
    bg: "var(--color-blue-5)",
    description: "The agent is analyzing prediction markets for mispriced outcomes. No active trades being placed right now.",
  },
  idle: {
    label: "Idle",
    color: "var(--color-yellow-50)",
    bg: "var(--color-yellow-5)",
    description: "The agent is running but not actively scanning or trading. Waiting for the next cycle.",
  },
  stopped: {
    label: "Stopped",
    color: "var(--color-text-40)",
    bg: "var(--color-background-10)",
    description: "The agent is not running.",
  },
};

export function AgentExplainer({ agent, currentStatus, openPositions }: AgentExplainerProps) {
  const status = statusConfig[currentStatus];

  return (
    <div className="card" style={{ marginBottom: "var(--space-4xl)" }}>
      <div style={{ display: "flex", alignItems: "stretch", gap: "var(--space-3xl)" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, justifyContent: "space-between" }}>
          <div>
            <div style={{
              fontSize: "var(--font-size-text-xs)",
              fontWeight: "var(--font-weight-med)",
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
              color: "var(--color-text-40)",
              marginBottom: "var(--space-md)",
            }}>
              What is this agent doing?
            </div>
            <p style={{
              fontSize: "var(--font-size-text-sm)",
              color: "var(--color-text-60)",
              lineHeight: "var(--line-height-text-sm)",
            }}>
              This agent trades on {agent.protocol} prediction markets on {agent.chain}.
              It scans for mispriced outcomes using edge detection algorithms, places trades
              when it identifies high-conviction opportunities, and manages open positions
              with automated stop-losses and take-profit targets.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--space-2xl)",
            fontSize: "var(--font-size-text-xs)",
            marginTop: "var(--space-2xl)",
            paddingTop: "var(--space-2xl)",
            borderTop: "1px solid var(--color-border-20)",
          }}>
            <div>
              <div style={{ color: "var(--color-text-40)", marginBottom: "2px" }}>How it earns</div>
              <div style={{ color: "var(--color-text-80)" }}>Buying underpriced outcome shares, selling at a profit</div>
            </div>
            <div>
              <div style={{ color: "var(--color-text-40)", marginBottom: "2px" }}>Risk</div>
              <div style={{ color: "var(--color-text-80)" }}>Markets can resolve against positions, causing total loss of stake</div>
            </div>
            <div>
              <div style={{ color: "var(--color-text-40)", marginBottom: "2px" }}>Security</div>
              <div style={{ color: "var(--color-text-80)" }}>Transactions require two-party signing (WaaP)</div>
            </div>
          </div>
        </div>

        <div style={{
          background: status.bg,
          border: `1px solid ${status.color}20`,
          borderRadius: "var(--radi-lg)",
          padding: "var(--space-3xl)",
          width: "200px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center" as const,
        }}>
          <div style={{
            width: "10px",
            height: "10px",
            borderRadius: "var(--radi-full)",
            background: status.color,
            boxShadow: `0 0 6px ${status.color}`,
            marginBottom: "var(--space-md)",
          }} />
          <div style={{
            fontSize: "var(--font-size-text-sm)",
            fontWeight: "var(--font-weight-semi)",
            color: status.color,
            marginBottom: "var(--space-xs)",
          }}>
            {status.label}
          </div>
          <div style={{
            fontSize: "var(--font-size-text-xs)",
            color: "var(--color-text-40)",
            lineHeight: "var(--line-height-text-xs)",
          }}>
            {status.description}
          </div>
          {openPositions !== undefined && openPositions > 0 && (
            <div style={{
              marginTop: "var(--space-md)",
              fontSize: "var(--font-size-text-xs)",
              color: "var(--color-text-40)",
              fontFamily: "var(--font-family-code), monospace",
            }}>
              {openPositions} open position{openPositions !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
