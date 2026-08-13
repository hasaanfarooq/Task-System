import { pgTable, text, timestamp, uuid, pgEnum, primaryKey, numeric, index, integer } from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", ["admin", "manager", "employee"]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "review", "done"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high", "urgent"]);

// Users table with Screen Time & Live Presence Tracking
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    password_hash: text("password_hash").notNull(),
    role: roleEnum("role").default("employee").notNull(),
    active_screen_time_seconds: integer("active_screen_time_seconds").default(0).notNull(),
    last_active_at: timestamp("last_active_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_users_role").on(table.role),
  ]
);

// Tasks table with Time Limits, Time Tracking & Submissions
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").default("todo").notNull(),
    priority: taskPriorityEnum("priority").default("medium").notNull(),
    estimated_hours: numeric("estimated_hours"),
    logged_hours: numeric("logged_hours").default("0").notNull(),
    time_limit: timestamp("time_limit"),
    due_date: timestamp("due_date"),
    submission_link: text("submission_link"),
    submission_notes: text("submission_notes"),
    submitted_at: timestamp("submitted_at"),
    created_by: uuid("created_by")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_tasks_status").on(table.status),
    index("idx_tasks_created_by").on(table.created_by),
  ]
);

// Task Assignees table (many-to-many)
export const task_assignees = pgTable(
  "task_assignees",
  {
    task_id: uuid("task_id")
      .references(() => tasks.id, { onDelete: "cascade" })
      .notNull(),
    user_id: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.task_id, table.user_id] }),
    index("idx_task_assignees_user_id").on(table.user_id),
  ]
);

// Comments table
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    task_id: uuid("task_id")
      .references(() => tasks.id, { onDelete: "cascade" })
      .notNull(),
    user_id: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    body: text("body").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_comments_task_id").on(table.task_id),
  ]
);

// Tags table
export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
});

// Task Tags table (many-to-many)
export const task_tags = pgTable(
  "task_tags",
  {
    task_id: uuid("task_id")
      .references(() => tasks.id, { onDelete: "cascade" })
      .notNull(),
    tag_id: uuid("tag_id")
      .references(() => tags.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.task_id, table.tag_id] }),
  ]
);

// Messages table for Direct Employee-Admin/Manager Chat
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sender_id: uuid("sender_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    receiver_id: uuid("receiver_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    content: text("content").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_messages_conversation").on(table.sender_id, table.receiver_id),
  ]
);
