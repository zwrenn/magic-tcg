import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { normalizeName } from "./normalize";

/** The set of normalized names a user has favorited. */
export async function getFavorites(userId: number): Promise<Set<string>> {
  const rows = await db
    .select({ normalizedName: schema.favorites.normalizedName })
    .from(schema.favorites)
    .where(eq(schema.favorites.userId, userId));
  return new Set(rows.map((r) => r.normalizedName));
}

/** Toggle a favorite. Returns the new state (true = now favorited). */
export async function toggleFavorite(
  userId: number,
  name: string,
): Promise<boolean> {
  const key = normalizeName(name);
  if (!key) return false;

  const existing = await db
    .select({ id: schema.favorites.id })
    .from(schema.favorites)
    .where(
      and(
        eq(schema.favorites.userId, userId),
        eq(schema.favorites.normalizedName, key),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db.delete(schema.favorites).where(eq(schema.favorites.id, existing[0].id));
    return false;
  }
  await db
    .insert(schema.favorites)
    .values({ userId, normalizedName: key })
    .onConflictDoNothing();
  return true;
}
