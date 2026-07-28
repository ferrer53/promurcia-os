import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import * as relations from "./relations";

const sqlite = new Database("promurcia.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema: { ...schema, ...relations } });
