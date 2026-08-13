import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("⚡ Executing DDL migration for active screen time & live presence tracking...");
  try {
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS active_screen_time_seconds INTEGER DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;
    `;
    console.log("✅ DDL Migration for Screen Time columns completed successfully!");
  } catch (error) {
    console.error("❌ DDL Migration error:", error);
    process.exit(1);
  }
}

migrate();
