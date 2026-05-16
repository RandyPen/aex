"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { BalanceSnapshot } from "@/lib/types";

interface BalanceChartProps {
  data: BalanceSnapshot[];
}

export function BalanceChart({ data }: BalanceChartProps) {
  const chartData = data.map((d) => ({
    time: new Date(d.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    balance: d.balance,
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
            domain={["dataMin - 20", "dataMax + 20"]}
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
            formatter={(value: number) => [`$${value.toFixed(2)}`, "Balance"]}
          />
          <Line
            type="monotone"
            dataKey="balance"
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
