// Flower & seedling illustrations for the reading garden.
//
// Palette note: unlike the rest of the dashboard, these colors are DELIBERATELY fixed
// (literal hex), not theme tokens. A flower is illustration — like an emoji — so a stem
// should read green and a poppy red on every theme, including Mono (black & white) and
// the pastel glass themes. The UI chrome around them (cards, text, borders) stays fully
// token-driven per DESIGN.md; only the botanical art is theme-independent. All nine
// themes sit on light grounds, so the blooms are chosen saturated enough to pop.

const STEM = "#4b9460";
const STEM_DK = "#37784b";
const GOLD = "#e7a72e";
const SOIL = "#b08a63";
const SOIL_TOP = "#c9a883";

export const NUM_FLOWER_DESIGNS = 5;
export const FLOWER_NAMES = ["Daisy", "Tulip", "Rosette", "Cosmos", "Poppy"];

// Stable design (0–4) for the Nth earned flower — a cheap integer hash so a given flower
// always shows the same shape across visits, with no per-flower storage.
export function flowerDesign(index) {
  let h = ((index + 1) * 2654435761) % 2147483647;
  h ^= h >> 13;
  return Math.abs(h) % NUM_FLOWER_DESIGNS;
}

// A ring of `n` identical ellipse petals rotated around the flower center (50,45).
function petals(n, rx, ry, dist, fill, stroke) {
  return Array.from({ length: n }, (_, i) => (
    <g key={i} transform={`rotate(${(360 / n) * i} 50 45)`}>
      <ellipse cx="50" cy={45 - dist} rx={rx} ry={ry} fill={fill}
        stroke={stroke || "none"} strokeWidth={stroke ? 1.2 : 0} />
    </g>
  ));
}

function Stem() {
  return (
    <>
      <path d="M50 118 C50 96 50 80 50 63" fill="none" stroke={STEM} strokeWidth="4" strokeLinecap="round" />
      <path d="M50 94 C40 92 33 84 31 76 C41 76 49 84 50 94Z" fill={STEM} />
      <path d="M50 84 C60 83 67 76 69 69 C59 68 51 75 50 84Z" fill={STEM_DK} />
    </>
  );
}

function FlowerArt({ design }) {
  switch (design) {
    case 0: // Daisy — white petals, gold eye
      return (<><Stem />{petals(12, 6, 14, 14, "#ffffff", "#dcd6c8")}<circle cx="50" cy="45" r="11" fill={GOLD} /></>);
    case 1: // Tulip — a warm coral cup
      return (
        <>
          <Stem />
          <path d="M34 46 C34 30 42 20 50 18 C58 20 66 30 66 46 C66 58 58 64 50 64 C42 64 34 58 34 46Z" fill="#e2603a" />
          <path d="M50 18 C46 30 46 52 50 64 C54 52 54 30 50 18Z" fill="#b8482a" />
          <path d="M34 46 C36 34 42 26 50 22 C48 34 46 52 50 64 C42 62 34 58 34 46Z" fill="#ef8a68" opacity="0.5" />
        </>
      );
    case 2: // Rosette — layered rose petals
      return (<><Stem />{petals(5, 13, 15, 10, "#d76a86")}{petals(5, 8, 9, 6, "#e79ab0")}<circle cx="50" cy="45" r="7" fill="#c8425f" /></>);
    case 3: // Cosmos — pointed violet petals
      return (<><Stem />{petals(6, 7, 17, 15, "#8a6fd4")}{petals(6, 3, 7, 7, "#b7a4ea")}<circle cx="50" cy="45" r="8" fill={GOLD} /></>);
    case 4: // Poppy — broad red petals, dark stamens
      return (<><Stem />{petals(4, 16, 15, 9, "#d64435")}{petals(4, 11, 10, 5, "#b5362b")}<circle cx="50" cy="45" r="6.5" fill="#2f2320" />{petals(8, 1, 3, 7, "#2f2320")}</>);
    default:
      return null;
  }
}

// A single grown flower. `size` is the width in px; height keeps the 100×120 ratio.
export function Flower({ design = 0, size = 88, title, className, style }) {
  const d = ((design % NUM_FLOWER_DESIGNS) + NUM_FLOWER_DESIGNS) % NUM_FLOWER_DESIGNS;
  return (
    <svg className={className} style={style} width={size} height={size * 1.2}
      viewBox="0 0 100 120" role="img" aria-label={title || `${FLOWER_NAMES[d]} flower`}>
      <FlowerArt design={d} />
    </svg>
  );
}

function Ground() {
  return (<><ellipse cx="40" cy="80" rx="27" ry="7" fill={SOIL} /><ellipse cx="40" cy="78" rx="27" ry="6" fill={SOIL_TOP} /></>);
}

// The growing plant shown on the Articles-read card: 0 = seed, up to 5 = full bloom.
// Each article read advances one stage; 5 completes a flower for the garden.
export const GROWTH_LABELS = ["Seed", "Sprout", "Leaves", "Bud", "Opening", "Bloom"];
export function Seedling({ stage = 0, size = 46, className, style }) {
  const s = Math.max(0, Math.min(5, stage));
  const label = `Seedling: ${GROWTH_LABELS[s]}`;
  if (s === 5) {
    return (
      <svg className={className} style={style} width={size} height={size * 1.15}
        viewBox="0 0 100 120" role="img" aria-label={label}>
        <Ground />
        <g transform="translate(10 -2) scale(0.8)"><FlowerArt design={0} /></g>
      </svg>
    );
  }
  return (
    <svg className={className} style={style} width={size} height={size * 1.15}
      viewBox="0 0 80 90" role="img" aria-label={label}>
      <Ground />
      {s === 0 && <ellipse cx="40" cy="77" rx="4" ry="6" fill="#7c5a3c" />}
      {s === 1 && (<>
        <path d="M40 78 C40 70 40 66 40 62" stroke={STEM} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M40 66 C34 64 31 60 30 56 C36 56 40 60 41 66Z" fill={STEM} />
      </>)}
      {s === 2 && (<>
        <path d="M40 78 C40 66 40 58 40 50" stroke={STEM} strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path d="M40 60 C32 58 27 52 26 47 C34 47 40 52 41 60Z" fill={STEM} />
        <path d="M40 54 C48 52 53 46 54 41 C46 41 41 46 40 54Z" fill={STEM_DK} />
      </>)}
      {s === 3 && (<>
        <path d="M40 78 C40 62 40 52 40 44" stroke={STEM} strokeWidth="3.6" fill="none" strokeLinecap="round" />
        <path d="M40 58 C31 56 26 50 25 45 C34 45 40 50 41 58Z" fill={STEM} />
        <ellipse cx="40" cy="38" rx="8" ry="11" fill="#e08a5a" />
        <path d="M32 40 C40 44 48 40 48 40" stroke={STEM_DK} strokeWidth="2" fill="none" />
      </>)}
      {s === 4 && (<>
        <path d="M40 78 C40 60 40 50 40 42" stroke={STEM} strokeWidth="3.6" fill="none" strokeLinecap="round" />
        <g transform="translate(-10 -7) scale(0.62)"><g transform="rotate(0 50 45)">{petals(6, 6, 12, 12, "#f0a97e")}</g></g>
        <circle cx="40" cy="35" r="6" fill={GOLD} />
      </>)}
    </svg>
  );
}
