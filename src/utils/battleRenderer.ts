import { getScore, type BattleResult, type BattleTemplate, type Side } from "../data/battles";
import { getInitials } from "../data/players";
import type { Entrant } from "../data/teams";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  clamp01,
  drawCameraLayer,
  drawCover,
  drawText,
  drawWatermark,
  easeOutBack,
  easeOutCubic,
  loadPlayerImages,
  roundRectPath,
  type ImageMap,
  type ScenePhase
} from "./canvasRenderer";

const W = CANVAS_WIDTH;
const H = CANVAS_HEIGHT;

/** How long a decided round stays on screen before the next one appears. */
export const DECISION_MS = 1000;

const INK = {
  bg: "#030806",
  panel: "#09150f",
  panelLine: "#2b4737",
  muted: "#8ea096",
  soft: "#b9c8c0",
  white: "#ffffff"
} as const;

/** Players sit in the lower third so the camera picture (your face) stays visible above them. */
const PLAYER_Y = 1230;
const PLAYER_R = 125;
const PLAYER_X: Record<Side, number> = { a: 280, b: 800 };

export interface BattleScene {
  phase: ScenePhase;
  battle: BattleTemplate;
  results: readonly BattleResult[];
  countdownValue: number;
  /** performance.now() when the current phase (or countdown number) began. */
  phaseStartedAt: number;
}

export interface BattleRenderer {
  draw(scene: BattleScene, now: number): void;
  dispose(): void;
}

/* ---------- helpers ---------- */

function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function teamOf(battle: BattleTemplate, side: Side) {
  return side === "a" ? battle.teamA : battle.teamB;
}

function entrantOf(round: BattleTemplate["rounds"][number], side: Side): Entrant {
  return side === "a" ? round.a : round.b;
}

interface Label {
  size: number;
  weight?: number;
  color?: string;
  maxWidth?: number;
  minSize?: number;
  dir?: CanvasDirection;
  align?: CanvasTextAlign;
}

/** Text positioned by its baseline, so the design coordinates stay readable. */
function label(ctx: CanvasRenderingContext2D, text: string, x: number, baselineY: number, o: Label) {
  drawText(ctx, text, x, baselineY - o.size * 0.35, o);
}

/* ---------- layers ---------- */

/** Compact title bar used by the countdown and final screens. */
function drawHeader(ctx: CanvasRenderingContext2D, battle: BattleTemplate) {
  roundRectPath(ctx, 48, 122, W - 96, 108, 28);
  ctx.fillStyle = "rgba(7,17,12,.82)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#294737";
  ctx.stroke();
  label(ctx, "TEAM BATTLE", W / 2, 186, { size: 48, weight: 900, dir: "ltr" });
  label(ctx, battle.title, W / 2, 221, { size: 22, weight: 700, color: "#b7c7be", maxWidth: W - 160, minSize: 16 });
}

function drawScorePanel(ctx: CanvasRenderingContext2D, scene: BattleScene, now: number) {
  const { battle, results } = scene;
  const score = getScore(results);
  const last = results[results.length - 1];

  roundRectPath(ctx, 60, 230, 960, 210, 40);
  ctx.fillStyle = "rgba(7,17,13,.82)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK.panelLine;
  ctx.stroke();

  label(ctx, "TEAM BATTLE", W / 2, 272, { size: 26, weight: 900, dir: "ltr", color: INK.soft });

  for (const side of ["a", "b"] as const) {
    const team = teamOf(battle, side);
    const x = side === "a" ? 290 : 790;
    label(ctx, `${team.name} ${team.title}`, x, 322, {
      size: 28,
      weight: 900,
      color: team.color,
      maxWidth: 400,
      minSize: 20
    });

    // The score of the team that just scored briefly pops.
    const bump = last && last.side === side ? Math.sin(clamp01((now - last.pickedAt) / 500) * Math.PI) : 0;
    const s = 1 + 0.35 * bump;
    ctx.save();
    ctx.translate(x, 400 - 84 * 0.35);
    ctx.scale(s, s);
    drawText(ctx, String(score[side]), 0, 0, { size: 84, weight: 900, dir: "ltr", color: INK.white });
    ctx.restore();
  }
  label(ctx, "—", W / 2, 395, { size: 44, weight: 700, color: "#7d9186" });
}

