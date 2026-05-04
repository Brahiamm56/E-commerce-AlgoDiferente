import "server-only";

function requireEnv(key: string) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`[andreani] Missing required environment variable: ${key}`);
  }

  return value;
}

export function getAndreaniConfig() {
  return {
    environment: process.env.ANDREANI_ENV ?? "sandbox",
    apiUrl: requireEnv("ANDREANI_API_URL"),
    clientId: requireEnv("ANDREANI_CLIENT_ID"),
    clientSecret: requireEnv("ANDREANI_CLIENT_SECRET"),
    contractNumber: requireEnv("ANDREANI_CONTRACT_NUMBER"),
  };
}