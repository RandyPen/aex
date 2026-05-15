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

function humanReadableMessage(event: AgentEvent): { title: string; detail?: string } {
  const msg = event.message;
  const data = event.data || {};

  if (msg === "balance_snapshot") {
    return { title: `Wallet balance: $${Number(data.balance).toFixed(2)} USDC` };
  }
  if (msg === "market_scan") {
    return { title: "Scanned prediction markets", detail: `Found ${data.matchCount ?? "?"} markets with edge` };
  }
  if (msg === "trade_placed") {
    return { title: `Placed ${data.side} order on market`, detail: `$${data.amount} at ${data.price}` };
  }
  if (msg === "trade_filled") {
    return { title: `Trade filled: ${data.side} at $${data.price}`, detail: String(data.marketQuestion ?? "") };
  }
  if (msg === "trade_cancelled") {
    return { title: "Trade cancelled", detail: String(data.reason ?? "") };
  }
  if (msg === "position_closed") {
    const pnl = Number(data.pnl ?? 0);
    return { title: `Position closed: ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}` };
  }
  if (msg === "stop_loss") {
    return { title: "Stop-loss triggered", detail: String(data.marketQuestion ?? "") };
  }
  if (msg === "Agent starting") {
    return { title: `Agent started in ${data.mode} mode` };
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
