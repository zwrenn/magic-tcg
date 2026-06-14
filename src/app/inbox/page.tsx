import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getInbox, getOutgoing, type RequestRow } from "@/lib/requests";
import { CardZoomButton } from "@/components/card-zoom";
import { RequestStatus } from "./request-actions";

export default async function InboxPage() {
  const user = await requireUser();
  const [incoming, outgoing] = await Promise.all([
    getInbox(user.id),
    getOutgoing(user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="t-hero text-2xl">📬 Inbox</h1>
      <p className="mt-1 text-sm text-muted">
        Borrow requests between the pod.
      </p>

      <section className="mt-6">
        <h2 className="t-label mb-2">Requests for you ({incoming.filter((r) => r.status === "pending").length})</h2>
        {incoming.length === 0 ? (
          <p className="text-sm text-muted">No one has asked you for a card yet.</p>
        ) : (
          <ul className="card divide-y divide-border !p-0">
            {incoming.map((r) => (
              <Row key={r.id} r={r} role="in" who={`${r.otherName} wants`} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="t-label mb-2">Your requests ({outgoing.filter((r) => r.status === "pending").length} pending)</h2>
        {outgoing.length === 0 ? (
          <p className="text-sm text-muted">
            You haven&apos;t asked for anything. Open a deck and hit{" "}
            <span className="font-semibold">🙋 ask</span> next to whoever owns a card you need.
          </p>
        ) : (
          <ul className="card divide-y divide-border !p-0">
            {outgoing.map((r) => (
              <Row key={r.id} r={r} role="out" who={`asked ${r.otherName}`} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Row({ r, role, who }: { r: RequestRow; role: "in" | "out"; who: string }) {
  return (
    <li className="flex items-center gap-3 p-3">
      <CardZoomButton name={r.cardName} image={r.image} className="shrink-0">
        {r.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.image} alt={r.cardName} loading="lazy" className="h-12 w-9 rounded-[3px] border border-border object-cover" />
        ) : (
          <span className="grid h-12 w-9 place-items-center rounded-[3px] border border-border bg-surface-2 text-[8px] text-muted">no img</span>
        )}
      </CardZoomButton>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{r.cardName}</div>
        <div className="text-xs text-muted">
          {who}
          {r.deckName && (
            <>
              {" "}for{" "}
              {r.deckId ? (
                <Link href={`/decks/${r.deckId}`} className="text-accent hover:underline">
                  {r.deckName}
                </Link>
              ) : (
                r.deckName
              )}
            </>
          )}
        </div>
      </div>
      <RequestStatus id={r.id} role={role} initialStatus={r.status} />
    </li>
  );
}
