interface StatCardProps {
  label: string;
  value: string;
  indicator?: "running" | "stopped" | "error";
  color?: string;
}

export function StatCard({ label, value, indicator, color }: StatCardProps) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color, display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {indicator && <span className={`status-dot ${indicator}`} />}
        {indicator ? value.charAt(0).toUpperCase() + value.slice(1) : value}
      </div>
    </div>
  );
}
