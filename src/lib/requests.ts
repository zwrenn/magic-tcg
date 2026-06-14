import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { normalizeName } from "./normalize";
import { getUserByName } from "./auth";

export type RequestRow = {
  id: number;
  cardName: string;
  normalizedName: string;
  status: string;
  note: string | null;
  createdAt: Date;
  otherName: string; // the other party (sender for inbox, recipient for outgoing)
  deckId: number | null;
  deckName: string | null;
  image: string | null;
};

/** Create a borrow request from one member to another. De-dupes pending asks. */
export async function createRequest(
  fromUserId: number,
  opts: { toUserName: string; cardName: string; deckId?: number | null; note?: string },
): Promise<{ ok: true; duplicate?: boolean }> {
  const to = await getUserByName(opts.toUserName);
  if (!to) throw new Error("Unknown member");
  if (to.id === fromUserId) throw new Error("That's your own card");
  const normalizedName = normalizeName(opts.cardName);

  const existing = await db
    .select({ id: schema.requests.id })
    .from(schema.requests)
    .where(
      and(
        eq(schema.requests.fromUserId, fromUserId),
        eq(schema.requests.toUserId, to.id),
        eq(schema.requests.normalizedName, normalizedName),
        eq(schema.requests.status, "pending"),
      ),
    )
    .limit(1);
  if (existing.length > 0) return { ok: true, duplicate: true };

  await db.insert(schema.requests).values({
    fromUserId,
    toUserId: to.id,
    cardName: opts.cardName,
    normalizedName,
    deckId: opts.deckId ?? null,
    note: opts.note ?? null,
  });
  return { ok: true };
}

async function imagesFor(names: string[]): Promise<Map<string, string | null>> {
  const unique = [...new Set(names)];
  if (unique.length === 0) return new Map();
  const rows = await db
    .selectDistinctOn([schema.cards.normalizedName], {
      normalizedName: schema.cards.normalizedName,
      image: schema.cards.imageUri,
    })
    .from(schema.cards)
    .where(inArray(schema.cards.normalizedName, unique))
    .orderBy(schema.cards.normalizedName, sql`${schema.cards.imageUri} is null`);
  return new Map(rows.map((r) => [r.normalizedName, r.image]));
}

async function hydrate(
  base: {
    id: number;
    cardName: string;
    normalizedName: string;
    status: string;
    note: string | null;
    createdAt: Date;
    otherName: string;
    deckId: number | null;
    deckName: string | null;
  }[],
): Promise<RequestRow[]> {
  const imgs = await imagesFor(base.map((b) => b.normalizedName));
  return base.map((b) => ({ ...b, image: imgs.get(b.normalizedName) ?? null }));
}

/** Requests other people have sent to me (cards they want from me). */
export async function getInbox(userId: number): Promise<RequestRow[]> {
  const rows = await db
    .select({
      id: schema.requests.id,
      cardName: schema.requests.cardName,
      normalizedName: schema.requests.normalizedName,
      status: schema.requests.status,
      note: schema.requests.note,
      createdAt: schema.requests.createdAt,
      otherName: schema.users.name,
      deckId: schema.requests.deckId,
      deckName: schema.decks.name,
    })
    .from(schema.requests)
    .innerJoin(schema.users, eq(schema.users.id, schema.requests.fromUserId))
    .leftJoin(schema.decks, eq(schema.decks.id, schema.requests.deckId))
    .where(eq(schema.requests.toUserId, userId))
    .orderBy(desc(schema.requests.createdAt));
  return hydrate(rows);
}

/** Requests I've sent to others. */
export async function getOutgoing(userId: number): Promise<RequestRow[]> {
  const rows = await db
    .select({
      id: schema.requests.id,
      cardName: schema.requests.cardName,
      normalizedName: schema.requests.normalizedName,
      status: schema.requests.status,
      note: schema.requests.note,
      createdAt: schema.requests.createdAt,
      otherName: schema.users.name,
      deckId: schema.requests.deckId,
      deckName: schema.decks.name,
    })
    .from(schema.requests)
    .innerJoin(schema.users, eq(schema.users.id, schema.requests.toUserId))
    .leftJoin(schema.decks, eq(schema.decks.id, schema.requests.deckId))
    .where(eq(schema.requests.fromUserId, userId))
    .orderBy(desc(schema.requests.createdAt));
  return hydrate(rows);
}

export async function countIncomingPending(userId: number): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.requests)
    .where(
      and(eq(schema.requests.toUserId, userId), eq(schema.requests.status, "pending")),
    );
  return row?.n ?? 0;
}

/** Update a request's status, enforcing who's allowed to do what. */
export async function updateRequestStatus(
  userId: number,
  id: number,
  status: "given" | "declined" | "cancelled",
): Promise<boolean> {
  const [r] = await db
    .select()
    .from(schema.requests)
    .where(eq(schema.requests.id, id))
    .limit(1);
  if (!r) return false;
  const isRecipient = r.toUserId === userId;
  const isSender = r.fromUserId === userId;
  if (status === "cancelled" && !isSender) return false;
  if ((status === "given" || status === "declined") && !isRecipient) return false;

  await db
    .update(schema.requests)
    .set({ status, updatedAt: sql`now()` })
    .where(eq(schema.requests.id, id));
  return true;
}
