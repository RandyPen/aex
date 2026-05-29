import type { Agent } from "@/lib/types";

interface AgentExplainerProps {
  agent: Agent;
  currentStatus: "earning" | "rebalancing" | "out_of_range" | "stopped";
  drift?: number;
  threshold?: number;
}

const statusConfig = {
  earning: {
    label: "Earning fees",
    color: "var(--color-green-50)",
    bg: "var(--color-green-5)",
    description: "The agent's funds are active in the pool. Every time someone trades in this pool, the agent earns a small fee.",
  },
  rebalancing: {
    label: "Repositioning",
    color: "var(--color-yellow-50)",
    bg: "var(--color-yellow-5)",
    description: "The market price has moved away from where the agent's funds are placed. It's withdrawing and redepositing at the new price so it can keep earning.",
  },
  out_of_range: {
    label: "Not earning",
    color: "var(--color-red-60)",
    bg: "var(--color-red-5)",
    description: "The market price has moved outside the agent's active zone. The agent is not earning fees until it repositions.",
  },
  stopped: {
    label: "Stopped",
    color: "var(--color-text-40)",
    bg: "var(--color-background-10)",
    description: "The agent is not running.",
  },
};

export function AgentExplainer({ agent, currentStatus, drift, threshold }: AgentExplainerProps) {
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
              This agent deposits funds into a {agent.chain} trading pool on {agent.protocol} and
              earns a share of the trading fees. It only earns when the market price stays within
              a chosen price range. When the price moves too far, the agent automatically withdraws
              and redeposits at the new price to keep earning.
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
              <div style={{ color: "var(--color-text-80)" }}>A cut of every trade in the pool</div>
            </div>
            <div>
              <div style={{ color: "var(--color-text-40)", marginBottom: "2px" }}>Risk</div>
              <div style={{ color: "var(--color-text-80)" }}>Token prices can shift, reducing value vs. just holding</div>
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
          {drift !== undefined && threshold !== undefined && (
            <div style={{
              marginTop: "var(--space-md)",
              fontSize: "var(--font-size-text-xs)",
              color: "var(--color-text-40)",
              fontFamily: "var(--font-family-code), monospace",
            }}>
              Price offset: {drift} / {threshold}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
