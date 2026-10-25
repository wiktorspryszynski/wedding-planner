import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// All money columns are integers in grosze (1 PLN = 100).

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  login: text("login").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

// Single-row table (id = 1).
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  weddingDate: text("wedding_date"), // YYYY-MM-DD
  venue: text("venue"),
  totalBudget: integer("total_budget").notNull().default(0),
  costPerGuest: integer("cost_per_guest").notNull().default(0),
});

export const SIDES = ["bride", "groom", "both"] as const;
export const RSVP = ["pending", "yes", "no", "maybe"] as const;
export const GUEST_TYPES = ["adult", "child", "plus_one"] as const;

export const households = sqliteTable("households", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  address: text("address"),
  inviteSentAt: text("invite_sent_at"), // YYYY-MM-DD
  // Reserved for the public RSVP page (v2).
  rsvpToken: text("rsvp_token").unique(),
  notes: text("notes"),
  createdAt: createdAt(),
});

export const tables = sqliteTable("tables", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  shape: text("shape", { enum: ["round", "rect"] }).notNull().default("round"),
  capacity: integer("capacity").notNull().default(8),
  posX: integer("pos_x").notNull().default(40),
  posY: integer("pos_y").notNull().default(40),
});

export const guests = sqliteTable("guests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  householdId: integer("household_id").references(() => households.id, { onDelete: "set null" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull().default(""),
  side: text("side", { enum: SIDES }).notNull().default("both"),
  type: text("type", { enum: GUEST_TYPES }).notNull().default("adult"),
  rsvp: text("rsvp", { enum: RSVP }).notNull().default("pending"),
  diet: text("diet"),
  allergies: text("allergies"),
  needsAccommodation: integer("needs_accommodation", { mode: "boolean" }).notNull().default(false),
  tableId: integer("table_id").references(() => tables.id, { onDelete: "set null" }),
  seatNo: integer("seat_no"),
  phone: text("phone"),
  notes: text("notes"),
  createdAt: createdAt(),
});

export const guestTags = sqliteTable("guest_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const guestTagLinks = sqliteTable(
  "guest_tag_links",
  {
    guestId: integer("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => guestTags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.guestId, t.tagId] })],
);

export const VENDOR_STATUS = ["research", "contacted", "offer", "booked", "rejected"] as const;

export const vendors = sqliteTable("vendors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  status: text("status", { enum: VENDOR_STATUS }).notNull().default("research"),
  priceQuote: integer("price_quote"),
  contractSignedAt: text("contract_signed_at"),
  notes: text("notes"),
  createdAt: createdAt(),
});

export const budgetCategories = sqliteTable("budget_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  planned: integer("planned").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const PAID_BY = ["us", "bride_family", "groom_family", "other"] as const;

export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => budgetCategories.id, { onDelete: "restrict" }),
  vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  planned: integer("planned").notNull().default(0),
  actual: integer("actual"),
  paidBy: text("paid_by", { enum: PAID_BY }).notNull().default("us"),
  notes: text("notes"),
  createdAt: createdAt(),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  expenseId: integer("expense_id")
    .notNull()
    .references(() => expenses.id, { onDelete: "cascade" }),
  label: text("label"),
  amount: integer("amount").notNull(),
  dueDate: text("due_date"),
  paidAt: text("paid_at"),
});

export const TASK_STATUS = ["todo", "doing", "done"] as const;

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: text("due_date"),
  assigneeId: integer("assignee_id").references(() => users.id, { onDelete: "set null" }),
  status: text("status", { enum: TASK_STATUS }).notNull().default("todo"),
  vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const activityLog = sqliteTable("activity_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  entity: text("entity").notNull(),
  entityId: integer("entity_id"),
  action: text("action", { enum: ["create", "update", "delete"] }).notNull(),
  summary: text("summary").notNull(),
  createdAt: createdAt(),
});
