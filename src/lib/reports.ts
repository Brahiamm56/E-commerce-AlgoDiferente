import { isDatabaseConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export type ReportPoint = { label: string; totalCents: number };
export type RankingPoint = { label: string; value: number; totalCents: number };

export type AdminReports = {
  todayCents: number;
  weekCents: number;
  monthCents: number;
  averageTicketCents: number;
  productsSold: number;
  grossProfitCents: number;
  marginPercent: number;
  salesByDay: ReportPoint[];
  paymentRanking: RankingPoint[];
  topProducts: RankingPoint[];
  topProfitProducts: RankingPoint[];
};

function decimalToCents(value: { toString(): string } | number | null | undefined) {
  if (value == null) return 0;
  return Math.round(Number(value.toString()) * 100);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function emptyReports(): AdminReports {
  return {
    todayCents: 0,
    weekCents: 0,
    monthCents: 0,
    averageTicketCents: 0,
    productsSold: 0,
    grossProfitCents: 0,
    marginPercent: 0,
    salesByDay: [],
    paymentRanking: [],
    topProducts: [],
    topProfitProducts: [],
  };
}

export async function getAdminReports(days = 30): Promise<AdminReports> {
  if (!isDatabaseConfigured()) return emptyReports();

  const now = new Date();
  const today = startOfDay(now);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(today);
  monthStart.setDate(monthStart.getDate() - (days - 1));

  try {
    const [sales, orders] = await Promise.all([
      prisma.sale.findMany({
        where: { createdAt: { gte: monthStart }, status: "COMPLETED" },
        include: { items: true, payments: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: monthStart }, paymentStatus: "APPROVED" },
        include: { items: true, payments: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const buckets = new Map<string, number>();
    const paymentMap = new Map<string, { count: number; cents: number }>();
    const productMap = new Map<string, { quantity: number; cents: number }>();
    const profitMap = new Map<string, { quantity: number; cents: number }>();
    let totalCents = 0;
    let todayCents = 0;
    let weekCents = 0;
    let productsSold = 0;
    let grossProfitCents = 0;
    let tickets = 0;

    for (let index = 0; index < days; index += 1) {
      const date = new Date(monthStart);
      date.setDate(monthStart.getDate() + index);
      buckets.set(date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }), 0);
    }

    function addTicket(date: Date, cents: number, paymentLabel: string) {
      const label = date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
      buckets.set(label, (buckets.get(label) ?? 0) + cents);
      totalCents += cents;
      tickets += 1;
      if (date >= today) todayCents += cents;
      if (date >= weekStart) weekCents += cents;
      const payment = paymentMap.get(paymentLabel) ?? { count: 0, cents: 0 };
      payment.count += 1;
      payment.cents += cents;
      paymentMap.set(paymentLabel, payment);
    }

    for (const sale of sales) {
      addTicket(sale.createdAt, sale.totalCents, sale.paymentMethod);
      for (const item of sale.items) {
        productsSold += item.quantity;
        const revenue = item.priceCents * item.quantity;
        const cost = decimalToCents(item.unitCost) * item.quantity;
        const profit = revenue - cost;
        grossProfitCents += profit;
        const product = productMap.get(item.name) ?? { quantity: 0, cents: 0 };
        product.quantity += item.quantity;
        product.cents += revenue;
        productMap.set(item.name, product);
        const profitProduct = profitMap.get(item.name) ?? { quantity: 0, cents: 0 };
        profitProduct.quantity += item.quantity;
        profitProduct.cents += profit;
        profitMap.set(item.name, profitProduct);
      }
    }

    for (const order of orders) {
      const orderCents = decimalToCents(order.total);
      addTicket(order.createdAt, orderCents, "MERCADO_PAGO");
      for (const item of order.items) {
        productsSold += item.quantity;
        const revenue = decimalToCents(item.total);
        const cost = decimalToCents(item.unitCost) * item.quantity;
        const profit = revenue - cost;
        grossProfitCents += profit;
        const product = productMap.get(item.name) ?? { quantity: 0, cents: 0 };
        product.quantity += item.quantity;
        product.cents += revenue;
        productMap.set(item.name, product);
        const profitProduct = profitMap.get(item.name) ?? { quantity: 0, cents: 0 };
        profitProduct.quantity += item.quantity;
        profitProduct.cents += profit;
        profitMap.set(item.name, profitProduct);
      }
    }

    return {
      todayCents,
      weekCents,
      monthCents: totalCents,
      averageTicketCents: tickets > 0 ? Math.round(totalCents / tickets) : 0,
      productsSold,
      grossProfitCents,
      marginPercent: totalCents > 0 ? Math.round((grossProfitCents / totalCents) * 1000) / 10 : 0,
      salesByDay: Array.from(buckets, ([label, cents]) => ({ label, totalCents: cents })),
      paymentRanking: Array.from(paymentMap, ([label, value]) => ({ label, value: value.count, totalCents: value.cents })).sort((a, b) => b.totalCents - a.totalCents),
      topProducts: Array.from(productMap, ([label, value]) => ({ label, value: value.quantity, totalCents: value.cents })).sort((a, b) => b.value - a.value).slice(0, 8),
      topProfitProducts: Array.from(profitMap, ([label, value]) => ({ label, value: value.quantity, totalCents: value.cents })).sort((a, b) => b.totalCents - a.totalCents).slice(0, 8),
    };
  } catch {
    return emptyReports();
  }
}