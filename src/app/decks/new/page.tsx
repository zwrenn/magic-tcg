import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { NewDeckForm } from "./new-deck-form";

export default async function NewDeckPage() {
  await requireUser();
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← All decks
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">New deck</h1>
      <p className="mt-1 text-sm text-muted">
        Paste a list or import from Archidekt. We&apos;ll show who in the pod
        already owns each card.
      </p>
      <div className="mt-6">
        <NewDeckForm />
      </div>
    </main>
  );
}
