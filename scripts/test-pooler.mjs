import { Pool } from "pg";

// Test Session Pooler (port 5432)
const p = new Pool({
  host: "aws-0-us-east-1.pooler.supabase.com",
  port: 5432,
  user: "postgres.rjykmekeyblmuciqvhep",
  password: "Brahiamiserre56",
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

try {
  const r = await p.query('SELECT email FROM "User" LIMIT 1');
  console.log("SESSION POOLER OK:", JSON.stringify(r.rows));
} catch (e) {
  console.error("SESSION POOLER FAILED:", e.message);
}
await p.end();

// Also test Transaction Pooler (port 6543)
const p2 = new Pool({
  host: "aws-0-us-east-1.pooler.supabase.com",
  port: 6543,
  user: "postgres.rjykmekeyblmuciqvhep",
  password: "Brahiamiserre56",
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

try {
  const r2 = await p2.query('SELECT email FROM "User" LIMIT 1');
  console.log("TRANSACTION POOLER OK:", JSON.stringify(r2.rows));
} catch (e) {
  console.error("TRANSACTION POOLER FAILED:", e.message);
}
await p2.end();
