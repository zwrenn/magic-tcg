import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth';
import { getBuildableDecks } from '@/lib/decks';
import {
  getFeaturedSet,
  getFreshPulls,
  newsId,
  POD_ANNOUNCEMENTS,
} from '@/lib/news';
import { Sidebar } from '@/components/sidebar';
import { DeckGrid } from '@/components/deck-grid';
import { PodNews } from '@/components/pod-news';
import Link from 'next/link';

export default async function HomePage() {
  const user = await requireUser();
  const [decks, featured, cookieStore] = await Promise.all([
    getBuildableDecks(user.id),
    getFeaturedSet(),
    cookies(),
  ]);
  const pulls = featured ? await getFreshPulls(featured.code) : [];
  const id = newsId(featured);
  const seen = cookieStore.get('pod_news_seen')?.value === id;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-5">
      <PodNews
        featured={featured}
        events={POD_ANNOUNCEMENTS.events}
        pulls={pulls}
        newsId={id}
        seen={seen}
      />
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Sidebar currentUser={user.name} />
        {decks.length === 0 ? (
          <div className="card grid place-items-center p-12 text-center">
            <div>
              <h2 className="t-hero text-2xl">An empty spellbook</h2>
              <p className="mt-2 text-muted">No decks in the pod yet.</p>
              <Link
                href="/decks/new"
                className="gel gel-green mt-4 inline-flex"
              >
                ✚ Forge your first deck
              </Link>
            </div>
          </div>
        ) : (
          <DeckGrid decks={decks} />
        )}
      </div>
    </main>
  );
}
