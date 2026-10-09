/**
 * Career data. Strengths and probabilities are approximate, editable simulation
 * values (not official ratings, not real transfer offers).
 */

export type LeagueId = "MA" | "AF" | "EN" | "ES" | "DE" | "IT" | "FR" | "PT" | "NL" | "SA";

export interface League {
  name: string;
  /** 0..1, drives reputation growth and award eligibility. */
  weight: number;
  games: number;
}

export interface Club {
  id: string;
  /** Crest colours (approximate placeholders; drop real logos in public/clubs/<id>.png). */
  colors: [string, string];
  /** Short Latin code drawn on the placeholder crest. */
  abbr: string;
  name: string;
  league: LeagueId;
  /** Squad strength on the same 0..100 scale as player rating. */
  strength: number;
  /** Chance of winning the domestic league in a season. */
  pLeague: number;
  /** Chance of winning the continental trophy in a season. */
  pCont: number;
  /** Wage multiplier. */
  rich: number;
}

export const leagues: Record<LeagueId, League> = {
  MA: { name: "البطولة المغربية", weight: 0.5, games: 30 },
  AF: { name: "الدوري الإفريقي", weight: 0.55, games: 30 },
  EN: { name: "الدوري الإنجليزي", weight: 1, games: 38 },
  ES: { name: "الدوري الإسباني", weight: 0.95, games: 38 },
  DE: { name: "الدوري الألماني", weight: 0.9, games: 34 },
  IT: { name: "الدوري الإيطالي", weight: 0.9, games: 38 },
  FR: { name: "الدوري الفرنسي", weight: 0.85, games: 34 },
  PT: { name: "الدوري البرتغالي", weight: 0.75, games: 34 },
  NL: { name: "الدوري الهولندي", weight: 0.75, games: 34 },
  SA: { name: "الدوري السعودي", weight: 0.75, games: 34 }
};

type Raw = Omit<Club, "colors" | "abbr">;
const c = (id: string, name: string, league: LeagueId, strength: number, pLeague: number, pCont: number, rich = 1): Raw =>
  ({ id, name, league, strength, pLeague, pCont, rich });

const RAW: readonly Raw[] = [
  c("raja", "الرجاء الرياضي", "MA", 66, 0.22, 0.1, 0.4),
  c("wydad", "الوداد الرياضي", "MA", 67, 0.25, 0.12, 0.4),
  c("far", "الجيش الملكي", "MA", 65, 0.18, 0.08, 0.4),
  c("berkane", "نهضة بركان", "MA", 66, 0.2, 0.12, 0.4),
  c("mas", "المغرب الفاسي", "MA", 61, 0.1, 0.03, 0.3),
  c("fus", "الفتح الرياضي", "MA", 58, 0.06, 0.02, 0.3),
  c("husa", "حسنية أكادير", "MA", 57, 0.04, 0.01, 0.3),
  c("safi", "أولمبيك آسفي", "MA", 56, 0.03, 0.01, 0.3),
  c("tanger", "اتحاد طنجة", "MA", 57, 0.04, 0.01, 0.3),
  c("dhj", "الدفاع الحسني الجديدي", "MA", 56, 0.03, 0.01, 0.3),
  c("ahly", "الأهلي المصري", "AF", 68, 0.5, 0.25, 0.5),
  c("sundowns", "صن داونز", "AF", 67, 0.55, 0.2, 0.5),
  c("mancity", "مانشستر سيتي", "EN", 91, 0.4, 0.2, 1.6),
  c("liverpool", "ليفربول", "EN", 88, 0.25, 0.12, 1.5),
  c("arsenal", "آرسنال", "EN", 88, 0.25, 0.12, 1.4),
  c("spurs", "توتنهام", "EN", 80, 0.04, 0.03, 1.3),
  c("villa", "أستون فيلا", "EN", 79, 0.03, 0.02, 1.2),
  c("brighton", "برايتون", "EN", 72, 0.01, 0.01, 1.1),
  c("real", "ريال مدريد", "ES", 90, 0.35, 0.28, 1.6),
  c("barca", "برشلونة", "ES", 88, 0.3, 0.15, 1.4),
  c("atletico", "أتلتيكو مدريد", "ES", 83, 0.1, 0.05, 1.2),
  c("sociedad", "ريال سوسييداد", "ES", 75, 0.01, 0.01, 1),
  c("sevilla", "إشبيلية", "ES", 74, 0.01, 0.02, 0.9),
  c("getafe", "خيتافي", "ES", 66, 0.003, 0, 0.7),
  c("bayern", "بايرن ميونخ", "DE", 89, 0.65, 0.18, 1.5),
  c("leverkusen", "باير ليفركوزن", "DE", 83, 0.12, 0.05, 1.1),
  c("dortmund", "بوروسيا دورتموند", "DE", 82, 0.1, 0.05, 1.1),
  c("mainz", "ماينز", "DE", 65, 0.002, 0, 0.7),
  c("inter", "إنتر ميلان", "IT", 85, 0.3, 0.1, 1.2),
  c("milan", "ميلان", "IT", 80, 0.12, 0.05, 1.1),
  c("juve", "يوفنتوس", "IT", 80, 0.12, 0.04, 1.2),
  c("napoli", "نابولي", "IT", 80, 0.15, 0.03, 1),
  c("cagliari", "كالياري", "IT", 62, 0.002, 0, 0.6),
  c("psg", "باريس سان جيرمان", "FR", 88, 0.7, 0.15, 1.6),
  c("monaco", "موناكو", "FR", 76, 0.08, 0.01, 1),
  c("marseille", "مرسيليا", "FR", 74, 0.05, 0.01, 1),
  c("lyon", "ليون", "FR", 73, 0.03, 0.01, 0.9),
  c("metz", "ميتز", "FR", 60, 0.001, 0, 0.5),
  c("benfica", "بنفيكا", "PT", 77, 0.4, 0.03, 0.9),
  c("porto", "بورتو", "PT", 77, 0.35, 0.03, 0.9),
  c("sporting", "سبورتينغ لشبونة", "PT", 78, 0.3, 0.03, 0.9),
  c("ajax", "أياكس", "NL", 74, 0.25, 0.02, 0.8),
  c("psv", "آيندهوفن", "NL", 76, 0.45, 0.02, 0.8),
  c("hilal", "الهلال", "SA", 76, 0.45, 0.15, 1.8),
  c("nassr", "النصر", "SA", 74, 0.25, 0.1, 1.8)
];

const BRAND: Record<string, [string, string, string]> = {
  raja: ["#0a7d3a", "#ffffff", "RCA"], wydad: ["#d62027", "#ffffff", "WAC"], far: ["#0b5a2b", "#f2c230", "FAR"],
  berkane: ["#f28c28", "#111111", "RSB"], mas: ["#f0c419", "#1a1a1a", "MAS"], fus: ["#f6c744", "#111111", "FUS"],
  husa: ["#1b5fbf", "#ffffff", "HUSA"], safi: ["#111111", "#ffffff", "OCS"], tanger: ["#ffffff", "#1b5fbf", "IRT"],
  dhj: ["#ffffff", "#0b7a3a", "DHJ"]
};
const PALETTE = ["#c8102e", "#1b5fbf", "#0a7d3a", "#f2c230", "#6b2fa0", "#e8590c", "#0b7285"];

export const clubs: readonly Club[] = RAW.map((x) => {
  const b = BRAND[x.id];
  const i = [...x.id].reduce((s, ch) => s + ch.charCodeAt(0), 0);
  return { ...x, colors: b ? [b[0], b[1]] : [PALETTE[i % PALETTE.length], "#ffffff"], abbr: b ? b[2] : x.id.slice(0, 3).toUpperCase() };
});

/** The ten Moroccan clubs a career can start with. */
export const startClubs = clubs.filter((x) => x.league === "MA");
export const clubById = (id: string): Club => clubs.find((x) => x.id === id) ?? clubs[0];
