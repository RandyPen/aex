"use client";

import { useState } from "react";
import type { AnalysisEvent } from "@/lib/types";

interface AnalysisHistoryProps {
  analyses: AnalysisEvent[];
  confidenceThreshold: number;
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function confidenceColor(confidence: number, threshold: number): string {
  if (confidence >= threshold) return "var(--color-green-50)";
  if (confidence >= threshold - 0.1) return "var(--color-yellow-50)";
  return "var(--color-text-40)";
}

export function AnalysisHistory({ analyses, confidenceThreshold }: AnalysisHistoryProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  function toggleRow(index: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  if (!analyses.length) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">LLM Analysis History</span>
        </div>
        <p style={{ color: "var(--color-text-40)", fontSize: "var(--font-size-text-sm)" }}>No analyses yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">LLM Analysis History</span>
        <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--color-text-40)" }}>
          {analyses.length} analyses / threshold: {confidenceThreshold.toFixed(2)}
        </span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-text-sm)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border-20)" }}>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Time</th>
              <th style={{ textAlign: "left", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Market Question</th>
              <th style={{ textAlign: "center", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>LLM Side</th>
              <th style={{ textAlign: "center", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Confidence</th>
              <th style={{ textAlign: "center", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Action</th>
              <th style={{ textAlign: "center", padding: "var(--space-md) var(--space-sm)", color: "var(--color-text-40)", fontWeight: "var(--font-weight-med)", fontSize: "var(--font-size-text-xs)" }}>Reasoning</th>
            </tr>
          </thead>
          <tbody>
            {analyses.map((analysis, i) => (
              <>
                <tr key={`row-${i}`} style={{ borderBottom: expandedRows.has(i) ? "none" : "1px solid var(--color-border-20)" }}>
                  <td style={{ padding: "var(--space-lg) var(--space-sm)", whiteSpace: "nowrap" }}>
                    <span className="mono" style={{ color: "var(--color-text-40)" }}>{formatTime(analysis.ts)}</span>
                  </td>
                  <td style={{ padding: "var(--space-lg) var(--space-sm)", maxWidth: "280px" }}>
                    <div style={{ color: "var(--color-text-80)", fontSize: "var(--font-size-text-sm)", lineHeight: 1.4 }}>
                      {analysis.marketQuestion}
                    </div>
                  </td>
                  <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "center" }}>
                    <span className={`tag ${analysis.side === "YES" ? "tag-yes" : "tag-no"}`}>
                      {analysis.side}
                    </span>
                  </td>
                  <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                      <span style={{
                        fontFamily: "var(--font-family-code), monospace",
                        fontWeight: "var(--font-weight-semi)",
                        color: confidenceColor(analysis.confidence, confidenceThreshold),
                      }}>
                        {(analysis.confidence * 100).toFixed(0)}%
                      </span>
                      <div className="confidence-bar" style={{ width: "60px" }}>
                        <div
                          className="confidence-bar-fill"
                          style={{
                            width: `${analysis.confidence * 100}%`,
                            background: confidenceColor(analysis.confidence, confidenceThreshold),
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "center" }}>
                    <span className={`tag ${analysis.traded ? "tag-traded" : "tag-skipped"}`}>
                      {analysis.traded ? "Traded" : "Skipped"}
                    </span>
                  </td>
                  <td style={{ padding: "var(--space-lg) var(--space-sm)", textAlign: "center" }}>
                    <button className="reasoning-toggle" onClick={() => toggleRow(i)}>
                      {expandedRows.has(i) ? "Hide" : "Show"}
                    </button>
                  </td>
                </tr>
                {expandedRows.has(i) && (
                  <tr key={`reasoning-${i}`} style={{ borderBottom: "1px solid var(--color-border-20)" }}>
                    <td colSpan={6} style={{ padding: "0 var(--space-sm) var(--space-lg)" }}>
                      <div className="reasoning-text">
                        {analysis.reasoning}
                      </div>
                      {(analysis.promptTokens || analysis.costEstimate) && (
                        <div style={{
                          display: "flex",
                          gap: "var(--space-3xl)",
                          marginTop: "var(--space-md)",
                          fontSize: "var(--font-size-text-xs)",
                          color: "var(--color-text-40)",
                        }}>
                          {analysis.llmModel && (
                            <span>Model: <span className="mono">{analysis.llmModel}</span></span>
                          )}
                          {analysis.promptTokens && (
                            <span>Prompt: <span className="mono">{analysis.promptTokens.toLocaleString()}</span> tokens</span>
                          )}
                          {analysis.completionTokens && (
                            <span>Completion: <span className="mono">{analysis.completionTokens.toLocaleString()}</span> tokens</span>
                          )}
                          {analysis.costEstimate && (
                            <span>Cost: <span className="mono">${analysis.costEstimate.toFixed(3)}</span></span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
