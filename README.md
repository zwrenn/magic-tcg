# The Pod 🃏

A tiny card-sharing tool for our 4-person Magic: The Gathering playgroup
(Zoe, Halie, Troy, Mike). Paste a deck you're building and instantly see which
cards each friend already owns across all their collections.

- **Import** each person's ManaBox collection export (CSV).
- **Drop in a deck** — paste a list, or import from an Archidekt URL.
- **The matcher** shows, per card, who in the pod owns it and how many, split
  into _fully covered_ / _partially covered_ / _nobody has it_.
- **Global search** — "does anyone have a Smothering Tithe?"

Built with Next.js (App Router) + TypeScript + Tailwind, Postgres on
[Neon](https://neon.tech) via Drizzle ORM. Deploys to Vercel.

---

## 1. Prerequisites

- Node 20+ and `pnpm`
- A free Neon Postgres database
- A [Scryfall](https://scryfall.com) connection (no key needed — used server-side
  for card metadata, rate-limited and cached)

## 2. Neon setup

1. Create a project at <https://neon.tech>.
2. In the dashboard, open **Connection Details** and copy the **Pooled
   connection** string. It looks like:
   ```
   postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DB?sslmode=require
   ```
3. You don't need to create tables by hand — the migration does it (including
   enabling the `pg_trgm` extension for fuzzy search).

## 3. Environment variables

Copy the template and fill it in:

```bash
cp .env.example .env.local
```

| Variable         | What it is                                                        |
| ---------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`   | Your Neon **pooled** connection string                            |
| `POD_PASSPHRASE` | A single shared secret everyone types once to get past the gate   |

## 4. Install, migrate, seed

```bash
pnpm install
pnpm db:migrate    # creates tables + pg_trgm index
pnpm db:seed       # inserts the four pod members
```

(`pnpm db:generate` regenerates migrations if you change `src/db/schema.ts`.
If you'd rather skip migration files entirely during early dev, `pnpm db:push`
syncs the schema directly.)

## 5. Run it

```bash
pnpm dev
```

Open <http://localhost:3000>. You'll hit the gate: pick who you are and enter
the passphrase. Then **Import** your ManaBox CSV.

Run the tests (decklist parser + name normalizer — where the bugs live):

```bash
pnpm test
```

---

## How each person exports their ManaBox CSV

In the **ManaBox** mobile app:

1. Go to **Collection**.
2. Tap the **⋯ / Share / Export** menu.
3. Choose **Export → CSV**.
4. Save / AirDrop / email the file to yourself, then upload it on the
   **Import** page.

Each upload **fully replaces** that person's collection (a clean re-sync). The
importer maps columns by name (ManaBox has changed column order between
versions), merges duplicate rows, and resolves unknown cards via Scryfall —
already-known cards cost zero external requests, so re-imports are fast.

## Using Moxfield or Archidekt for decks

- **Archidekt**: paste the deck URL (`https://archidekt.com/decks/123456/...`)
  on the New Deck → _Archidekt URL_ tab. We fetch it server-side and skip the
  Maybeboard.
- **Moxfield**: Moxfield's API blocks server traffic, so use the **paste** tab.
  In Moxfield: **Export → Copy for Moxfield / Text**, then paste.
- **Anything else**: the paste box understands `1 Card`, `1x Card`,
  `1 Card (SET) 123`, Arena/Moxfield lines with foil markers, and
  `Commander:` / `Deck` / `Sideboard` / `Maybeboard` section headers.

---

## Deploy to Vercel

1. Push this repo to GitHub (already at `github.com/zwrenn/magic-tcg`).
2. In Vercel, **New Project → import the repo**. Framework auto-detects as
   Next.js; no build config needed.
3. Add the two environment variables (`DATABASE_URL`, `POD_PASSPHRASE`) under
   **Settings → Environment Variables**.
4. Deploy. After the first deploy, run the migration + seed against your Neon DB
   once — easiest from your laptop with the production `DATABASE_URL` in
   `.env.local`:
   ```bash
   pnpm db:migrate && pnpm db:seed
   ```

> **First-import note:** importing a large collection (10k+ cards) the very
> first time spends ~30s+ fetching card data from Scryfall. The commit endpoint
> sets `maxDuration = 300`; on Vercel Hobby this is capped (10–60s), so a huge
> first import may time out. If it does, just re-run it — cards fetched so far
> are cached, so the next run is fast. Re-imports never hit Scryfall.

---

## Project layout

```
src/
  app/
    gate/                profile picker + passphrase gate
    import/              ManaBox CSV importer (two-phase: preview → streamed commit)
    decks/               deck list, new-deck form, [id] matcher screen
    collection/          per-user collection browser
    search/              global "who owns this card" search
    api/                 gate / switch-user / import endpoints
  db/                    Drizzle schema, client, seed
  lib/
    normalize.ts         the ONE name-normalization util (shared everywhere)
    deck-parser.ts       decklist text parser
    manabox.ts           defensive ManaBox CSV parser
    scryfall.ts          rate-limited, cached Scryfall client (server-only)
    matcher.ts           the core: deck cards × collections
    search.ts            collection + global search
  proxy.ts               the auth gate (Next 16 "proxy" convention)
tests/                   vitest unit tests (parser + normalizer)
drizzle/                 generated SQL migrations
```

## Not in v1 (planned)

- A chat assistant ("ask the pod a question") using the Anthropic API.
- Loan / lending tracking.
- Price tracking beyond the CSV's purchase price.
```