function drawRoundCaption(ctx: CanvasRenderingContext2D, scene: BattleScene, index: number) {
  const { battle, results } = scene;
  const total = battle.rounds.length;

  roundRectPath(ctx, 230, 466, 620, 70, 35);
  ctx.fillStyle = "rgba(7,17,13,.78)";
  ctx.fill();
  label(ctx, battle.rounds[index].label, W / 2 + 70, 515, { size: 36, weight: 900, maxWidth: 380, minSize: 24 });
  label(ctx, `${index + 1} / ${total}`, W / 2 - 200, 513, { size: 28, weight: 800, dir: "ltr", color: INK.muted });

  // One segment per round, coloured by the team that won it.
  const gap = 6;
  const segW = (760 - (total - 1) * gap) / total;
  for (let i = 0; i < total; i++) {
    const winner = results[i];
    ctx.fillStyle = winner ? teamOf(battle, winner.side).color : "rgba(255,255,255,.22)";
    roundRectPath(ctx, 160 + i * (segW + gap), 560, segW, 8, 4);
    ctx.fill();
  }
}

interface EntrantDraw {
  x: number;
  scale: number;
  alpha: number;
}

function drawEntrant(ctx: CanvasRenderingContext2D, images: ImageMap, who: Entrant, color: string, o: EntrantDraw) {
  const { x, scale } = o;
  const y = PLAYER_Y;
  const r = PLAYER_R * scale;

  ctx.save();
  ctx.globalAlpha = o.alpha;

  const glow = ctx.createRadialGradient(x, y, 20, x, y, r * 1.55);
  glow.addColorStop(0, withAlpha(color, 0.4));
  glow.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "#101b16";
  ctx.fill();
  ctx.lineWidth = 9 * scale;
  ctx.strokeStyle = color;
  ctx.stroke();

  const img = images.get(who.id);
  if (img) {
    const inner = r - 7 * scale;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, inner, 0, Math.PI * 2);
    ctx.clip();
    drawCover(ctx, img, img.naturalWidth, img.naturalHeight, x - inner, y - inner, inner * 2, inner * 2);
    ctx.restore();
  } else {
    label(ctx, getInitials(who.name), x, y + 18 * scale, { size: 54 * scale, weight: 900 });
  }

  const plaqueW = (r + 18 * scale) * 2;
  roundRectPath(ctx, x - plaqueW / 2, y + r + 22 * scale, plaqueW, 84 * scale, 24 * scale);
  ctx.fillStyle = "rgba(7,16,12,.88)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = withAlpha(color, 0.4);
  ctx.stroke();
  label(ctx, who.name, x, y + r + 58 * scale, {
    size: 28 * scale,
    weight: 900,
    maxWidth: plaqueW - 28,
    minSize: 18
  });
  label(ctx, who.roleLabel, x, y + r + 91 * scale, { size: 19 * scale, weight: 700, color: "#aebdb5" });
  ctx.restore();
}

