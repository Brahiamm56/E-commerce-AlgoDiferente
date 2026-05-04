"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCurrencyFromCents } from "@/lib/utils";
import type { RankingPoint, ReportPoint } from "@/lib/reports";

type ReportsChartsProps = {
  salesByDay: ReportPoint[];
  paymentRanking: RankingPoint[];
};

export function ReportsCharts({ salesByDay, paymentRanking }: ReportsChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-800">Ventas por día</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={salesByDay}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} />
              <YAxis tickFormatter={(value) => `$${Number(value) / 100}`} tickLine={false} width={70} />
              <Tooltip formatter={(value) => formatCurrencyFromCents(Number(value))} />
              <Line dataKey="totalCents" dot={false} stroke="var(--accent)" strokeWidth={3} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-800">Medios de pago</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={paymentRanking}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} />
              <YAxis tickFormatter={(value) => `$${Number(value) / 100}`} tickLine={false} width={70} />
              <Tooltip formatter={(value) => formatCurrencyFromCents(Number(value))} />
              <Bar dataKey="totalCents" fill="var(--foreground)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}