"use client";

import { useRef, useState } from "react";

const PHRASES = [
  "Nice deck!",
  "Got any foils? ✨",
  "Tap, tap, untap!",
  "Pod power! 💪",
  "Mana go brrr",
  "You're doing great!",
  "Proxy or real, I love 'em all 🔁",
  "Squee! 🐲",
  "Feed me cardboard 🍪",
  "Shiny... so shiny...",
  "Who has it? I do!",
  "Build something fun today 🎴",
];

/** A little candy dragon-blob that lives on the home page. Click to pet it. */
export function PodPet() {
  const [hop, setHop] = useState(false);
  const [say, setSay] = useState<string | null>(null);
  const [pets, setPets] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pet() {
    setPets((n) => n + 1);
    setHop(false);
    // restart the hop animation
    requestAnimationFrame(() => setHop(true));
    if (hopTimer.current) clearTimeout(hopTimer.current);
    hopTimer.current = setTimeout(() => setHop(false), 520);

    setSay(PHRASES[Math.floor((pets * 7 + 3) % PHRASES.length)]);
    if (sayTimer.current) clearTimeout(sayTimer.current);
    sayTimer.current = setTimeout(() => setSay(null), 1800);

    // float a couple hearts
    const host = wrapRef.current;
    if (host) {
      for (let i = 0; i < 3; i++) {
        const h = document.createElement("span");
        h.className = "pet-heart";
        h.textContent = ["💖", "💚", "💜", "⭐"][(pets + i) % 4];
        h.style.setProperty("--hx", `${(i - 1) * 26}px`);
        h.style.setProperty("--hr", `${(i - 1) * 25}deg`);
        host.appendChild(h);
        setTimeout(() => h.remove(), 1000);
      }
    }
  }

  return (
    <div className="module p-3">
      <div className="t-label mb-2 text-[var(--purple-deep)]">★ Your Pod Pal</div>
      <div className="flex flex-col items-center">
        <div ref={wrapRef} className="relative">
          {say && (
            <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-2xl border-[3px] border-white bg-[var(--purple)] px-3 py-1 text-xs font-bold text-white shadow-[0_3px_0_rgba(122,79,224,0.5)]">
              {say}
              <span className="absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-[3px] border-r-[3px] border-white bg-[var(--purple)]" />
            </div>
          )}
          <button
            type="button"
            onClick={pet}
            aria-label="Pet your pod pal"
            className={`pet-bob hover-wiggle block ${hop ? "pet-hop" : ""}`}
          >
            <PetSvg />
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-muted">
          {pets === 0
            ? "Psst — click me!"
            : `Petted ${pets} time${pets === 1 ? "" : "s"} 💖`}
        </p>
      </div>
    </div>
  );
}

function PetSvg() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" className="drop-shadow-[0_4px_0_rgba(63,154,44,0.45)]">
      {/* tail */}
      <path d="M72 70 q18 2 16 -16 q-2 10 -14 8" fill="#5cc04a" stroke="#fff" strokeWidth="3" />
      {/* body */}
      <ellipse cx="46" cy="58" rx="32" ry="28" fill="url(#petBody)" stroke="#fff" strokeWidth="4" />
      {/* belly */}
      <ellipse cx="46" cy="64" rx="18" ry="15" fill="#eafbe4" />
      {/* spikes */}
      <path d="M30 32 l6 -14 l6 14 z M44 28 l6 -16 l6 16 z M58 32 l6 -14 l6 14 z" fill="#9b6cff" stroke="#fff" strokeWidth="2.5" />
      {/* antenna star */}
      <line x1="46" y1="30" x2="46" y2="18" stroke="#fff" strokeWidth="3" />
      <text x="46" y="16" textAnchor="middle" fontSize="14" className="sparkle">⭐</text>
      {/* cheeks */}
      <circle cx="30" cy="60" r="6" fill="#ff9bc8" opacity="0.8" />
      <circle cx="62" cy="60" r="6" fill="#ff9bc8" opacity="0.8" />
      {/* eyes */}
      <g className="pet-eye">
        <circle cx="37" cy="52" r="7" fill="#fff" stroke="#3a3358" strokeWidth="2" />
        <circle cx="55" cy="52" r="7" fill="#fff" stroke="#3a3358" strokeWidth="2" />
        <circle cx="38.5" cy="53" r="3.2" fill="#3a3358" />
        <circle cx="56.5" cy="53" r="3.2" fill="#3a3358" />
        <circle cx="37.5" cy="51.5" r="1.1" fill="#fff" />
        <circle cx="55.5" cy="51.5" r="1.1" fill="#fff" />
      </g>
      {/* smile */}
      <path d="M40 66 q6 6 12 0" fill="none" stroke="#3a3358" strokeWidth="2.5" strokeLinecap="round" />
      <defs>
        <linearGradient id="petBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7ee06a" />
          <stop offset="1" stopColor="#3f9a2c" />
        </linearGradient>
      </defs>
    </svg>
  );
}
