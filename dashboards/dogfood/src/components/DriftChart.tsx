"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { DriftPoint } from "@/lib/types";

interface DriftChartProps {
  data: DriftPoint[];
  rangeBps?: number;
}

export function DriftChart({ data, rangeBps = 500 }: DriftChartProps) {
  const halfRange = Math.floor(rangeBps / 2);

  const chartData = data.map((d) => ({
    time: new Date(d.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    drift: d.driftBps,
    price: d.price,
    ts: d.ts,
  }));

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <XAxis
            dataKey="time"
            tick={{ fontSize: 12, fill: "#737373" }}
            tickLine={false}
            axisLine={{ stroke: "#ebebeb" }}
            interval={Math.floor(chartData.length / 6)}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#737373" }}
            tickLine={false}
            axisLine={false}
            domain={[-(halfRange + 100), halfRange + 100]}
            tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #ebebeb",
              borderRadius: 10,
              fontSize: 14,
              color: "#0a0a0a",
              boxShadow: "0 2px 5px 0 rgba(23, 35, 94, 0.25)",
            }}
            formatter={(value: number, name: string) => {
              if (name === "drift") return [`${value > 0 ? "+" : ""}${value} bps`, "Drift from center"];
              return [value, name];
            }}
          />
          <ReferenceLine
            y={halfRange}
            stroke="#eb302d"
            strokeDasharray="4 4"
            label={{ value: "Upper", fill: "#eb302d", fontSize: 11, position: "right" }}
          />
          <ReferenceLine
            y={-halfRange}
            stroke="#eb302d"
            strokeDasharray="4 4"
            label={{ value: "Lower", fill: "#eb302d", fontSize: 11, position: "right" }}
          />
          <ReferenceLine
            y={0}
            stroke="#737373"
            strokeDasharray="2 2"
          />
          <Line
            type="monotone"
            dataKey="drift"
            stroke="#6394fd"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#6394fd" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
