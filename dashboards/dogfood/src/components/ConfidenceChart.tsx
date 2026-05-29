"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import type { AnalysisEvent } from "@/lib/types";

interface ConfidenceChartProps {
  analyses: AnalysisEvent[];
  confidenceThreshold: number;
}

export function ConfidenceChart({ analyses, confidenceThreshold }: ConfidenceChartProps) {
  const chartData = [...analyses]
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
    .map((a) => ({
      time: new Date(a.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      ts: new Date(a.ts).getTime(),
      confidence: parseFloat((a.confidence * 100).toFixed(1)),
      traded: a.traded,
      market: a.marketQuestion,
      side: a.side,
    }));

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <ScatterChart>
          <XAxis
            dataKey="time"
            type="category"
            tick={{ fontSize: 12, fill: "#737373" }}
            tickLine={false}
            axisLine={{ stroke: "#ebebeb" }}
            allowDuplicatedCategory={false}
          />
          <YAxis
            dataKey="confidence"
            tick={{ fontSize: 12, fill: "#737373" }}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #ebebeb",
              borderRadius: 10,
              fontSize: 13,
              color: "#0a0a0a",
              boxShadow: "0 2px 5px 0 rgba(23, 35, 94, 0.25)",
              maxWidth: "320px",
            }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div style={{ padding: "8px 12px" }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13, lineHeight: 1.3 }}>{d.market}</div>
                  <div style={{ fontSize: 12, color: "#737373" }}>
                    {d.side} at {d.confidence}% confidence
                  </div>
                  <div style={{
                    fontSize: 12,
                    marginTop: 4,
                    color: d.traded ? "#63ad14" : "#737373",
                  }}>
                    {d.traded ? "Trade placed" : "Skipped (below threshold)"}
                  </div>
                </div>
              );
            }}
          />
          <ReferenceLine
            y={confidenceThreshold * 100}
            stroke="#eb302d"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{
              value: `Threshold ${(confidenceThreshold * 100).toFixed(0)}%`,
              position: "insideTopRight",
              fill: "#eb302d",
              fontSize: 11,
            }}
          />
          <Scatter data={chartData} fill="#00b88a">
            {chartData.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.traded ? "#63ad14" : "#a3a3a3"}
                r={entry.traded ? 6 : 4}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
