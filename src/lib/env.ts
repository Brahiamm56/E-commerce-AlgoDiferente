const placeholderFragments = ["change-me", "replace-with"];

const envChecklist = [
  { key: "DATABASE_URL", label: "Base de datos Supabase Postgres", group: "Core" },
  { key: "NEXTAUTH_SECRET", label: "Sesion de admin", group: "Auth" },
  { key: "NEXTAUTH_URL", label: "URL de autenticacion", group: "Auth" },
  { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL publica", group: "Auth" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Supabase anon key", group: "Auth" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase service role", group: "Auth" },
  { key: "ADMIN_EMAIL", label: "Usuario administrador", group: "Auth" },
  { key: "ADMIN_PASSWORD", label: "Password inicial", group: "Auth" },
  { key: "NEXT_PUBLIC_APP_URL", label: "URL publica", group: "Store" },
  { key: "NEXT_PUBLIC_STORE_NAME", label: "Nombre de tienda", group: "Store" },
  { key: "NEXT_PUBLIC_STORE_DESCRIPTION", label: "Descripcion publica", group: "Store" },
  { key: "NEXT_PUBLIC_WHATSAPP_NUMBER", label: "WhatsApp de ventas", group: "Store" },
  { key: "NEXT_PUBLIC_CURRENCY", label: "Moneda", group: "Store" },
  { key: "CLOUDINARY_CLOUD_NAME", label: "Cloudinary cloud name", group: "Media" },
  { key: "CLOUDINARY_API_KEY", label: "Cloudinary API key", group: "Media" },
  { key: "CLOUDINARY_API_SECRET", label: "Cloudinary API secret", group: "Media" },
  { key: "MERCADO_PAGO_ACCESS_TOKEN", label: "Mercado Pago access token", group: "Payments" },
  { key: "MERCADO_PAGO_WEBHOOK_SECRET", label: "Mercado Pago webhook secret", group: "Payments" },
  { key: "ANDREANI_CLIENT_ID", label: "Andreani client ID", group: "Shipping" },
  { key: "ANDREANI_CLIENT_SECRET", label: "Andreani client secret", group: "Shipping" },
  { key: "POS_CARD_SURCHARGE_PERCENT", label: "Recargo tarjeta POS", group: "POS" },
] as const;

function hasConfiguredValue(value?: string | null) {
  if (!value) {
    return false;
  }

  return !placeholderFragments.some((fragment) => value.includes(fragment));
}

export function isDatabaseConfigured() {
  return hasConfiguredValue(process.env.DATABASE_URL);
}

export function isCloudinaryConfigured() {
  return [
    process.env.CLOUDINARY_CLOUD_NAME,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET,
  ].every((value) => hasConfiguredValue(value));
}

export function isSupabaseConfigured() {
  return [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ].every((value) => hasConfiguredValue(value));
}

export function isMercadoPagoConfigured() {
  return [
    process.env.MERCADO_PAGO_ACCESS_TOKEN,
    process.env.MERCADO_PAGO_WEBHOOK_SECRET,
  ].every((value) => hasConfiguredValue(value));
}

export function isAndreaniConfigured() {
  return [
    process.env.ANDREANI_API_URL,
    process.env.ANDREANI_CLIENT_ID,
    process.env.ANDREANI_CLIENT_SECRET,
    process.env.ANDREANI_CONTRACT_NUMBER,
  ].every((value) => hasConfiguredValue(value));
}

export function isAuthConfigured() {
  return hasConfiguredValue(process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET);
}

export function getEnvironmentChecklist() {
  return envChecklist.map((item) => ({
    ...item,
    ready: hasConfiguredValue(process.env[item.key]),
  }));
}

/**
 * Production guard. Throws if critical env vars are missing in production.
 * Call from server entry points (routes, server actions, lib/prisma) once.
 */
let assertedProductionEnv = false;
export function assertProductionEnv() {
  if (assertedProductionEnv) return;
  if (process.env.NODE_ENV !== "production") {
    assertedProductionEnv = true;
    return;
  }

  // Only the vars that are strictly required for the app to boot.
  // Cloudinary / Supabase keys are needed for uploads/auth but the store
  // can still render pages without them — so we warn rather than throw.
  const required = [
    "DATABASE_URL",
    "NEXTAUTH_SECRET",
  ];
  const missing = required.filter((key) => !hasConfiguredValue(process.env[key]));
  if (missing.length > 0) {
    // Do not include actual values, just keys.
    throw new Error(
      `[env] Missing required production env vars: ${missing.join(", ")}. ` +
        `Configure them in your hosting provider before booting.`,
    );
  }

  // Warn (but don't throw) for vars that affect features but not page rendering.
  const recommended = [
    "NEXTAUTH_URL",
    "NEXT_PUBLIC_APP_URL",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const missingRecommended = recommended.filter((key) => !hasConfiguredValue(process.env[key]));
  if (missingRecommended.length > 0) {
    console.warn(
      `[env] Recommended env vars not set: ${missingRecommended.join(", ")}. ` +
        `Some features may be unavailable.`,
    );
  }

  assertedProductionEnv = true;
}