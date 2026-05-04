import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CircleDollarSign,
  PackageOpen,
  PackageCheck,
  Percent,
  Receipt,
  ShoppingBag,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";

import { ReportsCharts } from "@/components/admin/reports-charts";
import StatsCard from "@/components/admin/stats-card";
import { getAdminCategories, getAdminProducts } from "@/lib/admin-catalog";
import { getSales, getSalesSummary } from "@/lib/admin-sales";
import { getAdminReports } from "@/lib/reports";
import { formatCurrencyFromCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hace instantes";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export default async function AdminOverviewPage() {
  const [products, categories, sales, salesSummary, reports] = await Promise.all([
    getAdminProducts(),
    getAdminCategories(),
    getSales(5),
    getSalesSummary(),
    getAdminReports(30),
  ]);

  const lowStockProducts = products.filter((product) => product.stock <= 3);

  const recentProducts = [...products]
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Encabezado simple */}
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-black">Sistemas en línea</p>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-black">
          Resumen general
        </h2>
        <p className="text-sm text-black">
          Métricas operativas en tiempo real de tu tienda y rendimiento de ventas.
        </p>
      </header>

      {/* KPIs Principales (simplificado) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatsCard
          icon={CircleDollarSign}
          title="Ventas Hoy"
          value={formatCurrencyFromCents(reports.todayCents)}
          accent="emerald"
        />
        <StatsCard
          icon={TrendingUp}
          title="Semana"
          value={formatCurrencyFromCents(reports.weekCents)}
          accent="violet"
        />
        <StatsCard
          icon={BarChart3}
          title="Mes"
          value={formatCurrencyFromCents(reports.monthCents)}
          accent="violet"
        />
        <StatsCard
          icon={PackageCheck}
          title="Productos"
          value={reports.productsSold.toString()}
          accent="emerald"
        />
        <StatsCard
          icon={Percent}
          title="Margen"
          value={`${reports.marginPercent}%`}
          accent="amber"
        />
        <StatsCard
          icon={ShoppingBag}
          title="Órdenes Pendientes"
          value={salesSummary.pendingCount.toString()}
          accent="amber"
        />
      </div>

      {/* Main Charts & Data */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-800">
                Reportes comerciales
              </h3>
              <p className="text-xs text-slate-400">Ventas por día y ranking de medios de pago.</p>
            </div>
            <Link
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700"
              href="/admin/pos"
            >
              Ir al POS <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <ReportsCharts paymentRanking={reports.paymentRanking} salesByDay={reports.salesByDay} />
        </div>

        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-800">
              Ventas recientes
            </h3>
            <Link
              href="/admin/pos"
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 transition-colors hover:text-violet-700"
            >
              Nueva venta <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <div className="flex-1 space-y-3">
            {sales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Receipt className="mb-2 h-8 w-8 opacity-30" />
                <p className="text-sm">Aún no hay ventas registradas</p>
                <Link
                  className="mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  href="/admin/pos"
                >
                  Abrir POS
                </Link>
              </div>
            ) : (
              sales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100">
                    <Receipt className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-semibold text-slate-700">
                      {sale.customerName ?? "Mostrador"}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {sale.itemCount} item{sale.itemCount === 1 ? "" : "s"} · {timeAgo(sale.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    {formatCurrencyFromCents(sale.totalCents)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-800">
            Top productos vendidos
          </h3>
          <div className="mt-4 divide-y divide-slate-100">
            {reports.topProducts.length === 0 ? (
              <p className="py-6 text-sm text-slate-400">Sin ventas suficientes para ranking.</p>
            ) : (
              reports.topProducts.map((item) => (
                <div className="flex items-center justify-between gap-3 py-3 text-sm" key={item.label}>
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="text-right text-slate-500">
                    {item.value} u. · {formatCurrencyFromCents(item.totalCents)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-800">
            Top rentabilidad
          </h3>
          <div className="mt-4 divide-y divide-slate-100">
            {reports.topProfitProducts.length === 0 ? (
              <p className="py-6 text-sm text-slate-400">Sin margen calculado todavía.</p>
            ) : (
              reports.topProfitProducts.map((item) => (
                <div className="flex items-center justify-between gap-3 py-3 text-sm" key={item.label}>
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="text-right text-slate-500">
                    {formatCurrencyFromCents(item.totalCents)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-slate-800">
              Productos recientes
            </h3>
            <Link
              href="/admin/productos"
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 transition-colors hover:text-violet-700"
            >
              Ver todos <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <PackageOpen className="mb-2 h-8 w-8 opacity-30" />
                <p className="text-sm">Aún no hay productos</p>
              </div>
            ) : (
              recentProducts.map((product) => {
                const created = product.createdAt ? new Date(product.createdAt) : null;
                const statusLabel =
                  product.status === "PUBLISHED"
                    ? "Publicado"
                    : product.status === "DRAFT"
                      ? "Borrador"
                      : "Archivado";
                const statusColor =
                  product.status === "PUBLISHED"
                    ? "text-emerald-600"
                    : product.status === "DRAFT"
                      ? "text-amber-600"
                      : "text-slate-400";

                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-violet-50">
                      <PackageOpen className="h-4 w-4 text-violet-600" />
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-semibold text-slate-700">{product.name}</p>
                      <p className="truncate text-xs text-slate-400">
                        {created ? timeAgo(created) : "—"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">
                        {formatCurrencyFromCents(product.priceCents)}
                      </p>
                      <p className={`text-[10px] font-bold uppercase ${statusColor}`}>
                        {statusLabel}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-500">
            Atención inmediata
          </p>
          <div className="mt-4 space-y-3">
            {lowStockProducts.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                  ✓
                </span>
                No hay alertas de stock bajo ahora mismo.
              </div>
            ) : (
              lowStockProducts.slice(0, 4).map((product) => (
                <div
                  key={product.id}
                  className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <TriangleAlert className="size-4" />
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{product.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">/{product.slug}</p>
                    <p className="mt-1 text-sm font-semibold text-amber-700">
                      {product.stock} unidades disponibles
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-500">Categorías</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.length === 0 ? (
            <p className="text-sm text-slate-400">Aún no hay categorías.</p>
          ) : (
            categories.map((category) => (
              <div
                key={category.slug}
                className="rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 transition hover:border-violet-200 hover:shadow-sm"
              >
                <p className="font-medium text-slate-800">{category.name}</p>
                {category.description ? (
                  <p className="mt-1 text-xs leading-5 text-slate-500">{category.description}</p>
                ) : null}
                <p className="mt-2 text-sm font-medium text-violet-600">
                  {category.productCount} productos
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
