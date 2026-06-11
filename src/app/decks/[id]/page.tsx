import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { matchDeck } from "@/lib/matcher";
import { POD_MEMBERS } from "@/lib/pod";
import { deleteDeckAction } from "../actions";
import { MatcherView } from "./matcher-view";

export default async function DeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireUser();
  const { id } = await params;
  const deckId = Number(id);
  if (!Number.isFinite(deckId)) notFound();

  const result = await matchDeck(deckId);
  if (!result) notFound();
  const { deck, cards } = result;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            ← All decks
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {deck.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {cards.length} cards · by {deck.ownerName} · from {deck.source}
          </p>
        </div>
        <form action={deleteDeckAction}>
          <input type="hidden" name="deckId" value={deck.id} />
          <button
            type="submit"
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:border-bad/60 hover:text-bad"
          >
            Delete
          </button>
        </form>
      </div>

      <MatcherView
        cards={cards}
        deckOwnerName={deck.ownerName}
        viewerName={viewer.name}
        members={[...POD_MEMBERS]}
      />
    </main>
  );
}
