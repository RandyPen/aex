"use client";

import type { YieldScanData } from "@/lib/types";

interface PoolComparisonProps {
  yieldScan: YieldScanData;
}

function formatTvl(tvl: number): string {
  if (tvl >= 1_000_000) return `$${(tvl / 1_000_000).toFixed(1)}M`;
  if (tvl >= 1_000) return `$${(tvl / 1_000).toFixed(0)}K`;
  return `$${tvl}`;
}

function formatProtocolName(name: string): string {
  const map: Record<string, string> = {
    "cetus-clmm": "Cetus",
    "bluefin-spot": "Bluefin",
    "turbos": "Turbos",
    "flowx-v3": "FlowX",
    "full-sail": "Full Sail",
    "navi-lending": "NAVI",
    "scallop-lend": "Scallop",
    "current": "Current",
    "kai-finance": "Kai Finance",
  };
  return map[name] || name;
}

export function PoolComparison({ yieldScan }: PoolComparisonProps) {
  const { cetusTopPools, currentPool, scanTime } = yieldScan;

  const scanAge = Math.round((Date.now() - new Date(scanTime).getTime()) / 60000);
  const scanAgeLabel = scanAge < 1 ? "just now" : scanAge < 60 ? `${scanAge}m ago` : `${Math.round(scanAge / 60)}h ago`;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Cetus Pool Comparison</span>
        <span style={{
          fontSize: "var(--font-size-text-xs)",
          color: "var(--color-text-40)",
          fontFamily: "var(--font-family-code), monospace",
        }}>
          Updated {scanAgeLabel}
        </span>
      </div>

      <div style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)", marginBottom: "var(--space-2xl)" }}>
        Top Cetus pools by annual return. The agent currently deposits into the highlighted pool. In a future version, it will automatically move funds to the best opportunity.
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-text-sm)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border-20)" }}>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-lg)", color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", fontWeight: "var(--font-weight-med)" }}>Pool</th>
              <th style={{ textAlign: "right", padding: "var(--space-md) var(--space-lg)", color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", fontWeight: "var(--font-weight-med)" }}>Annual Return</th>
              <th style={{ textAlign: "right", padding: "var(--space-md) var(--space-lg)", color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", fontWeight: "var(--font-weight-med)" }}>Total Deposited</th>
            </tr>
          </thead>
          <tbody>
            {cetusTopPools.map((pool, i) => {
              const isActive = pool.symbol === "USDC-SUI" || pool.symbol === "SUI-USDC" || pool.symbol === currentPool.symbol;
              return (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid var(--color-border-20)",
                    background: isActive ? "var(--color-green-5)" : "transparent",
                  }}
                >
                  <td style={{ padding: "var(--space-lg)", fontFamily: "var(--font-family-code), monospace" }}>
                    {pool.symbol}
                    {isActive && (
                      <span style={{
                        marginLeft: "var(--space-md)",
                        fontSize: "var(--font-size-text-xs)",
                        color: "var(--color-green-50)",
                        fontWeight: "var(--font-weight-med)",
                      }}>
                        Active
                      </span>
                    )}
                  </td>
                  <td style={{
                    textAlign: "right",
                    padding: "var(--space-lg)",
                    fontFamily: "var(--font-family-code), monospace",
                    color: pool.apy > 10 ? "var(--color-green-50)" : "var(--color-text-80)",
                    fontWeight: pool.apy > 10 ? "var(--font-weight-semi)" : "var(--font-weight-reg)",
                  }}>
                    {pool.apy.toFixed(1)}%
                  </td>
                  <td style={{
                    textAlign: "right",
                    padding: "var(--space-lg)",
                    fontFamily: "var(--font-family-code), monospace",
                    color: "var(--color-text-60)",
                  }}>
                    {formatTvl(pool.tvl)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {currentPool.rank && (
        <div style={{
          marginTop: "var(--space-2xl)",
          padding: "var(--space-2xl)",
          background: "var(--color-background-10)",
          borderRadius: "var(--radi-md)",
          fontSize: "var(--font-size-text-xs)",
          color: "var(--color-text-60)",
        }}>
          Your pool ({currentPool.symbol}) is ranked #{currentPool.rank} on Cetus
          {currentPool.apy && ` at ${currentPool.apy}% annual return`}.
          {currentPool.rank > 1 && " A higher-yielding pool exists, but moving funds costs transaction fees and carries risk."}
        </div>
      )}
    </div>
  );
}
