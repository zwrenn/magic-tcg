import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Both drivers expose the same Drizzle query API; we type the client as one
// concrete type so method chaining (.returning(), etc.) infers correctly.
type DB = NodePgDatabase<typeof schema>;

let instance: DB | null = null;

/** Neon's serverless HTTP driver only works against Neon hosts. */
function isNeon(url: string): boolean {
  return /neon\.tech/i.test(url);
}

function init(): DB {
  if (instance) return instance;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and add your connection string.",
    );
  }
  // Pick the driver by connection target: Neon HTTP in prod, plain pg locally.
  instance = isNeon(url)
    ? (drizzleNeon(neon(url), { schema }) as unknown as DB)
    : drizzlePg(new Pool({ connectionString: url }), { schema });
  return instance;
}

/**
 * Lazily-initialized Drizzle client. The connection isn't created (and
 * DATABASE_URL isn't required) until the first query runs — so `next build`
 * can import modules that reference `db` without a database present.
 */
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const real = init() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
