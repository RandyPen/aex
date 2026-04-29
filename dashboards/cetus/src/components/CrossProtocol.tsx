"use client";

import type { YieldScanData } from "@/lib/types";

interface CrossProtocolProps {
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

function formatType(type: string): { label: string; color: string; bg: string } {
  if (type === "lending") return { label: "Lending", color: "var(--color-blue-60)", bg: "var(--color-blue-5)" };
  return { label: "Trading Pool", color: "var(--color-emerald-60)", bg: "var(--color-emerald-5)" };
}

export function CrossProtocol({ yieldScan }: CrossProtocolProps) {
  const { crossProtocol, currentPool, bestAlternative } = yieldScan;

  const lending = crossProtocol.filter(p => p.type === "lending");
  const lp = crossProtocol.filter(p => p.type === "lp");

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Yield Across Sui</span>
      </div>

      <div style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)", marginBottom: "var(--space-2xl)" }}>
        How your current strategy compares to alternatives on Sui. Trading pools (like Cetus) tend to offer higher returns but carry more risk. Lending protocols are simpler &mdash; you deposit and earn interest.
      </div>

      {/* Best opportunity callout */}
      {bestAlternative && currentPool.apy !== null && bestAlternative.apy > currentPool.apy && (
        <div style={{
          padding: "var(--space-2xl)",
          background: "var(--color-yellow-5)",
          border: "1px solid var(--color-yellow-50)20",
          borderRadius: "var(--radi-md)",
          marginBottom: "var(--space-3xl)",
          fontSize: "var(--font-size-text-sm)",
        }}>
          <div style={{ fontWeight: "var(--font-weight-semi)", color: "var(--color-text-80)", marginBottom: "var(--space-xs)" }}>
            Higher yield available
          </div>
          <div style={{ color: "var(--color-text-60)", fontSize: "var(--font-size-text-xs)" }}>
            {formatProtocolName(bestAlternative.protocol)} is offering {bestAlternative.apy}% on {bestAlternative.asset} ({bestAlternative.type === "lending" ? "lending" : "trading pool"}).
            You are currently earning {currentPool.apy}% on Cetus.
          </div>
        </div>
      )}

      {/* Trading Pool yields */}
      {lp.length > 0 && (
        <div style={{ marginBottom: "var(--space-3xl)" }}>
          <div style={{
            fontSize: "var(--font-size-text-xs)",
            fontWeight: "var(--font-weight-med)",
            color: "var(--color-text-40)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.05em",
            marginBottom: "var(--space-lg)",
          }}>
            Trading Pools (higher risk, higher return)
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-text-sm)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border-20)" }}>
                  <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-lg)", color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", fontWeight: "var(--font-weight-med)" }}>Protocol</th>
                  <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-lg)", color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", fontWeight: "var(--font-weight-med)" }}>Pair</th>
                  <th style={{ textAlign: "right", padding: "var(--space-md) var(--space-lg)", color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", fontWeight: "var(--font-weight-med)" }}>Annual Return</th>
                  <th style={{ textAlign: "right", padding: "var(--space-md) var(--space-lg)", color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", fontWeight: "var(--font-weight-med)" }}>Total Deposited</th>
                </tr>
              </thead>
              <tbody>
                {lp.map((p, i) => {
                  const isCurrent = p.protocol === "cetus-clmm";
                  return (
                    <tr key={i} style={{
                      borderBottom: "1px solid var(--color-border-20)",
                      background: isCurrent ? "var(--color-green-5)" : "transparent",
                    }}>
                      <td style={{ padding: "var(--space-lg)" }}>
                        {formatProtocolName(p.protocol)}
                        {isCurrent && <span style={{ marginLeft: "var(--space-md)", fontSize: "var(--font-size-text-xs)", color: "var(--color-green-50)" }}>Current</span>}
                      </td>
                      <td style={{ padding: "var(--space-lg)", fontFamily: "var(--font-family-code), monospace" }}>{p.asset}</td>
                      <td style={{
                        textAlign: "right",
                        padding: "var(--space-lg)",
                        fontFamily: "var(--font-family-code), monospace",
                        color: p.apy > 10 ? "var(--color-green-50)" : "var(--color-text-80)",
                        fontWeight: p.apy > 10 ? "var(--font-weight-semi)" : "var(--font-weight-reg)",
                      }}>
                        {p.apy.toFixed(1)}%
                      </td>
                      <td style={{ textAlign: "right", padding: "var(--space-lg)", fontFamily: "var(--font-family-code), monospace", color: "var(--color-text-60)" }}>
                        {formatTvl(p.tvl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lending yields */}
      {lending.length > 0 && (
        <div>
          <div style={{
            fontSize: "var(--font-size-text-xs)",
            fontWeight: "var(--font-weight-med)",
            color: "var(--color-text-40)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.05em",
            marginBottom: "var(--space-lg)",
          }}>
            Lending (lower risk, lower return)
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-text-sm)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border-20)" }}>
                  <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-lg)", color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", fontWeight: "var(--font-weight-med)" }}>Protocol</th>
                  <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-lg)", color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", fontWeight: "var(--font-weight-med)" }}>Asset</th>
                  <th style={{ textAlign: "right", padding: "var(--space-md) var(--space-lg)", color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", fontWeight: "var(--font-weight-med)" }}>Annual Return</th>
                  <th style={{ textAlign: "right", padding: "var(--space-md) var(--space-lg)", color: "var(--color-text-40)", fontSize: "var(--font-size-text-xs)", fontWeight: "var(--font-weight-med)" }}>Total Deposited</th>
                </tr>
              </thead>
              <tbody>
                {lending.map((p, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--color-border-20)" }}>
                    <td style={{ padding: "var(--space-lg)" }}>{formatProtocolName(p.protocol)}</td>
                    <td style={{ padding: "var(--space-lg)", fontFamily: "var(--font-family-code), monospace" }}>{p.asset}</td>
                    <td style={{
                      textAlign: "right",
                      padding: "var(--space-lg)",
                      fontFamily: "var(--font-family-code), monospace",
                      color: "var(--color-text-80)",
                    }}>
                      {p.apy.toFixed(1)}%
                    </td>
                    <td style={{ textAlign: "right", padding: "var(--space-lg)", fontFamily: "var(--font-family-code), monospace", color: "var(--color-text-60)" }}>
                      {formatTvl(p.tvl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
