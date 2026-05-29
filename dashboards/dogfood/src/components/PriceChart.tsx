"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { PricePoint } from "@/lib/types";

interface PriceChartProps {
  data: PricePoint[];
  highThreshold: number;
  lowThreshold: number;
  tokenSymbol: string;
}

export function PriceChart({ data, highThreshold, lowThreshold, tokenSymbol }: PriceChartProps) {
  const chartData = data.map((d) => ({
    time: new Date(d.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    price: d.price,
    ts: d.ts,
  }));

  return (
    <div style={{ width: "100%", height: 280 }}>
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
            domain={["dataMin - 50", "dataMax + 50"]}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
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
            formatter={(value: number) => [`$${value.toFixed(2)}`, `${tokenSymbol} Price`]}
          />
          <ReferenceLine
            y={highThreshold}
            stroke="#eb302d"
            strokeDasharray="6 4"
            label={{ value: `High $${highThreshold}`, position: "right", fontSize: 11, fill: "#eb302d" }}
          />
          <ReferenceLine
            y={lowThreshold}
            stroke="#3458ea"
            strokeDasharray="6 4"
            label={{ value: `Low $${lowThreshold}`, position: "right", fontSize: 11, fill: "#3458ea" }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#00b88a"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#00b88a" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
