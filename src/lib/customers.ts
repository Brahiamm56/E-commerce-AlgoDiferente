import { isDatabaseConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export type AdminCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  debtCents: number;
  creditLimitCents: number;
  salesCount: number;
  lastLedger: Array<{ id: string; type: string; amountCents: number; createdAt: Date; reference: string | null }>;
};

function decimalToCents(value: { toString(): string }) {
  return Math.round(Number(value.toString()) * 100);
}

export async function getAdminCustomers(): Promise<AdminCustomer[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const customers = await prisma.customer.findMany({
      include: {
        _count: { select: { sales: true } },
        ledgerEntries: { orderBy: { createdAt: "desc" }, take: 3 },
      },
      orderBy: [{ debtAccumulated: "desc" }, { name: "asc" }],
    });

    return customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      debtCents: decimalToCents(customer.debtAccumulated),
      creditLimitCents: decimalToCents(customer.creditLimit),
      salesCount: customer._count.sales,
      lastLedger: customer.ledgerEntries.map((entry) => ({
        id: entry.id,
        type: entry.type,
        amountCents: decimalToCents(entry.amount),
        createdAt: entry.createdAt,
        reference: entry.reference,
      })),
    }));
  } catch {
    return [];
  }
}