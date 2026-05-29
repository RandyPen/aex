"use client";

import type { MarketData } from "@/lib/types";

interface MarketScannerProps {
  markets: MarketData[];
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function MarketScanner({ markets }: MarketScannerProps) {
  if (!markets.length) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Market Scanner</span>
        </div>
        <p style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-sm)" }}>No markets being watched.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Market Scanner</span>
        <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
          {markets.length} markets watched
        </span>
      </div>

      {markets.map((market, i) => (
        <div key={i} style={{
          padding: "var(--space-2xl) 0",
          borderBottom: i < markets.length - 1 ? "1px solid var(--color-border-20)" : "none",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-md)" }}>
            <div style={{ flex: 1, marginRight: "var(--space-2xl)" }}>
              <div style={{ fontSize: "var(--font-size-text-sm)", color: "var(--color-text-80)", lineHeight: 1.4, marginBottom: "var(--space-xs)" }}>
                {market.question}
              </div>
              <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "center" }}>
                <span className="tag tag-protocol">{market.category}</span>
                <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
                  Ends: {new Date(market.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: "var(--space-md)", marginBottom: "var(--space-xs)" }}>
                <span className="tag tag-yes">YES ${market.yesPrice.toFixed(2)}</span>
                <span className="tag tag-no">NO ${market.noPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "var(--space-3xl)", fontSize: "var(--font-size-text-xs)" }}>
              <div>
                <span style={{ color: "var(--color-text-40)" }}>24h Vol: </span>
                <span className="mono" style={{ color: "var(--color-text-60)" }}>{formatVolume(market.volume24h)}</span>
              </div>
              <div>
                <span style={{ color: "var(--color-text-40)" }}>Liquidity: </span>
                <span className="mono" style={{ color: "var(--color-text-60)" }}>{formatVolume(market.liquidity)}</span>
              </div>
            </div>
            <div style={{
              fontSize: "var(--font-size-text-xs)",
              color: "var(--color-blue-50)",
              fontStyle: "italic",
              maxWidth: "300px",
              textAlign: "right",
            }}>
              {market.watchReason}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
