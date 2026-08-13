import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcrypt from "bcryptjs";
import * as schema from "./schema";
import { users, tasks, task_assignees, comments, tags, task_tags, messages } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  console.log("🧹 Wiping ALL existing database tables...");

  await db.delete(messages);
  await db.delete(comments);
  await db.delete(task_tags);
  await db.delete(task_assignees);
  await db.delete(tasks);
  await db.delete(tags);
  await db.delete(users);

  console.log("✅ All existing data wiped completely.");

  // Hash password for CEO Admin Account
  const ceoPasswordHash = await bcrypt.hash("onlypass1290@", 12);

  // Insert single CEO Admin user
  const [ceoAdmin] = await db
    .insert(users)
    .values({
      name: "CEO",
      email: "ceo@axiora.com",
      password_hash: ceoPasswordHash,
      role: "admin",
    })
    .returning();

  console.log("🎉 Database successfully reset!");
  console.log("👑 Single Admin User Created:");
  console.log(`   - Name: ${ceoAdmin.name}`);
  console.log(`   - Email: ${ceoAdmin.email}`);
  console.log(`   - Role: ${ceoAdmin.role}`);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
