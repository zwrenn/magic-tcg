import { getCurrentUser } from "@/lib/auth";
import { getPodStats } from "@/lib/pod-stats";
import { Banner } from "./banner";
import { Tabs } from "./tabs";
import { Marquee } from "./marquee";
import { GlitterField } from "./glitter-field";

/** Banner + folder tabs + proclamation marquee. Hidden on the gate. */
export async function SiteChrome() {
  const user = await getCurrentUser();
  if (!user) return null;
  const stats = await getPodStats();

  const proclamations = [
    `✨ Welcome back, ${user.name}!`,
    `🃏 The pod has ${stats.cards.toLocaleString()} cards across ${stats.decks} ${stats.decks === 1 ? "deck" : "decks"}`,
    `💚 A glowing green bar means someone in the pod already owns that card`,
    `🔮 Paste a decklist to see what you already own`,
  ];

  return (
    <header className="mx-auto w-full max-w-6xl px-3 pt-4">
      <Banner user={user} stats={stats} />
      <div className="mt-4">
        <div className="relative">
          <GlitterField density={0.6} />
          <div className="relative z-[3]">
            <Tabs />
          </div>
        </div>
        <Marquee items={proclamations} />
      </div>
    </header>
  );
}
