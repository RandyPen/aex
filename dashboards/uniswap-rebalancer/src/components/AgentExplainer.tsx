import type { Agent } from "@/lib/types";

interface AgentExplainerProps {
  agent: Agent;
  currentStatus: "monitoring" | "rebalancing" | "idle" | "stopped";
  inRange?: boolean;
}

const statusConfig = {
  monitoring: {
    label: "Monitoring range",
    color: "var(--color-green-50)",
    bg: "var(--color-green-5)",
    description: "The agent is actively checking if the current price is within the configured tick range.",
  },
  rebalancing: {
    label: "Rebalancing",
    color: "var(--color-blue-50)",
    bg: "var(--color-blue-5)",
    description: "The agent is executing a rebalance: removing liquidity, collecting fees, and draining to operator.",
  },
  idle: {
    label: "Idle",
    color: "var(--color-yellow-50)",
    bg: "var(--color-yellow-5)",
    description: "The agent is running but waiting for the next poll interval to check the position.",
  },
  stopped: {
    label: "Stopped",
    color: "var(--color-text-40)",
    bg: "var(--color-background-10)",
    description: "The agent is not running.",
  },
};

export function AgentExplainer({ agent, currentStatus, inRange }: AgentExplainerProps) {
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
              This agent manages a {agent.protocol} concentrated-liquidity position on {agent.chain}.
              It monitors the current price relative to the position&apos;s tick range and triggers
              a rebalance when the price drifts outside the configured bounds. On rebalance, it
              removes all liquidity, collects accrued swap fees, and drains tokens back to the operator wallet.
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
              <div style={{ color: "var(--color-text-80)" }}>Swap fees from providing concentrated liquidity within a price range</div>
            </div>
            <div>
              <div style={{ color: "var(--color-text-40)", marginBottom: "2px" }}>Risk</div>
              <div style={{ color: "var(--color-text-80)" }}>Impermanent loss if price moves significantly; gas costs on rebalances</div>
            </div>
            <div>
              <div style={{ color: "var(--color-text-40)", marginBottom: "2px" }}>Security</div>
              <div style={{ color: "var(--color-text-80)" }}>Transactions require two-party signing (WaaP); Privileges limit approved contracts</div>
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
          {inRange !== undefined && (
            <div style={{
              marginTop: "var(--space-md)",
              fontSize: "var(--font-size-text-xs)",
              color: inRange ? "var(--color-green-50)" : "var(--color-red-60)",
              fontFamily: "var(--font-family-code), monospace",
            }}>
              {inRange ? "Position in range" : "Position out of range"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
