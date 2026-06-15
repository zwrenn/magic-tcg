// Original pixel-art award graphics in an early-2000s web style (not copied
// from any site). Each shape is a tiny grid: '#' = metal, 'j' = gem/accent,
// '.' = empty. Rendered as crisp 1px SVG rects so they look hand-pixeled.

export type TrophyShape = "cup" | "medal" | "star" | "ribbon" | "crown" | "gem";
export type TrophyTier = "bronze" | "silver" | "gold";

const SHAPES: Record<TrophyShape, string[]> = {
  cup: [
    ".#########.",
    "#.#######.#",
    "#.##jjj##.#",
    "#.##jjj##.#",
    "..#######..",
    "...#####...",
    "....###....",
    "....###....",
    "....###....",
    "...#####...",
    "..#######..",
    ".#########.",
  ],
  medal: [
    "...#...#...",
    "...#...#...",
    "...#...#...",
    "...#...#...",
    "..#######..",
    ".#########.",
    "#####j#####",
    "####jjj####",
    "#####j#####",
    ".#########.",
    "..#######..",
  ],
  star: [
    ".....#.....",
    "....###....",
    "....###....",
    "###########",
    ".####j####.",
    "..#######..",
    "...#####...",
    "..##.#.##..",
    ".##..#..##.",
    ".#...#...#.",
    ".#.......#.",
  ],
  ribbon: [
    "..#######..",
    ".#########.",
    "####jjj####",
    "###jjjjj###",
    "####jjj####",
    ".#########.",
    "..#######..",
    "...#.#.#...",
    "...#.#.#...",
    "..#..#..#..",
    "..#.....#..",
  ],
  crown: [
    "#....#....#",
    "##..###..##",
    "##.#####.##",
    "###########",
    "##j#####j##",
    "###########",
    "###########",
    ".#########.",
  ],
  gem: [
    "...#####...",
    "..#######..",
    ".#########.",
    "###########",
    "####jjj####",
    ".#########.",
    "..#######..",
    "...#####...",
    "....###....",
  ],
};

const METAL: Record<TrophyTier, string> = {
  bronze: "#d98a3d",
  silver: "#cdd6e6",
  gold: "#ffd23f",
};
const METAL_DARK: Record<TrophyTier, string> = {
  bronze: "#9c5a1e",
  silver: "#97a3b8",
  gold: "#d99a12",
};

export function PixelTrophy({
  shape,
  tier,
  gem,
  size = 46,
}: {
  shape: TrophyShape;
  tier: TrophyTier;
  gem: string;
  size?: number;
}) {
  const grid = SHAPES[shape] ?? SHAPES.cup;
  const cols = Math.max(...grid.map((r) => r.length));
  const rows = grid.length;
  const metal = METAL[tier];
  const dark = METAL_DARK[tier];

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    const line = grid[r];
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === ".") continue;
      // bottom-row metal pixels get the darker shade for a little depth
      const isMetal = ch === "#";
      const fill = ch === "j" ? gem : isMetal && r === rows - 1 ? dark : metal;
      cells.push(<rect key={`${r}-${c}`} x={c} y={r} width={1.02} height={1.02} fill={fill} />);
    }
  }

  return (
    <svg
      width={size}
      height={(size / cols) * rows}
      viewBox={`0 0 ${cols} ${rows}`}
      shapeRendering="crispEdges"
      style={{ filter: "drop-shadow(0 2px 0 rgba(0,0,0,0.22))" }}
      aria-hidden
    >
      {cells}
    </svg>
  );
}
