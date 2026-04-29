"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Legend,
} from "recharts";
import type { BalanceSnapshot, AgentEvent } from "@/lib/types";

interface BalanceChartProps {
  data: BalanceSnapshot[];
  events: AgentEvent[];
}

export function BalanceChart({ data, events }: BalanceChartProps) {
  const txEvents = events.filter((e) => e.txHash);
  const hasUsdc = data.some((d) => d.usdcBalance !== undefined && d.usdcBalance > 0);

  const chartData = data.map((d) => ({
    time: new Date(d.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    sui: d.balance,
    usdc: d.usdcBalance ?? null,
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
            yAxisId="sui"
            tick={{ fontSize: 12, fill: "#737373" }}
            tickLine={false}
            axisLine={false}
            domain={["dataMin - 0.5", "dataMax + 0.5"]}
            tickFormatter={(v: number) => v.toFixed(2)}
          />
          {hasUsdc && (
            <YAxis
              yAxisId="usdc"
              orientation="right"
              tick={{ fontSize: 12, fill: "#6394fd" }}
              tickLine={false}
              axisLine={false}
              domain={["dataMin - 0.5", "dataMax + 0.5"]}
              tickFormatter={(v: number) => v.toFixed(2)}
            />
          )}
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
              if (name === "sui") return [`${value.toFixed(4)} SUI`, "SUI"];
              if (name === "usdc") return [`${value.toFixed(4)} USDC`, "USDC"];
              return [value, name];
            }}
          />
          {hasUsdc && (
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#737373" }}
              formatter={(value: string) => value === "sui" ? "SUI" : "USDC"}
            />
          )}
          <Line
            yAxisId="sui"
            type="monotone"
            dataKey="sui"
            stroke="#00b88a"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#00b88a" }}
            name="sui"
          />
          {hasUsdc && (
            <Line
              yAxisId="usdc"
              type="monotone"
              dataKey="usdc"
              stroke="#6394fd"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#6394fd" }}
              name="usdc"
              connectNulls
            />
          )}
          {txEvents.map((event, i) => {
            const closest = chartData.reduce((prev, curr) =>
              Math.abs(new Date(curr.ts).getTime() - new Date(event.ts).getTime()) <
              Math.abs(new Date(prev.ts).getTime() - new Date(event.ts).getTime())
                ? curr
                : prev
            );
            return (
              <ReferenceDot
                key={i}
                yAxisId="sui"
                x={closest.time}
                y={closest.sui}
                r={5}
                fill={event.level === "error" ? "#eb302d" : "#62ab14"}
                stroke="none"
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
