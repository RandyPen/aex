import type { AgentEvent } from "@/lib/types";

interface EventListProps {
  events: AgentEvent[];
}

function levelToClass(level: string): string {
  if (level === "error" || level === "warn") return "error";
  if (level === "event") return "success";
  return "info";
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function humanReadableMessage(event: AgentEvent): { title: string; detail?: string } {
  const msg = event.message;
  const data = event.data || {};

  if (msg === "balance_snapshot") {
    return { title: `Wallet balance: ${Number(data.balance).toFixed(4)} SUI` };
  }
  if (msg === "Cycle") {
    return { title: "Checked market price", detail: `Balance: ${data.balance} SUI` };
  }
  if (msg === "Agent starting") {
    return { title: `Agent started in ${data.mode} mode` };
  }
  if (msg === "rebalance_start") {
    return { title: "Repositioning — price moved too far from earning zone" };
  }
  if (msg === "rebalance_complete") {
    return { title: "Repositioned — now earning at the new price", detail: `New zone set` };
  }
  if (msg === "remove_liquidity_complete") {
    return { title: "Withdrew funds from old position and collected fees" };
  }
  if (msg === "drift_detected") {
    return { title: `Price moved ${data.drift} units from center`, detail: "Reposition triggered" };
  }
  if (msg === "out_of_range") {
    return { title: "Price left the earning zone — not earning fees" };
  }
  if (msg === "no_positions") {
    return { title: "No active deposits found in the pool" };
  }
  if (msg === "position_status") {
    return { title: `Position check: offset ${data.drift} units` };
  }
  if (msg === "sim_position_opened" || msg === "Monitor: opened") {
    return { title: "Simulated deposit into pool" };
  }
  if (msg === "sim_rebalance") {
    return { title: "Simulated reposition — would have moved funds" };
  }
  if (msg === "sim_drift_detected") {
    return { title: `Simulated: price moved ${data.drift} units` };
  }
  if (msg?.startsWith("Position in range")) {
    return { title: "Position healthy — earning fees", detail: `Price offset: ${data.drift || "?"} units` };
  }
  if (msg?.startsWith("Found")) {
    return { title: msg };
  }
  if (event.level === "error") {
    return { title: `Error: ${msg}` };
  }
  return { title: String(msg) };
}

export function EventList({ events }: EventListProps) {
  return (
    <ul className="event-list" style={{ maxHeight: 300, overflowY: "auto" }}>
      {events.map((event, i) => {
        const { title, detail } = humanReadableMessage(event);
        return (
          <li key={i} className="event-item">
            <span className={`event-icon ${levelToClass(event.level)}`} />
            <span className="event-time">{formatTime(event.ts)}</span>
            <div>
              <span className="event-message">{title}</span>
              {detail && (
                <div style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)", marginTop: "2px" }}>
                  {detail}
                </div>
              )}
              {event.txHash && (
                <div style={{ marginTop: "2px" }}>
                  <span className="mono" style={{ color: "var(--color-emerald-50)", fontSize: "var(--font-size-text-xs)" }}>
                    tx: {event.txHash}
                  </span>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
