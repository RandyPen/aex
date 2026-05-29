import type { Agent } from "@/lib/types";

interface AgentConfigProps {
  agent: Agent;
}

export function AgentConfig({ agent }: AgentConfigProps) {
  return (
    <div>
      {Object.entries(agent.config ?? {}).map(([key, value]) => (
        <div key={key} className="config-row">
          <span className="config-key">{key}</span>
          <span className="config-value">{value}</span>
        </div>
      ))}
    </div>
  );
}
