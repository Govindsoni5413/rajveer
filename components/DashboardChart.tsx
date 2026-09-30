"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/format";

interface DashboardChartProps {
  data: Array<{
    month: string;
    billed: number;
    received: number;
  }>;
}

export function DashboardChart({ data }: DashboardChartProps) {
  const hasData = data.some((d) => d.billed > 0 || d.received > 0);

  if (!hasData) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-[#FFFBEB]/30 rounded-2xl border border-dashed border-[#EFE7C8]">
        <div className="w-10 h-10 rounded-full bg-[#FFF3C4] flex items-center justify-center text-[#D99A00] mb-2 font-bold">
          ₹
        </div>
        <p className="text-sm font-semibold text-[#0A0A0A]">No transaction data for chart</p>
        <p className="text-xs text-[#6B6B6B] mt-0.5">
          Monthly comparison will appear here once bills and payments are recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="h-72 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFE7C8" />
          <XAxis
            dataKey="month"
            tick={{ fill: "#6B6B6B", fontSize: 12 }}
            axisLine={{ stroke: "#EFE7C8" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#6B6B6B", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => {
              if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
              if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
              return `₹${val}`;
            }}
          />
          <Tooltip
            formatter={(value: any) => [formatCurrency(Number(value) || 0)]}
            contentStyle={{
              backgroundColor: "#FFFFFF",
              borderColor: "#EFE7C8",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              fontSize: "12px",
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: "10px", fontSize: "12px" }}
          />
          <Bar
            name="Billed"
            dataKey="billed"
            fill="#0A0A0A"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
          <Bar
            name="Received"
            dataKey="received"
            fill="#F5B400"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
