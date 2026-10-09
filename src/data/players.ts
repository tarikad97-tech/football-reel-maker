export interface Player {
  id: string;
  name: string;
  /** Public URL of the player photo. A missing file falls back to initials. */
  image: string;
}

const IMAGE_DIR = "/players";

export const players: readonly Player[] = [
  { id: "hakimi", name: "أشرف حكيمي", image: `${IMAGE_DIR}/hakimi.png` },
  { id: "ziyech", name: "حكيم زياش", image: `${IMAGE_DIR}/ziyech.png` },
  { id: "benatia", name: "مهدي بنعطية", image: `${IMAGE_DIR}/benatia.png` },
  { id: "bounou", name: "ياسين بونو", image: `${IMAGE_DIR}/bounou.png` },
  { id: "sofyan-amrabat", name: "سفيان أمرابط", image: `${IMAGE_DIR}/sofyan-amrabat.png` },
  { id: "en-nesyri", name: "يوسف النصيري", image: `${IMAGE_DIR}/en-nesyri.png` },
  { id: "boufal", name: "سفيان بوفال", image: `${IMAGE_DIR}/boufal.png` },
  { id: "nordin-amrabat", name: "نور الدين أمرابط", image: `${IMAGE_DIR}/nordin-amrabat.png` }
];

/** First letters of the first and last word; ZWNJ stops Arabic letters from joining. */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return words[0].slice(0, 2);
  return `${words[0][0]}\u200c${words[words.length - 1][0]}`;
}
