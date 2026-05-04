import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requireEnv(key: string) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`[supabase] Missing required environment variable: ${key}`);
  }

  return value;
}

export function createSupabaseAdminClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}