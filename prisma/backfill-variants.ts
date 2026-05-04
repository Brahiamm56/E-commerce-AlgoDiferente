import "dotenv/config";

import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to backfill product variants.");
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: process.env.NODE_ENV === "production",
  },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function buildInternalSku(product: { slug: string; sku: string | null }) {
  if (product.sku) {
    return product.sku;
  }

  const normalizedSlug = product.slug
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${normalizedSlug || "PRODUCTO"}-UNICO`;
}

async function main() {
  const products = await prisma.product.findMany({
    include: {
      variants: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  let createdCount = 0;
  let skippedCount = 0;

  for (const product of products) {
    if (product.variants.length > 0) {
      skippedCount += 1;
      continue;
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        internalSku: buildInternalSku(product),
        size: "UNICO",
        colorName: "Sin color",
        price: new Prisma.Decimal(product.priceCents).div(100),
        cost: new Prisma.Decimal(0),
        stock: product.stock,
        active: product.status === "PUBLISHED",
        weightGrams: product.defaultWeightGrams,
        heightCm: product.defaultHeightCm,
        widthCm: product.defaultWidthCm,
        lengthCm: product.defaultLengthCm,
      },
    });

    if (product.stock !== 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          variantId: variant.id,
          type: "INITIAL",
          quantity: product.stock,
          stockBefore: 0,
          stockAfter: product.stock,
          notes: "Backfill inicial desde stock legado de producto.",
        },
      });
    }

    createdCount += 1;
  }

  console.log(`Backfill variants complete. Created: ${createdCount}. Skipped: ${skippedCount}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });