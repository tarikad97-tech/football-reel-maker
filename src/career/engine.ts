import { clubById, clubs, leagues, type Club } from "./clubs";

export type Pos = "FW" | "W" | "MF" | "DF";
export const POS_LABEL: Record<Pos, string> = { FW: "مهاجم", W: "جناح", MF: "لاعب وسط", DF: "مدافع" };
export const START_AGE = 17;
export const END_AGE = 38;
const START_YEAR = 2026;

export interface SeasonLog {
  age: number;
  season: string;
  clubId: string;
  ovr: number;
  apps: number;
  goals: number;
  assists: number;
  perf: number;
  role: string;
  events: string[];
  trophies: number;
}

export type Focus = "train" | "rest" | "push";

export interface Career {
  focus: Focus;
  name: string;
  pos: Pos;
  age: number;
  ovr: number;
  pot: number; // hidden
  clubId: string;
  years: number; // contract years left
  rep: number;
  adapting: boolean;
  peakOvr: number;
  peakValue: number;
  caps: number;
  league: number;
  cont: number;
  afcon: number;
  wc: number;
  ballon: number;
  boot: number;
  poty: number;
  log: SeasonLog[];
}

export interface Offer {
  kind: "renew" | "move";
  club: Club;
  years: number;
  wage: number;
  role: string;
  note: string;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

function poisson(l: number): number {
  const L = Math.exp(-l);
  let k = 0;
  let p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

export function marketValue(ovr: number, age: number, rep: number): number {
  const ageF = age <= 21 ? 1.3 : age <= 27 ? 1 : Math.max(0.15, 1 - (age - 27) * 0.13);
  return Math.max(0.1, Math.round(20 * Math.exp(0.11 * (ovr - 70)) * ageF * (1 + rep / 200) * 10) / 10);
}

export function roleOf(ovr: number, club: Club): { label: string; minutes: number } {
  const d = ovr - club.strength;
  if (d >= 3) return { label: "نجم الفريق", minutes: 0.92 };
  if (d >= -2) return { label: "لاعب أساسي", minutes: 0.78 };
  if (d >= -6) return { label: "بديل متناوب", minutes: 0.55 };
  if (d >= -11) return { label: "احتياطي", minutes: 0.3 };
  return { label: "مهمَّش", minutes: 0.12 };
}

export const wageOf = (c: Career, club: Club) =>
  Math.max(0.05, Math.round(marketValue(c.ovr, c.age, c.rep) * 0.07 * club.rich * 100) / 100);

export function newCareer(name: string, pos: Pos, clubId: string): Career {
  const ovr = Math.round(rnd(57, 64));
  return {
    name: name.trim() || "لاعب مغربي", pos, age: START_AGE, ovr,
    pot: Math.round(74 + 20 * Math.pow(Math.random(), 1.6)),
    clubId, focus: "train", years: 3, rep: 5, adapting: false, peakOvr: ovr, peakValue: marketValue(ovr, START_AGE, 5),
    caps: 0, league: 0, cont: 0, afcon: 0, wc: 0, ballon: 0, boot: 0, poty: 0, log: []
  };
}

const GPG: Record<Pos, number> = { FW: 0.45, W: 0.3, MF: 0.14, DF: 0.04 };
const APG: Record<Pos, number> = { FW: 0.14, W: 0.25, MF: 0.2, DF: 0.07 };

function tournamentResult(win: number): string {
  const r = Math.random();
  if (r < win) return "بطل";
  if (r < win + 0.08) return "وصيف";
  if (r < win + 0.18) return "نصف النهائي";
  if (r < win + 0.38) return "ربع النهائي";
  return "خرج مبكراً";
}

/** Simulates one season for the current age and returns the updated career. */
export function simulateSeason(prev: Career): Career {
  const c: Career = { ...prev, log: [...prev.log] };
  const club = clubById(c.clubId);
  const lg = leagues[club.league];
  const events: string[] = [];
  const role = roleOf(c.ovr, club);
  let m = clamp(role.minutes + rnd(-0.1, 0.1) + (c.focus === "push" ? 0.05 : 0), 0.05, 0.97);
  if (c.adapting) { m *= 0.9; events.push("فترة تأقلم مع نادٍ ودوري جدد"); }

  let growthPenalty = 0;
  const injured = Math.random() < 0.1 + (c.age > 30 ? 0.08 : 0) + (c.focus === "rest" ? -0.06 : c.focus === "push" ? 0.03 : 0);
  if (injured) { m *= 0.6; growthPenalty = 1; events.push("إصابة أبعدته عن عدة مباريات"); }

  // Growth / decline
  const coach = 0.85 + club.strength / 400;
  let delta: number;
  if (c.age <= 27) {
    const rate = c.age <= 19 ? 0.3 : c.age <= 22 ? 0.28 : c.age <= 25 ? 0.22 : 0.15;
    delta = (c.pot - c.ovr) * rate * (0.3 + m) * coach + rnd(-1, 1);
    if (c.ovr > club.strength + 8) delta *= 0.4; // no challenge, development plateaus
    if (Math.random() < 0.06) { delta += 2.5; events.push("موسم انفجاري ورفع مستواه فجأة"); }
  } else if (c.age <= 30) delta = -0.5 + rnd(-1, 1);
  else if (c.age <= 33) delta = -1.2 + rnd(-1, 0.8);
  else delta = -2 + rnd(-1, 0.6);
  if (c.focus === "train" && c.age <= 25) delta += 0.8;
  if (c.age > 27 && Math.random() < 0.04) { delta -= 2; events.push("تراجع مفاجئ في المستوى"); }
  c.ovr = clamp(Math.round(c.ovr + delta - growthPenalty), 40, c.age <= 27 ? c.pot : 99);

  // Stats
  const apps = Math.round(lg.games * m);
  const skill = clamp(0.5 + (c.ovr - 55) / 30, 0.3, 1.8) * clamp(1 + (c.ovr - club.strength) / 50, 0.6, 1.4);
  const goals = poisson(apps * GPG[c.pos] * skill);
  const assists = poisson(apps * APG[c.pos] * skill);
  const perf = clamp(6 + (c.ovr - club.strength) * 0.08 + (goals + assists) / Math.max(apps, 1) * 2 + rnd(-0.6, 0.6), 4, 9.9);
  if (c.age < 25 && perf >= 8 && c.pot < 99) c.pot += 1;

  // Team honours (need to have actually played)
  let trophies = 0;
  if (apps >= 8 && Math.random() < club.pLeague) { c.league++; trophies++; events.push(`🏆 بطل ${lg.name}`); }
  let contWin = false;
  if (apps >= 8 && Math.random() < club.pCont) { c.cont++; trophies++; contWin = true; events.push("🏆 بطل البطولة القارية"); }

  // National team
  const year = START_YEAR + (c.age - START_AGE);
  const called = (c.ovr >= 72 && c.age >= 19 && m >= 0.4) || c.ovr >= 78;
  let wcWin = false;
  if (called) {
    if (prev.caps === 0) events.push("🇲🇦 أول استدعاء للمنتخب");
    c.caps += Math.round(rnd(4, 10));
    const afcon = year % 2 === 0;
    const wc = year % 4 === 1;
    if (afcon) {
      const r = tournamentResult(0.05 + Math.max(0, c.ovr - 78) * 0.006);
      events.push(`كأس أمم إفريقيا: ${r}`);
      if (r === "بطل") { c.afcon++; trophies++; }
    }
    if (wc) {
      const r = tournamentResult(0.015 + Math.max(0, c.ovr - 80) * 0.004);
      events.push(`كأس العالم: ${r}`);
      if (r === "بطل") { c.wc++; trophies++; wcWin = true; }
    }
  }

  // Individual awards
  if (c.ovr >= 87 && apps >= 25 && lg.weight >= 0.85) {
    const p = clamp((c.ovr - 86) * 0.05 + (contWin ? 0.25 : 0) + (wcWin ? 0.3 : 0) + (trophies ? 0.06 : 0) + (goals >= 25 ? 0.08 : 0), 0, 0.85) * 0.4;
    if (Math.random() < p) { c.ballon++; events.push("🥇 الكرة الذهبية"); }
  }
  if (goals >= 26 && Math.random() < (goals - 24) * 0.12) { c.boot++; events.push("👟 الحذاء الذهبي"); }
  if (perf >= 8.3 && Math.random() < 0.5) { c.poty++; events.push("⭐ أفضل لاعب في الدوري"); }
  if (c.age >= 33 && Math.random() < 0.15) events.push("تحدثت الصحافة عن اقتراب الاعتزال");

  // Reputation & value
  c.rep = clamp(Math.round(c.rep + (c.focus === "push" ? 2 : 0) + (perf - 6.5) * 4 * (0.4 + lg.weight) + trophies * 3 - (c.age > 31 ? 1.5 : 0)), 0, 100);
  c.peakOvr = Math.max(c.peakOvr, c.ovr);
  c.peakValue = Math.max(c.peakValue, marketValue(c.ovr, c.age, c.rep));
  c.adapting = false;

  c.log.push({
    age: c.age, season: `${year}/${String(year + 1).slice(2)}`, clubId: club.id, ovr: c.ovr,
    apps, goals, assists, perf: Math.round(perf * 10) / 10, role: role.label, events, trophies
  });
  c.age += 1;
  c.years -= 1;
  return c;
}

/** Offers for the coming season. Returns [] when no decision is needed. */
export function makeOffers(c: Career): Offer[] {
  if (c.age > END_AGE) return [];
  const expired = c.years <= 0;
  if (!expired && !(c.age >= 18 && c.age <= 35 && Math.random() < 0.35)) return [];

  const cur = clubById(c.clubId);
  const reach = c.ovr + 6 + c.rep * 0.12;
  const eligible = clubs
    .filter((x) => x.id !== cur.id && x.strength <= reach && x.strength >= c.ovr - 14)
    .filter((x) => x.league !== "SA" || c.age >= 29)
    .filter((x) => Math.random() < 0.35 + c.rep / 200 || x.league === "MA")
    .sort((a, b) => b.strength - a.strength);

  const chosen: Club[] = [];
  if (eligible[0] && eligible[0].strength > cur.strength) chosen.push(eligible[0]);
  for (const x of [...eligible.slice(1)].sort(() => Math.random() - 0.5)) {
    if (chosen.length >= 3) break;
    chosen.push(x);
  }

  const offers: Offer[] = chosen.map((club) => {
    const abroad = club.league !== "MA";
    return {
      kind: "move", club, years: c.age >= 31 ? 2 : pick([3, 4, 5]),
      wage: wageOf(c, club), role: roleOf(c.ovr, club).label,
      note: abroad ? "يحتاج إلى فترة تأقلم" : "قريب من البيئة التي تعرفها"
    };
  });

  const dropped = c.ovr - cur.strength < -12 && c.age > 20;
  if (!(expired && dropped)) {
    offers.unshift({
      kind: "renew", club: cur, years: c.age >= 33 ? 1 : pick([2, 3, 4]), wage: wageOf(c, cur),
      role: roleOf(c.ovr, cur).label, note: expired ? "تجديد العقد" : "رفض العروض والبقاء"
    });
  } else if (offers.length === 0) {
    const fb = clubs.filter((x) => x.league === "MA").sort((a, b) => Math.abs(a.strength - c.ovr) - Math.abs(b.strength - c.ovr))[0];
    offers.push({ kind: "move", club: fb, years: 2, wage: wageOf(c, fb), role: roleOf(c.ovr, fb).label, note: "عرض أخير بعد عدم تجديد عقدك" });
  }
  return offers.length > 0 && (offers.length > 1 || expired) ? offers : [];
}

export function acceptOffer(c: Career, o: Offer): Career {
  const moved = o.club.id !== c.clubId;
  return { ...c, clubId: o.club.id, years: o.years, adapting: moved && o.club.league !== "MA" };
}

export function legacy(c: Career) {
  const goals = c.log.reduce((s, l) => s + l.goals, 0);
  const pts = (c.peakOvr - 60) * 1.2 + c.league * 3 + c.cont * 8 + c.afcon * 18 + c.wc * 45 + c.ballon * 40 + c.boot * 8 + c.poty * 4 + goals / 15 + c.caps / 10;
  let title = "موهبة ضائعة";
  if (pts >= 190 || c.ballon > 0 || c.wc > 0) title = "أسطورة عالمية";
  else if (pts >= 130) title = "أسطورة إفريقية";
  else if (pts >= 75) title = "نجم كبير";
  else if (pts >= 40) title = "لاعب محترف ناجح";
  return { pts: Math.round(pts), title };
}

export interface Chapter {
  fromAge: number;
  toAge: number;
  clubId: string;
  ovrFrom: number;
  ovrTo: number;
  apps: number;
  goals: number;
  assists: number;
  trophies: number;
  events: string[];
  ended: boolean;
}

/** Auto-simulates seasons until the next decision (or retirement) and summarises them. */
export function runChapter(start: Career): { career: Career; chapter: Chapter; offers: Offer[] } {
  let c = start;
  let offers: Offer[] = [];
  const from = c.log.length;
  do {
    c = simulateSeason(c);
    offers = makeOffers(c);
  } while (offers.length === 0 && c.age <= END_AGE);
  const seasons = c.log.slice(from);
  const sum = (f: (l: SeasonLog) => number) => seasons.reduce((s, l) => s + f(l), 0);
  const events = seasons.flatMap((l) => l.events.filter((e) => /🏆|🥇|👟|⭐|🇲🇦|كأس|إصابة/.test(e)).map((e) => `${l.age}: ${e}`));
  const ended = c.age > END_AGE;
  if (ended) events.push("🎽 اعتزل اللاعب");
  return {
    career: c, offers: ended ? [] : offers,
    chapter: {
      fromAge: seasons[0].age, toAge: seasons[seasons.length - 1].age, clubId: seasons[seasons.length - 1].clubId,
      ovrFrom: from === 0 ? start.ovr : start.log[from - 1].ovr, ovrTo: c.ovr,
      apps: sum((l) => l.apps), goals: sum((l) => l.goals), assists: sum((l) => l.assists), trophies: sum((l) => l.trophies),
      events, ended
    }
  };
}
