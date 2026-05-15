"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { GasSpendPoint } from "@/lib/types";

interface BalanceChartProps {
  data: GasSpendPoint[];
}

export function BalanceChart({ data }: BalanceChartProps) {
  const chartData = data.map((d) => ({
    date: new Date(d.ts).toLocaleDateString([], { month: "short", day: "numeric" }),
    gasSpendUsd: d.gasSpendUsd,
  }));

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="gasGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff6333" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ff6333" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#737373" }}
            tickLine={false}
            axisLine={{ stroke: "#ebebeb" }}
            interval={Math.floor(chartData.length / 5)}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#737373" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
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
            formatter={(value: number) => [`$${value.toFixed(4)}`, "Cumulative Gas"]}
          />
          <Area
            type="monotone"
            dataKey="gasSpendUsd"
            stroke="#ff6333"
            strokeWidth={2}
            fill="url(#gasGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "#ff6333" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
