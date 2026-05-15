import type { AgentConfig as AgentConfigType } from "@/lib/types";

interface AgentConfigProps {
  config: AgentConfigType;
}

export function AgentConfig({ config }: AgentConfigProps) {
  return (
    <div>
      {Object.entries(config).map(([key, value]) => (
        <div key={key} className="config-row">
          <span className="config-key">{key}</span>
          <span className="config-value">{value}</span>
        </div>
      ))}
    </div>
  );
}
