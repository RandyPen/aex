import type { AgentEvent } from "@/lib/types";

interface EventListProps {
  events: AgentEvent[];
}

function levelToClass(level: string): string {
  if (level === "error") return "error";
  if (level === "warn") return "warning";
  if (level === "event") return "success";
  return "info";
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventList({ events }: EventListProps) {
  return (
    <ul className="event-list" style={{ maxHeight: 300, overflowY: "auto" }}>
      {events.map((event, i) => (
        <li key={i} className="event-item">
          <span className={`event-icon ${levelToClass(event.level)}`} />
          <span className="event-time">{formatTime(event.ts)}</span>
          <div>
            <span className="event-message">{event.message}</span>
            {event.txHash && (
              <div style={{ marginTop: "2px" }}>
                <span className="mono" style={{ color: "var(--color-emerald-50)", fontSize: "var(--font-size-text-xs)" }}>
                  tx: {event.txHash}
                </span>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