function drawVs(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save();
  ctx.translate(W / 2, PLAYER_Y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.arc(0, 0, 54, 0, Math.PI * 2);
  ctx.fillStyle = "#09130f";
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#d8e0db";
  ctx.stroke();
  drawText(ctx, "VS", 0, 2, { size: 28, weight: 900, dir: "ltr" });
  ctx.restore();
}

/** Banner above the players: the prompt while waiting, the winner once a pick is made. */
function drawPrompt(ctx: CanvasRenderingContext2D) {
  roundRectPath(ctx, 200, 985, 680, 84, 42);
  ctx.fillStyle = "rgba(7,17,13,.8)";
  ctx.fill();
  label(ctx, "اضغط على اللاعب الأفضل", W / 2, 1039, { size: 32, weight: 800, maxWidth: 620, minSize: 22 });
}

function drawWinnerCard(ctx: CanvasRenderingContext2D, name: string, color: string, progress: number) {
  ctx.save();
  ctx.globalAlpha = progress;
  roundRectPath(ctx, 145, 965, 790, 120, 40);
  ctx.fillStyle = "rgba(7,17,13,.88)";
  ctx.fill();
  ctx.fillStyle = withAlpha(color, 0.16);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = color;
  ctx.stroke();
  label(ctx, "WINNER", W / 2, 1011, { size: 22, weight: 900, color, dir: "ltr" });
  label(ctx, name, W / 2, 1059, { size: 40, weight: 900, maxWidth: 720, minSize: 26 });
  ctx.restore();
}

function drawMatch(ctx: CanvasRenderingContext2D, images: ImageMap, scene: BattleScene, now: number) {
  const { battle, results } = scene;
  const total = battle.rounds.length;
  const decidedCount = results.length;
  const last = results[decidedCount - 1];

  // A decided round stays up for DECISION_MS, then the next one slides in.
  const showingDecision = last !== undefined && now - last.pickedAt < DECISION_MS;
  const index = showingDecision || decidedCount >= total ? decidedCount - 1 : decidedCount;
  const round = battle.rounds[Math.max(0, index)];
  const decision = index >= 0 && index < decidedCount ? results[index] : undefined;

  const roundStart = index <= 0 ? scene.phaseStartedAt : results[index - 1].pickedAt + DECISION_MS;
  const intro = decision || scene.phase !== "playing" ? 1 : clamp01((now - roundStart) / 350);
  const offset = (1 - easeOutCubic(intro)) * 180;
  const pick = decision ? clamp01((now - decision.pickedAt) / 900) : 0;

  drawScorePanel(ctx, scene, now);
  drawRoundCaption(ctx, scene, Math.max(0, index));

  for (const side of ["a", "b"] as const) {
    const isWinner = decision?.side === side;
    const isLoser = decision !== undefined && !isWinner;
    drawEntrant(ctx, images, entrantOf(round, side), teamOf(battle, side).color, {
      x: PLAYER_X[side] + (side === "a" ? -offset : offset),
      scale: isWinner ? 1 + 0.06 * easeOutBack(pick) : isLoser ? 0.96 : 1,
      alpha: (isLoser ? 1 - 0.58 * easeOutCubic(pick) : 1) * clamp01(intro * 1.5)
    });
  }
  drawVs(ctx, clamp01((intro - 0.1) / 0.25));

  if (decision) {
    const color = teamOf(battle, decision.side).color;
    drawWinnerCard(ctx, entrantOf(round, decision.side).name, color, clamp01((pick - 0.35) / 0.3));
  } else if (scene.phase === "playing") {
    drawPrompt(ctx);
  }
}

function drawCountdownScreen(ctx: CanvasRenderingContext2D, scene: BattleScene, now: number) {
  const { battle } = scene;
  ctx.fillStyle = "rgba(4,10,7,.55)";
  ctx.fillRect(0, 0, W, H);
  drawHeader(ctx, battle);

  const t = clamp01((now - scene.phaseStartedAt) / 350);
  const scale = 0.55 + 0.45 * easeOutBack(t);
  const color = scene.countdownValue === 1 ? battle.teamB.color : battle.teamA.color;

  label(ctx, "استعد للمواجهة", W / 2, 690, { size: 44, weight: 800, color: INK.soft });
  ctx.save();
  ctx.globalAlpha = clamp01(t * 2);
  ctx.translate(W / 2, 920 - 210 * 0.35);
  ctx.scale(scale, scale);
  drawText(ctx, String(scene.countdownValue), 0, 0, { size: 210, weight: 900, dir: "ltr", color });
  ctx.restore();
  label(ctx, "اختر الأفضل في كل مواجهة", W / 2, 1030, { size: 28, weight: 700, color: INK.muted });
}

/** Final screen: winner, final score, and the players that won a round for the winning team. */
function drawFinal(ctx: CanvasRenderingContext2D, images: ImageMap, scene: BattleScene, now: number) {
  const { battle, results } = scene;
  const t = now - scene.phaseStartedAt;
  const score = getScore(results);
  const winnerSide: Side | null = score.a > score.b ? "a" : score.b > score.a ? "b" : null;
  const accent = winnerSide ? teamOf(battle, winnerSide).color : INK.white;
  const fade = (delay: number, duration = 350) => clamp01((t - delay) / duration);
  const pop = (delay: number) => easeOutBack(clamp01((t - delay) / 450));

  ctx.fillStyle = `rgba(4,10,7,${0.84 * fade(0, 300)})`;
  ctx.fillRect(0, 0, W, H);
  drawHeader(ctx, battle);

  ctx.save();
  ctx.globalAlpha = fade(0);
  ctx.translate(W / 2, 400 - 100 * 0.35);
  ctx.scale(0.6 + 0.4 * pop(0), 0.6 + 0.4 * pop(0));
  drawText(ctx, "🏆", 0, 0, { size: 100, weight: 900 });
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = fade(150);
  label(ctx, "النتيجة النهائية", W / 2, 500, { size: 34, weight: 900, color: INK.soft });
  label(ctx, winnerSide ? teamOf(battle, winnerSide).name : "تعادل", W / 2, 600, {
    size: 66,
    weight: 900,
    color: accent,
    maxWidth: W - 160,
    minSize: 40
  });
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = fade(350);
  roundRectPath(ctx, 175, 670, 730, 150, 38);
  ctx.fillStyle = "#08130e";
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = accent;
  ctx.stroke();
  label(ctx, String(score.a), 370, 770, { size: 84, weight: 900, dir: "ltr", color: battle.teamA.color });
  label(ctx, "—", W / 2, 760, { size: 50, weight: 800, color: "#718279" });
  label(ctx, String(score.b), 710, 770, { size: 84, weight: 900, dir: "ltr", color: battle.teamB.color });
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = fade(600, 500);
  label(ctx, battle.hook, W / 2, 890, { size: 46, weight: 800, color: "#f5b23c", maxWidth: W - 120, minSize: 30 });
  ctx.restore();

  if (winnerSide) {
    const team = teamOf(battle, winnerSide);
    const wins = battle.rounds
      .filter((_, i) => results[i]?.side === winnerSide)
      .map((round) => entrantOf(round, winnerSide));

    ctx.save();
    ctx.globalAlpha = fade(800);
    label(ctx, `اختياراتك لفريق ${team.name}`, W / 2, 960, { size: 26, weight: 700, color: INK.muted, maxWidth: W - 160 });
    ctx.restore();

    const chipH = 70;
    const chipGap = 8;
    const chipW = (W - 120 - 16) / 2;
    wins.forEach((who, k) => {
      const col = k % 2;
      const x = col === 0 ? W - 60 - chipW : 60;
      const y = 990 + Math.floor(k / 2) * (chipH + chipGap);
      const enter = clamp01((t - 1000 - k * 90) / 350);
      const r = chipH * 0.4;
      const cx = x + chipW - 12 - r;
      const cy = y + chipH / 2;

      ctx.save();
      ctx.globalAlpha = enter;
      ctx.translate((1 - easeOutCubic(enter)) * 60, 0);
      roundRectPath(ctx, x, y, chipW, chipH, chipH * 0.3);
      ctx.fillStyle = withAlpha(team.color, 0.18);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = team.color;
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#101b16";
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      const img = images.get(who.id);
      if (img) drawCover(ctx, img, img.naturalWidth, img.naturalHeight, cx - r, cy - r, r * 2, r * 2);
      else label(ctx, getInitials(who.name), cx, cy + 10, { size: r * 0.8, weight: 900 });
      ctx.restore();

      label(ctx, who.name, cx - r - 14, cy + 10, {
        size: 28,
        weight: 800,
        align: "right",
        maxWidth: chipW - 24 - r * 2 - 14 - 12,
        minSize: 18
      });
      ctx.restore();
    });
  }

  ctx.save();
  ctx.globalAlpha = fade(1200, 500);
  label(ctx, "تابع الصفحة للمزيد من المقارنات", W / 2, 1560, { size: 24, weight: 700, color: "#7d9186" });
  ctx.restore();
}

/* ---------- renderer ---------- */

/** Camera picture as the background, with the Team Battle graphics drawn over it. */
export function createBattleRenderer(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  battle: BattleTemplate
): BattleRenderer {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D is not available");

  const images: ImageMap = new Map();
  let disposed = false;
  loadPlayerImages(
    battle.rounds.flatMap((round) => [round.a, round.b]),
    images,
    () => disposed
  );

  return {
    draw(scene, now) {
      ctx.textBaseline = "middle";
      drawCameraLayer(ctx, video);

      if (scene.phase === "final") drawFinal(ctx, images, scene, now);
      else if (scene.phase === "countdown") drawCountdownScreen(ctx, scene, now);
      else drawMatch(ctx, images, scene, now);

      drawWatermark(ctx);
    },
    dispose() {
      disposed = true;
    }
  };
}
