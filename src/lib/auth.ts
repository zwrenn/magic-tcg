import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { USER_COOKIE } from "./auth-shared";

/**
 * The currently selected pod member, resolved from the profile cookie to a
 * real users row. Returns null if no/unknown profile is set. Server-only.
 */
export async function getCurrentUser(): Promise<User | null> {
  const name = (await cookies()).get(USER_COOKIE)?.value;
  if (!name) return null;
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.name, name))
    .limit(1);
  return rows[0] ?? null;
}

/** Like getCurrentUser but throws — use where middleware guarantees a session. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("No pod member selected");
  return user;
}

/** All pod members, for pickers and matcher summaries. */
export async function getAllUsers(): Promise<User[]> {
  return db.select().from(schema.users).orderBy(schema.users.id);
}

/** Look up a pod member by name. */
export async function getUserByName(name: string): Promise<User | null> {
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.name, name))
    .limit(1);
  return rows[0] ?? null;
}
