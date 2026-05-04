import { NextResponse } from "next/server";

import { hasAdminAccess } from "@/lib/admin";
import { getAuthSession } from "@/lib/auth";
import { getCatalogProducts } from "@/lib/catalog";
import { isDatabaseConfigured } from "@/lib/env";
import { logAndMaskError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { productSchema } from "@/schemas/product";

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    // Same-origin form posts may not include Origin; require Referer in that case.
    const referer = request.headers.get("referer");
    if (!referer) return false;
    try {
      return new URL(referer).origin === (process.env.NEXT_PUBLIC_APP_URL ?? "");
    } catch {
      return false;
    }
  }
  const expected = process.env.NEXT_PUBLIC_APP_URL;
  if (!expected) return process.env.NODE_ENV !== "production";
  try {
    return new URL(origin).origin === new URL(expected).origin;
  } catch {
    return false;
  }
}

export async function GET() {
  const products = await getCatalogProducts();
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const session = await getAuthSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Inicia sesion para crear productos." }, { status: 401 });
  }

  if (!hasAdminAccess(session.user.role)) {
    return NextResponse.json({ error: "No tienes permisos para crear productos." }, { status: 403 });
  }

  const rl = rateLimit({
    key: `products:create:${session.user.id ?? session.user.email ?? getClientIp(request)}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.success) return rateLimitResponse(rl);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const parsed = productSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Configura DATABASE_URL real antes de crear productos en la base." },
      { status: 503 },
    );
  }

  try {
    const product = await prisma.product.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        kind: parsed.data.kind,
        priceCents: parsed.data.priceCents,
        stock: parsed.data.stock,
        featured: parsed.data.featured,
        sku: parsed.data.sku || null,
        status: parsed.data.status,
        categoryId: parsed.data.categoryId,
        images: parsed.data.imageUrl
          ? {
              create: {
                alt: parsed.data.imageAlt || parsed.data.name,
                publicId: parsed.data.imagePublicId || null,
                url: parsed.data.imageUrl,
              },
            }
          : undefined,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    const masked = logAndMaskError("api.products.create", error, "No fue posible crear el producto.");
    return NextResponse.json({ error: masked.message, code: masked.code }, { status: 500 });
  }
}