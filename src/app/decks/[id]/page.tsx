import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { matchDeck } from "@/lib/matcher";
import { POD_MEMBERS } from "@/lib/pod";
import { MatcherView } from "./matcher-view";
import { DeleteDeckButton } from "./delete-deck-button";

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
  // Full deck size (every copy, incl. basics) vs distinct — matches Archidekt.
  const totalCopies = deck.cards.reduce((s, c) => s + c.quantity, 0);
  const distinct = deck.cards.length;

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
            {totalCopies} cards · {distinct} unique · by {deck.ownerName} · from{" "}
            {deck.source}
          </p>
        </div>
        {deck.ownerUserId === viewer.id && <DeleteDeckButton deckId={deck.id} />}
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
