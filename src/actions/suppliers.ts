"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/lib/admin";
import { isDatabaseConfigured } from "@/lib/env";
import { logAndMaskError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { supplierCreateSchema } from "@/schemas/supplier";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createSupplierAction(formData: FormData) {
  await requireAdminSession();
  if (!isDatabaseConfigured()) return;

  const parsed = supplierCreateSchema.safeParse({
    name: getString(formData, "name"),
    contactName: getString(formData, "contactName"),
    phone: getString(formData, "phone"),
    email: getString(formData, "email"),
    address: getString(formData, "address"),
    notes: getString(formData, "notes"),
  });

  if (!parsed.success) return;

  try {
    await prisma.supplier.create({
      data: {
        name: parsed.data.name,
        contactName: parsed.data.contactName || null,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        address: parsed.data.address || null,
        notes: parsed.data.notes || null,
      },
    });
  } catch (error) {
    logAndMaskError("create-supplier", error, "No fue posible crear el proveedor.");
  }

  revalidatePath("/admin/proveedores");
  revalidatePath("/admin/compras");
}