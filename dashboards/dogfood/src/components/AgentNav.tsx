import type { Agent } from "@/lib/types";

interface AgentNavProps {
  agents: Agent[];
  currentId: string;
  onSelect?: (id: string) => void;
}

export function AgentNav({ agents, currentId, onSelect }: AgentNavProps) {
  return (
    <nav style={{
      display: "flex",
      alignItems: "center",
      gap: "var(--space-xs)",
      marginBottom: "var(--space-4xl)",
      paddingBottom: "var(--space-2xl)",
      borderBottom: "1px solid var(--color-border-20)",
    }}>
      <span style={{
        fontSize: "var(--font-size-text-sm)",
        fontWeight: "var(--font-weight-semi)",
        color: "var(--color-text-90)",
        marginRight: "var(--space-2xl)",
      }}>
        Agent Exchange
      </span>
      {agents.map((agent) => (
        <button
          key={agent.id}
          onClick={() => onSelect?.(agent.id)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-sm)",
            padding: "var(--space-sm) var(--space-xl)",
            borderRadius: "var(--radi-md)",
            border: agent.id === currentId ? "1px solid var(--color-border-30)" : "1px solid transparent",
            background: agent.id === currentId ? "var(--color-background-5)" : "transparent",
            color: agent.id === currentId ? "var(--color-text-90)" : "var(--color-text-40)",
            fontSize: "var(--font-size-text-sm)",
            fontFamily: "inherit",
            cursor: "pointer",
            transition: "all 150ms ease",
          }}
        >
          <span className={`status-dot ${agent.status}`} style={{ marginRight: 0 }} />
          {agent.name}
        </button>
      ))}
    </nav>
  );
}
