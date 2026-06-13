"use client";

import { useActionState, useState } from "react";
import {
  createDeckFromPaste,
  createDeckFromArchidekt,
  createDeckFromCommander,
  type ActionState,
} from "../actions";
import { CommanderInput } from "./commander-input";

const initial: ActionState = {};

export function NewDeckForm() {
  const [tab, setTab] = useState<"paste" | "archidekt" | "commander">("paste");
  const [pasteState, pasteAction, pastePending] = useActionState(
    createDeckFromPaste,
    initial,
  );
  const [archState, archAction, archPending] = useActionState(
    createDeckFromArchidekt,
    initial,
  );
  const [cmdrState, cmdrAction, cmdrPending] = useActionState(
    createDeckFromCommander,
    initial,
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex gap-1 rounded-lg bg-surface-2 p-1 text-sm">
        <TabButton active={tab === "paste"} onClick={() => setTab("paste")}>
          Paste a list
        </TabButton>
        <TabButton active={tab === "archidekt"} onClick={() => setTab("archidekt")}>
          Archidekt URL
        </TabButton>
        <TabButton active={tab === "commander"} onClick={() => setTab("commander")}>
          Commander
        </TabButton>
      </div>

      {tab === "paste" ? (
        <form action={pasteAction} className="space-y-3">
          <input
            name="name"
            placeholder="Deck name"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <textarea
            name="decklist"
            required
            rows={12}
            placeholder={
              "1 Sol Ring\n1x Rhystic Study\n1 Smothering Tithe (PCY) 23\n\nCommander:\n1 Atraxa, Praetors' Voice"
            }
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm outline-none focus:border-accent"
          />
          <p className="text-xs text-muted">
            Using Moxfield? Open your deck → <strong>Export → Copy for
            Moxfield / Text</strong>, then paste it here. Quantities, set codes,
            and <code>(SET) 123</code> printings are all handled.
          </p>
          {pasteState.error && <p className="text-sm text-bad">{pasteState.error}</p>}
          <button
            type="submit"
            disabled={pastePending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
          >
            {pastePending ? "Saving…" : "Create deck"}
          </button>
        </form>
      ) : tab === "archidekt" ? (
        <form action={archAction} className="space-y-3">
          <input
            name="url"
            required
            placeholder="https://archidekt.com/decks/123456/my-deck"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            name="name"
            placeholder="Deck name (optional — defaults to Archidekt's)"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <p className="text-xs text-muted">
            We fetch the deck server-side and skip Maybeboard / excluded
            categories. Moxfield&apos;s API blocks bots — use the paste tab for
            Moxfield decks.
          </p>
          {archState.error && <p className="text-sm text-bad">{archState.error}</p>}
          <button
            type="submit"
            disabled={archPending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
          >
            {archPending ? "Fetching…" : "Import from Archidekt"}
          </button>
        </form>
      ) : (
        <form action={cmdrAction} className="space-y-3">
          <CommanderInput />
          <input
            name="name"
            placeholder="Deck name (optional)"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <p className="text-xs text-muted">
            Pulls the ~100 cards most commonly run with this commander from{" "}
            <strong>EDHREC</strong>, so you can see what the pod already owns
            before building. Use the exact card name (front face for
            double-faced commanders).
          </p>
          {cmdrState.error && <p className="text-sm text-bad">{cmdrState.error}</p>}
          <button
            type="submit"
            disabled={cmdrPending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
          >
            {cmdrPending ? "Asking EDHREC…" : "Build from commander"}
          </button>
        </form>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
        active ? "bg-accent text-black" : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
