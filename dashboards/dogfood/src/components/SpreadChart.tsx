"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import type { SpreadDataPoint } from "@/lib/types";

interface SpreadChartProps {
  data: SpreadDataPoint[];
}

const PAIR_COLORS: Record<string, string> = {
  "Fed cuts / Fed holds": "#4e77f4",
  "BTC $130k / BTC $125k": "#ff6333",
  "NVIDIA beat / miss": "#932ed6",
  "EU AI strict / framework": "#00b88a",
};

export function SpreadChart({ data }: SpreadChartProps) {
  // Pivot data so each timestamp has one column per pair
  const pairs = [...new Set(data.map((d) => d.pair))];
  const byTime = new Map<string, Record<string, number | string>>();

  for (const d of data) {
    const time = new Date(d.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (!byTime.has(d.ts)) {
      byTime.set(d.ts, { time, ts: d.ts });
    }
    const row = byTime.get(d.ts)!;
    row[d.pair] = d.spreadBps;
  }

  const chartData = [...byTime.values()];

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: "#737373" }}
            tickLine={false}
            axisLine={{ stroke: "#ebebeb" }}
            interval={Math.floor(chartData.length / 6)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#737373" }}
            tickLine={false}
            axisLine={false}
            domain={[0, "dataMax + 50"]}
            tickFormatter={(v: number) => `${v}`}
            label={{ value: "bps", position: "insideTopLeft", fontSize: 11, fill: "#737373" }}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #ebebeb",
              borderRadius: 10,
              fontSize: 13,
              color: "#0a0a0a",
              boxShadow: "0 2px 5px 0 rgba(23, 35, 94, 0.25)",
            }}
            formatter={(value: number, name: string) => [`${value} bps`, name]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          <ReferenceLine
            y={120}
            stroke="#d88e03"
            strokeDasharray="4 4"
            label={{ value: "threshold", position: "insideTopRight", fontSize: 10, fill: "#d88e03" }}
          />
          {pairs.map((pair) => (
            <Line
              key={pair}
              type="monotone"
              dataKey={pair}
              stroke={PAIR_COLORS[pair] ?? "#737373"}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
