import { clubById, leagues, startClubs, type Club } from "../career/clubs";
import { POS_LABEL, legacy, marketValue, type Career, type Chapter, type Focus, type Offer, type Pos } from "../career/engine";
import {
  CANVAS_HEIGHT as H, CANVAS_WIDTH as W, COLORS, clamp01, drawCameraLayer, drawCountdown, drawText, drawWatermark,
  easeOutBack, easeOutCubic, roundRectPath, type ScenePhase
} from "./canvasRenderer";

export type Stage = "club" | "focus" | "offers" | "chapter";
export const PICK_MS = 750;
export const CHAPTER_MS = 3200;

export interface CareerScene {
  phase: ScenePhase;
  countdownValue: number;
  phaseStartedAt: number;
  stage: Stage;
  stageStartedAt: number;
  career: Career | null;
  chapter: Chapter | null;
  offers: readonly Offer[];
  picked: number | null;
  pickedAt: number;
  name: string;
  pos: Pos;
}

export interface Rect { x: number; y: number; w: number; h: number }

export const FOCUS_OPTIONS: readonly { id: Focus; title: string; text: string; icon: string }[] = [
  { id: "train", title: "ركّز على التطور", text: "تدريب أكثر ونمو أسرع في السن الصغيرة", icon: "🏋️" },
  { id: "rest", title: "احمِ لياقتك", text: "إصابات أقل ومسيرة أطول", icon: "🧠" },
  { id: "push", title: "اطلب دوراً أكبر", text: "دقائق وسمعة أكثر، ومخاطرة أعلى", icon: "🌟" }
];

/** Tap targets in canvas coordinates; the same function drives drawing and the React hit areas. */
export function layoutFor(stage: Stage, n: number): Rect[] {
  if (stage === "club") return Array.from({ length: n }, (_, i) => ({ x: 50 + (i % 2) * 500, y: 640 + Math.floor(i / 2) * 230, w: 480, h: 210 }));
  if (stage === "focus") return Array.from({ length: n }, (_, i) => ({ x: 60, y: 760 + i * 290, w: 960, h: 260 }));
  if (stage === "offers") return Array.from({ length: n }, (_, i) => ({ x: 60, y: 640 + i * 275, w: 960, h: 250 }));
  return [];
}

const withAlpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const ROLE_COLOR: Record<string, string> = { "نجم الفريق": "#5be0a0", "لاعب أساسي": "#f6c744", "بديل متناوب": "#f2a33c", "احتياطي": "#ff8585", "مهمَّش": "#ff5a5a" };
const fmt = (m: number) => `€${m >= 10 ? Math.round(m) : m}M`;

