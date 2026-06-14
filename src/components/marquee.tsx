import { GlitterField } from "./glitter-field";

export function Marquee({ items }: { items: string[] }) {
  // Duplicate the run so the -50% translate loops seamlessly.
  const run = items.join("  ✦  ");
  return (
    <div className="glitter-base relative overflow-hidden rounded-full border-[3px] border-white bg-gradient-to-r from-[#36a7e0] via-[#9b6cff] to-[#ff79b0] py-1.5 shadow-[0_3px_0_rgba(123,79,224,0.35)]">
      <GlitterField density={1} />
      <div className="marquee-track pixel relative z-[3] text-[16px] text-white">
        <span className="px-4">✦ {run} ✦&nbsp;</span>
        <span className="px-4" aria-hidden>
          ✦ {run} ✦&nbsp;
        </span>
      </div>
    </div>
  );
}
