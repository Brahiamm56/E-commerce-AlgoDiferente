import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { hasAdminAccess } from "@/lib/admin";
import { getAuthSession } from "@/lib/auth";
import { getStoreSettings } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    purchaseOrderId: string;
  }>;
};

function getCurrencyFormatter(currency: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
}

function decimalToNumber(value: { toString(): string }) {
  return Number(value.toString());
}

async function loadLogoImageId(workbook: ExcelJS.Workbook, logoUrl?: string) {
  if (!logoUrl) return null;

  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    const extension =
      contentType.includes("png")
        ? "png"
        : contentType.includes("jpeg") || contentType.includes("jpg")
          ? "jpeg"
          : null;

    if (!extension) return null;

    const arrayBuffer = await response.arrayBuffer();
    const base64 = `data:${contentType};base64,${Buffer.from(new Uint8Array(arrayBuffer)).toString("base64")}`;

    return workbook.addImage({
      base64,
      extension,
    });
  } catch {
    return null;
  }
}

export async function GET(_: Request, context: RouteContext) {
  const session = await getAuthSession();

  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!hasAdminAccess(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { purchaseOrderId } = await context.params;
  const [settings, order] = await Promise.all([
    getStoreSettings(),
    prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        supplier: true,
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: [{ variant: { product: { name: "asc" } } }, { variant: { colorName: "asc" } }, { variant: { size: "asc" } }],
        },
      },
    }),
  ]);

  if (!order) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = settings.name;
  workbook.company = settings.name;
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("Orden de compra", {
    views: [{ state: "frozen", ySplit: 8 }],
  });

  worksheet.properties.defaultRowHeight = 22;
  worksheet.columns = [
    { key: "product", width: 30 },
    { key: "color", width: 18 },
    { key: "size", width: 12 },
    { key: "sku", width: 20 },
    { key: "quantity", width: 12 },
    { key: "unitCost", width: 16 },
    { key: "subtotal", width: 16 },
  ];

  const currencyFormatter = getCurrencyFormatter(settings.currency);
  const logoImageId = await loadLogoImageId(workbook, settings.logoUrl);

  if (logoImageId) {
    worksheet.addImage(logoImageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 90, height: 90 },
    });
    worksheet.mergeCells("B1:G1");
    worksheet.getCell("B1").value = settings.name;
  } else {
    worksheet.mergeCells("A1:G1");
    worksheet.getCell("A1").value = settings.name;
  }

  const titleCell = logoImageId ? worksheet.getCell("B1") : worksheet.getCell("A1");
  titleCell.font = { bold: true, size: 20, name: "Arial" };
  titleCell.alignment = { vertical: "middle" };

  worksheet.mergeCells("A2:G2");
  worksheet.getCell("A2").value = `Orden de compra ${order.orderNumber}`;
  worksheet.getCell("A2").font = { bold: true, size: 14, name: "Arial" };

  worksheet.mergeCells("A3:C3");
  worksheet.getCell("A3").value = "Proveedor";
  worksheet.getCell("A3").font = { bold: true, color: { argb: "FF5B21B6" } };
  worksheet.mergeCells("D3:G3");
  worksheet.getCell("D3").value = order.supplier.name;

  worksheet.mergeCells("A4:C4");
  worksheet.getCell("A4").value = "Contacto";
  worksheet.getCell("A4").font = { bold: true };
  worksheet.mergeCells("D4:G4");
  worksheet.getCell("D4").value =
    [order.supplier.contactName, order.supplier.phone, order.supplier.email]
      .filter(Boolean)
      .join(" · ") || "Sin datos complementarios";

  worksheet.mergeCells("A5:C5");
  worksheet.getCell("A5").value = "Direccion";
  worksheet.getCell("A5").font = { bold: true };
  worksheet.mergeCells("D5:G5");
  worksheet.getCell("D5").value = order.supplier.address ?? "No informada";

  worksheet.mergeCells("A6:C6");
  worksheet.getCell("A6").value = "Fecha de emision";
  worksheet.getCell("A6").font = { bold: true };
  worksheet.mergeCells("D6:G6");
  worksheet.getCell("D6").value = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
  }).format(order.createdAt);

  const headerRow = worksheet.getRow(8);
  headerRow.values = ["Producto", "Color", "Talle", "SKU", "Cantidad", "Costo unitario", "Subtotal"];
  headerRow.font = { bold: true, color: { argb: "FF5B21B6" }, name: "Arial" };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF7F4FB" },
  };

  let currentRow = 9;

  for (const item of order.items) {
    const subtotal = item.quantityOrdered * decimalToNumber(item.unitCost);
    const row = worksheet.getRow(currentRow);

    row.values = [
      item.variant.product.name,
      item.variant.colorName,
      item.variant.size,
      item.variant.internalSku,
      item.quantityOrdered,
      currencyFormatter.format(decimalToNumber(item.unitCost)),
      currencyFormatter.format(subtotal),
    ];
    row.alignment = { vertical: "middle" };
    currentRow += 1;
  }

  const totalRow = worksheet.getRow(currentRow + 1);
  totalRow.getCell(5).value = "Total";
  totalRow.getCell(5).font = { bold: true };
  totalRow.getCell(7).value = currencyFormatter.format(decimalToNumber(order.subtotal));
  totalRow.getCell(7).font = { bold: true };

  if (order.notes) {
    const notesRow = worksheet.getRow(currentRow + 3);
    notesRow.getCell(1).value = "Notas";
    notesRow.getCell(1).font = { bold: true };
    worksheet.mergeCells(`B${currentRow + 3}:G${currentRow + 4}`);
    worksheet.getCell(`B${currentRow + 3}`).value = order.notes;
    worksheet.getCell(`B${currentRow + 3}`).alignment = { wrapText: true, vertical: "top" };
  }

  for (let rowIndex = 3; rowIndex <= currentRow + 4; rowIndex += 1) {
    for (let columnIndex = 1; columnIndex <= 7; columnIndex += 1) {
      const cell = worksheet.getRow(rowIndex).getCell(columnIndex);
      cell.border = {
        top: { style: "thin", color: { argb: "FFE7E0F2" } },
        left: { style: "thin", color: { argb: "FFE7E0F2" } },
        bottom: { style: "thin", color: { argb: "FFE7E0F2" } },
        right: { style: "thin", color: { argb: "FFE7E0F2" } },
      };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${order.orderNumber}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
