import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import { seedDefaults } from "./seed";

export type DB = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as { __weddingDb?: DB };

function open(): DB {
  const file = process.env.DATABASE_PATH ?? "./data/wedding.db";
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  // Opened lazily on first request, so `next build` never touches the file.
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  seedDefaults(db);
  return db;
}

export function db(): DB {
  globalForDb.__weddingDb ??= open();
  return globalForDb.__weddingDb;
}

export { schema };
