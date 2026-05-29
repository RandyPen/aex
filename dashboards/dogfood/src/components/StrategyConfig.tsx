"use client";

import type { Agent } from "@/lib/types";

interface StrategyConfigProps {
  agent: Agent;
}

const strategies = [
  {
    space: "Arbitrum DAO",
    rule: "Always vote FOR on treasury and security proposals. AGAINST on parameter changes unless community sentiment > 70% FOR.",
    autoVote: true,
  },
  {
    space: "Uniswap",
    rule: "Vote AGAINST fee switch proposals. FOR on governance upgrades. Abstain on grants.",
    autoVote: false,
  },
  {
    space: "Aave",
    rule: "Always vote FOR on risk parameter updates from Gauntlet or Chaos Labs. Manual review for others.",
    autoVote: true,
  },
  {
    space: "ENS",
    rule: "Abstain by default. Manual override available for high-impact proposals.",
    autoVote: false,
  },
];

export function StrategyConfig({ agent }: StrategyConfigProps) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Voting Strategy</span>
        <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
          {strategies.length} spaces configured
        </span>
      </div>

      {strategies.map((strategy, i) => (
        <div key={i} style={{
          padding: "var(--space-2xl) 0",
          borderBottom: i < strategies.length - 1 ? "1px solid var(--color-border-20)" : "none",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
              <span className="tag tag-protocol">{strategy.space}</span>
              {strategy.autoVote && (
                <span style={{
                  fontSize: "var(--font-size-text-xs)",
                  color: "var(--color-green-50)",
                  fontFamily: "var(--font-family-code), monospace",
                }}>
                  auto-vote enabled
                </span>
              )}
              {!strategy.autoVote && (
                <span style={{
                  fontSize: "var(--font-size-text-xs)",
                  color: "var(--color-text-40)",
                  fontFamily: "var(--font-family-code), monospace",
                }}>
                  manual review
                </span>
              )}
            </div>
          </div>
          <p style={{
            fontSize: "var(--font-size-text-sm)",
            color: "var(--color-text-60)",
            lineHeight: 1.5,
          }}>
            {strategy.rule}
          </p>
        </div>
      ))}

      <div style={{
        marginTop: "var(--space-2xl)",
        padding: "var(--space-2xl)",
        background: "var(--color-background-10)",
        borderRadius: "var(--radi-md)",
        fontSize: "var(--font-size-text-xs)",
      }}>
        <div style={{ color: "var(--color-text-40)", marginBottom: "var(--space-xs)" }}>
          Delegation fallback
        </div>
        <div style={{ color: "var(--color-text-60)" }}>
          If no strategy rule matches and auto-vote is disabled, the agent delegates its vote to the configured delegate address or abstains after 24 hours.
        </div>
      </div>
    </div>
  );
}
