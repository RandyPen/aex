interface StatCardProps {
  label: string;
  value: string;
  indicator?: "pass" | "fail" | "running" | "stopped";
  color?: string;
}

export function StatCard({ label, value, indicator, color }: StatCardProps) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color, display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {indicator && <span className={`status-dot ${indicator}`} />}
        {value}
      </div>
    </div>
  );
}
