import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("⚡ Executing DDL migrations for Time & Time Limits...");
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours numeric;`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS logged_hours numeric DEFAULT '0';`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_limit timestamp;`;
  console.log("✅ DDL Migrations complete! Added estimated_hours, logged_hours, time_limit columns.");
}

migrate().catch(console.error);
