import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./schema";
import * as relations from "./relations";

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
export const db = drizzle(client, { schema: { ...schema, ...relations } });