export function createCareerRenderer(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D is not available");
  const g = ctx;

  // Optional real logos: public/clubs/<id>.png. Missing files keep the drawn crest.
  const logos = new Map<string, HTMLImageElement | null>();
  const logo = (id: string) => {
    if (!logos.has(id)) {
      logos.set(id, null);
      const img = new Image();
      img.onload = () => { if (img.naturalWidth > 0) logos.set(id, img); };
      img.src = `/clubs/${id}.png`;
    }
    return logos.get(id) ?? null;
  };

  function crest(club: Club, x: number, y: number, r: number, scale = 1) {
    g.save();
    g.translate(x, y);
    g.scale(scale, scale);
    g.shadowColor = "rgba(0,0,0,.55)";
    g.shadowBlur = r * 0.35;
    const img = logo(club.id);
    if (img) {
      g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill();
      g.shadowBlur = 0;
      const k = (r * 1.5) / Math.max(img.naturalWidth, img.naturalHeight);
      g.drawImage(img, (-img.naturalWidth * k) / 2, (-img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
    } else {
      const [a, b] = club.colors;
      g.beginPath();
      g.moveTo(-r * 0.85, -r * 0.9); g.lineTo(r * 0.85, -r * 0.9); g.lineTo(r * 0.85, r * 0.15);
      g.quadraticCurveTo(r * 0.85, r * 0.75, 0, r); g.quadraticCurveTo(-r * 0.85, r * 0.75, -r * 0.85, r * 0.15);
      g.closePath();
      g.fillStyle = a; g.fill();
      g.shadowBlur = 0;
      g.save(); g.clip();
      g.fillStyle = b; g.fillRect(-r * 0.3, -r, r * 0.6, r * 2);
      g.restore();
      g.lineWidth = r * 0.08; g.strokeStyle = "rgba(255,255,255,.85)"; g.stroke();
      const lum = (c: string) => { const n = parseInt(c.slice(1), 16); return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11; };
      g.fillStyle = "rgba(0,0,0,.55)"; roundRectPath(g, -r * 0.62, -r * 0.2, r * 1.24, r * 0.5, r * 0.12); g.fill();
      drawText(g, club.abbr, 0, r * 0.05, { size: r * (club.abbr.length > 3 ? 0.36 : 0.44), weight: 900, dir: "ltr", color: lum(a) > 140 && lum(b) > 140 ? "#111" : "#fff" });
    }
    g.restore();
  }

  function panel(r: Rect, accent: string, alpha = 0.72, hi = false) {
    roundRectPath(g, r.x, r.y, r.w, r.h, 36);
    g.fillStyle = `rgba(7,17,13,${alpha})`; g.fill();
    g.lineWidth = hi ? 6 : 2.5; g.strokeStyle = hi ? COLORS.gold : withAlpha(accent, 0.7); g.stroke();
    g.save(); roundRectPath(g, r.x, r.y, r.w, r.h, 36); g.clip();
    g.fillStyle = accent; g.fillRect(r.x, r.y, 14, r.h); // accent strip on the left
    g.restore();
  }

  /** Staggered slide-in progress for item i. */
  const intro = (t: number, i: number) => easeOutBack(clamp01((t - i * 0.07) / 0.5));

  function header(s: CareerScene, prompt: string, sub?: string) {
    drawText(g, prompt, W / 2, 290, { size: 70, weight: 900, color: COLORS.gold, maxWidth: 960 });
    if (sub) drawText(g, sub, W / 2, 365, { size: 36, weight: 600, color: "rgba(244,247,242,.8)", maxWidth: 960 });
    const c = s.career;
    const y = 470;
    roundRectPath(g, 60, y - 62, 960, 124, 62); g.fillStyle = "rgba(7,17,13,.7)"; g.fill();
    if (c) {
      crest(clubById(c.clubId), 940, y, 46);
      drawText(g, c.name, 890, y - 20, { size: 44, weight: 900, align: "right", maxWidth: 560 });
      drawText(g, `${POS_LABEL[c.pos]} · ${c.age} سنة · ${fmt(marketValue(c.ovr, c.age, c.rep))}`, 890, y + 30, { size: 30, weight: 600, align: "right", color: "rgba(244,247,242,.7)", maxWidth: 560 });
      roundRectPath(g, 100, y - 46, 110, 92, 22); g.fillStyle = COLORS.gold; g.fill();
      drawText(g, String(c.ovr), 155, y + 4, { size: 66, weight: 900, color: "#1b1500", dir: "ltr" });
    } else {
      drawText(g, s.name, W / 2, y - 18, { size: 46, weight: 900 });
      drawText(g, `${POS_LABEL[s.pos]} · 17 سنة · الدوري المغربي`, W / 2, y + 30, { size: 30, weight: 600, color: "rgba(244,247,242,.7)" });
    }
  }

  function stageClub(s: CareerScene, t: number) {
    header(s, "اختر ناديك الأول", "من أول عشرة أندية مغربية");
    layoutFor("club", startClubs.length).forEach((r, i) => {
      const club = startClubs[i];
      const p = intro(t, i);
      g.save();
      g.globalAlpha = clamp01(p) * (s.picked !== null && s.picked !== i ? 0.35 : 1);
      g.translate(r.x + r.w / 2, r.y + r.h / 2);
      const pulse = s.picked === i ? 1 + 0.05 * Math.sin(clamp01((performance.now() - s.pickedAt) / PICK_MS) * Math.PI) : 1;
      g.scale(Math.max(0.01, p) * pulse, Math.max(0.01, p) * pulse);
      g.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
      panel(r, club.colors[0] === "#ffffff" ? club.colors[1] : club.colors[0], 0.78, s.picked === i);
      crest(club, r.x + r.w - 95, r.y + r.h / 2, 68);
      drawText(g, club.name, r.x + r.w - 185, r.y + r.h / 2 - 22, { size: 40, weight: 900, align: "right", maxWidth: 270, minSize: 26 });
      drawText(g, `قوة ${club.strength}`, r.x + r.w - 185, r.y + r.h / 2 + 34, { size: 28, weight: 600, align: "right", color: "rgba(244,247,242,.65)" });
      g.restore();
    });
  }

  function stageFocus(s: CareerScene, t: number) {
    header(s, "كيف تبني مسيرتك؟", "اختيارك يؤثر في كل المواسم القادمة");
    layoutFor("focus", FOCUS_OPTIONS.length).forEach((r, i) => {
      const o = FOCUS_OPTIONS[i];
      const p = clamp01(intro(t, i));
      g.save();
      g.globalAlpha = p * (s.picked !== null && s.picked !== i ? 0.35 : 1);
      g.translate((1 - p) * 140, 0);
      panel(r, COLORS.grass, 0.78, s.picked === i);
      drawText(g, o.icon, r.x + r.w - 110, r.y + r.h / 2, { size: 90 });
      drawText(g, o.title, r.x + r.w - 200, r.y + r.h / 2 - 34, { size: 54, weight: 900, align: "right", maxWidth: 680 });
      drawText(g, o.text, r.x + r.w - 200, r.y + r.h / 2 + 38, { size: 32, weight: 600, align: "right", color: "rgba(244,247,242,.75)", maxWidth: 680 });
      g.restore();
    });
  }

  function stageOffers(s: CareerScene, t: number) {
    const c = s.career;
    header(s, "قرار مصيري", c ? `الأشهر ليس دائماً الأفضل · تقييمك ${c.ovr}` : undefined);
    layoutFor("offers", s.offers.length).forEach((r, i) => {
      const o = s.offers[i];
      const p = clamp01(intro(t, i));
      const club = o.club;
      g.save();
      g.globalAlpha = p * (s.picked !== null && s.picked !== i ? 0.35 : 1);
      g.translate((1 - p) * 140, 0);
      panel(r, club.colors[0] === "#ffffff" ? club.colors[1] : club.colors[0], 0.8, s.picked === i);
      crest(club, r.x + r.w - 110, r.y + r.h / 2, 74);
      drawText(g, club.name, r.x + r.w - 210, r.y + 62, { size: 50, weight: 900, align: "right", maxWidth: 600 });
      drawText(g, leagues[club.league].name, r.x + r.w - 210, r.y + 118, { size: 30, weight: 600, align: "right", color: "rgba(244,247,242,.65)" });
      drawText(g, `الدور المتوقع: ${o.role}`, r.x + r.w - 210, r.y + 172, { size: 36, weight: 800, align: "right", color: ROLE_COLOR[o.role] ?? COLORS.chalk, maxWidth: 600 });
      drawText(g, o.note, r.x + r.w - 210, r.y + 218, { size: 26, weight: 500, align: "right", color: "rgba(244,247,242,.55)", maxWidth: 600 });
      drawText(g, fmt(o.wage), r.x + 60, r.y + 80, { size: 50, weight: 900, align: "left", dir: "ltr", color: COLORS.gold });
      drawText(g, `${o.years} سنوات`, r.x + 60, r.y + 138, { size: 30, weight: 600, align: "left", color: "rgba(244,247,242,.7)" });
      drawText(g, o.kind === "renew" ? "تجديد" : "انتقال", r.x + 60, r.y + 196, { size: 28, weight: 800, align: "left", color: o.kind === "renew" ? "#5be0a0" : "#91caff" });
      g.restore();
    });
  }

  function stageChapter(s: CareerScene, t: number) {
    const ch = s.chapter, c = s.career;
    if (!ch || !c) return;
    const club = clubById(ch.clubId);
    header(s, `من ${ch.fromAge} إلى ${ch.toAge} سنة`, club.name);
    const box: Rect = { x: 60, y: 600, w: 960, h: 1090 };
    g.globalAlpha = clamp01(t / 0.3);
    panel(box, club.colors[0] === "#ffffff" ? club.colors[1] : club.colors[0], 0.8);
    crest(club, W / 2, 770, 110, Math.max(0.01, easeOutBack(clamp01(t / 0.55))));
    const k = easeOutCubic(clamp01((t - 0.3) / 1.2));
    const ovr = Math.round(ch.ovrFrom + (ch.ovrTo - ch.ovrFrom) * k);
    drawText(g, String(ovr), W / 2, 960, { size: 150, weight: 900, color: COLORS.gold, dir: "ltr" });
    drawText(g, `${ch.ovrTo - ch.ovrFrom >= 0 ? "+" : ""}${ch.ovrTo - ch.ovrFrom} تقييم`, W / 2, 1050, { size: 36, weight: 700, color: ch.ovrTo >= ch.ovrFrom ? "#5be0a0" : "#ff8585" });
    const stats: [string, number][] = [["مباريات", ch.apps], ["أهداف", ch.goals], ["صناعة", ch.assists], ["ألقاب", ch.trophies]];
    stats.forEach(([label, v], i) => {
      const x = 130 + i * 255;
      const kk = easeOutCubic(clamp01((t - 0.5 - i * 0.12) / 0.9));
      drawText(g, String(Math.round(v * kk)), x + 60, 1160, { size: 76, weight: 900, dir: "ltr" });
      drawText(g, label, x + 60, 1225, { size: 30, weight: 600, color: "rgba(244,247,242,.65)" });
    });
    ch.events.slice(0, 5).forEach((e, i) => {
      const p = clamp01((t - 1 - i * 0.28) / 0.35);
      if (p <= 0) return;
      g.save();
      g.globalAlpha = p; g.translate((1 - p) * 80, 0);
      const strong = /🏆|🥇|👟/.test(e);
      roundRectPath(g, 100, 1285 + i * 72, 880, 60, 30);
      g.fillStyle = strong ? "rgba(246,199,68,.25)" : "rgba(255,255,255,.1)"; g.fill();
      drawText(g, e, W / 2, 1316 + i * 72, { size: 32, weight: 700, maxWidth: 820, color: strong ? COLORS.gold : COLORS.chalk });
      g.restore();
    });
    g.globalAlpha = 1;
    if (ch.trophies > 0) confetti(t, 0.5);
  }

  function confetti(t: number, density = 1) {
    const pal = ["#f6c744", "#5be0a0", "#ffffff", "#91caff", "#ff8585"];
    const n = Math.floor(70 * density);
    for (let i = 0; i < n; i++) {
      const x = (i * 137) % W;
      const y = (t * (260 + (i % 5) * 60) + i * 97) % H;
      g.save();
      g.translate(x + Math.sin(t * 2 + i) * 30, y);
      g.rotate(t * 3 + i);
      g.fillStyle = pal[i % pal.length];
      g.fillRect(-8, -4, 16, 8);
      g.restore();
    }
  }

  function drawFinal(s: CareerScene, now: number) {
    const c = s.career;
    g.fillStyle = "rgba(4,10,7,.82)"; g.fillRect(0, 0, W, H);
    if (!c) return;
    const t = (now - s.phaseStartedAt) / 1000;
    const { title, pts } = legacy(c);
    const goals = c.log.reduce((a, l) => a + l.goals, 0);
    const assists = c.log.reduce((a, l) => a + l.assists, 0);
    const apps = c.log.reduce((a, l) => a + l.apps, 0);
    drawText(g, "LEGEND CARD", W / 2, 290, { size: 40, weight: 800, dir: "ltr", color: "rgba(244,247,242,.6)" });
    const sc = Math.max(0.01, easeOutBack(clamp01(t / 0.6)));
    g.save(); g.translate(W / 2, 420); g.scale(sc, sc);
    g.shadowColor = COLORS.gold; g.shadowBlur = 40;
    drawText(g, title, 0, 0, { size: 110, weight: 900, color: COLORS.gold, maxWidth: 960 });
    g.restore();
    drawText(g, `${c.name} · ${POS_LABEL[c.pos]} · نقاط الإرث ${pts}`, W / 2, 520, { size: 38, weight: 700, maxWidth: 960 });

    const ids: string[] = [];
    c.log.forEach((l) => { if (ids[ids.length - 1] !== l.clubId && !ids.includes(l.clubId)) ids.push(l.clubId); });
    const shown = ids.slice(0, 6);
    shown.forEach((id, i) => {
      const x = W / 2 + (i - (shown.length - 1) / 2) * 150;
      crest(clubById(id), x, 650, 56, Math.max(0.01, easeOutBack(clamp01((t - 0.3 - i * 0.1) / 0.4))));
    });

    const rows: [string, string][] = [
      ["مباريات", String(apps)], ["أهداف", String(goals)], ["تمريرات حاسمة", String(assists)], ["مع المنتخب", String(c.caps)],
      ["ألقاب الدوري", String(c.league)], ["ألقاب قارية", String(c.cont)], ["أمم إفريقيا", String(c.afcon)], ["كأس العالم", String(c.wc)],
      ["الكرة الذهبية", String(c.ballon)], ["الحذاء الذهبي", String(c.boot)], ["أعلى تقييم", String(c.peakOvr)], ["أعلى قيمة", fmt(c.peakValue)]
    ];
    rows.forEach(([label, v], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const r: Rect = { x: 60 + col * 490, y: 770 + row * 150, w: 470, h: 128 };
      const p = clamp01(easeOutCubic(clamp01((t - 0.5 - i * 0.07) / 0.4)));
      g.save(); g.globalAlpha = p; g.translate(0, (1 - p) * 40);
      roundRectPath(g, r.x, r.y, r.w, r.h, 28); g.fillStyle = "rgba(255,255,255,.08)"; g.fill();
      drawText(g, v, r.x + 110, r.y + 64, { size: 62, weight: 900, color: COLORS.gold, dir: "ltr", maxWidth: 190 });
      drawText(g, label, r.x + r.w - 30, r.y + 64, { size: 32, weight: 700, align: "right", maxWidth: 240 });
      g.restore();
    });
    if (pts >= 75 || c.ballon > 0 || c.wc > 0) confetti(t);
  }

  return {
    draw(s: CareerScene, now: number) {
      g.textBaseline = "middle";
      drawCameraLayer(g, video);
      if (s.phase === "final") drawFinal(s, now);
      else if (s.phase === "countdown") drawCountdown(g, s, now);
      else if (s.phase === "idle") {
        drawText(g, "طريق الأسطورة", W / 2, 520, { size: 120, weight: 900, color: COLORS.gold, maxWidth: 960 });
        drawText(g, "من المغرب إلى المجد · 17 → 38", W / 2, 640, { size: 46, weight: 700, maxWidth: 960 });
      } else {
        const t = (now - Math.max(s.stageStartedAt, s.phaseStartedAt)) / 1000;
        if (s.stage === "club") stageClub(s, t);
        else if (s.stage === "focus") stageFocus(s, t);
        else if (s.stage === "offers") stageOffers(s, t);
        else stageChapter(s, t);
      }
      drawWatermark(g);
    },
    dispose() { /* nothing to release */ }
  };
}
