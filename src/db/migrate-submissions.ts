import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("⚡ Executing DDL migration for Task Deliverable Submissions...");
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_link text;`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_notes text;`;
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submitted_at timestamp;`;
  console.log("✅ DDL Migration complete! Added submission columns to tasks table.");
}

migrate().catch(console.error);
