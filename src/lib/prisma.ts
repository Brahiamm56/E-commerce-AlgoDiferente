import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

import { assertProductionEnv } from "@/lib/env";

assertProductionEnv();

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://demo:demo@localhost:5432/demo";

if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
  throw new Error("[prisma] DATABASE_URL is required in production.");
}

function createPrismaClient() {
  const pool = new Pool({
    connectionString,
    ssl: {
      // Supabase uses valid certs but rejectUnauthorized must be false
      // when connecting via the direct connection string (port 5432).
      // The connection string itself carries sslmode=no-verify / require.
      rejectUnauthorized: false,
    },
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

const requiredDelegates = ["category", "heroBanner", "product", "productImage", "setting"] as const;

function hasRequiredDelegates(client: PrismaClient | undefined) {
  return Boolean(
    client &&
      requiredDelegates.every((delegate) => Reflect.get(client as object, delegate)),
  );
}

function getPrismaClient() {
  const cachedPrisma = globalForPrisma.prisma;

  if (hasRequiredDelegates(cachedPrisma)) {
    return cachedPrisma;
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client as object, property);

    return typeof value === "function" ? value.bind(client) : value;
  },
});