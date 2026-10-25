// Create a user or reset their password. The password is read from stdin, never from argv.
//   local:  npm run user:set -- <login> "<Display name>"
//   docker: docker compose exec -it app node scripts/set-user.mjs <login> "<Display name>"
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const [login, name] = process.argv.slice(2);
if (!login || !name) {
  console.error('Usage: node scripts/set-user.mjs <login> "<Display name>"');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const password = await new Promise((resolve) => rl.question("Password: ", resolve));
rl.close();
if (password.length < 8) {
  console.error("Password must have at least 8 characters.");
  process.exit(1);
}

const file = process.env.DATABASE_PATH ?? "./data/wedding.db";
fs.mkdirSync(path.dirname(file), { recursive: true });
const sqlite = new Database(file);
migrate(drizzle(sqlite), { migrationsFolder: path.join(process.cwd(), "drizzle") });
sqlite
  .prepare(
    `INSERT INTO users (login, name, password_hash) VALUES (?, ?, ?)
     ON CONFLICT(login) DO UPDATE SET name = excluded.name, password_hash = excluded.password_hash`,
  )
  .run(login, name, bcrypt.hashSync(password, 12));
console.log(`User "${login}" saved.`);
