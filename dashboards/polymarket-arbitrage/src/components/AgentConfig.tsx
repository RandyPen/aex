import type { Agent } from "@/lib/types";

interface AgentConfigProps {
  agent: Agent;
}

export function AgentConfig({ agent }: AgentConfigProps) {
  const configEntries = Object.entries(agent.config);
  return (
    <div>
      {configEntries.map(([key, value]) => (
        <div key={key} className="config-row">
          <span className="config-key">{key}</span>
          <span className="config-value">{value}</span>
        </div>
      ))}
    </div>
  );
}
