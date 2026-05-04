import "dotenv/config";
import { Pool } from "pg";
import { hash } from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const newHash = await hash("Admin123*", 10);
const result = await pool.query(
  'UPDATE "User" SET "passwordHash" = $1 WHERE email = $2 RETURNING email, id',
  [newHash, "admin@demo.com"]
);

if (result.rows.length === 0) {
  console.log("User not found — inserting...");
  const insert = await pool.query(
    'INSERT INTO "User" (id, email, name, "passwordHash", role, "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, now(), now()) RETURNING email',
    ["admin@demo.com", "Administrador", newHash, "owner"]
  );
  console.log("Inserted:", insert.rows);
} else {
  console.log("Password reset for:", result.rows);
}

await pool.end();
