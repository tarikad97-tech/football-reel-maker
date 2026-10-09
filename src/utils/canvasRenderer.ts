import { getInitials, type Player } from "../data/players";
import type { RankedPick } from "../data/templates";

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1920;
/** How long the "player picked" moment stays on screen. */
export const PICK_MOMENT_MS = 1100;

const W = CANVAS_WIDTH;
const H = CANVAS_HEIGHT;

/** Keep text clear of phone UI (status bar, app chrome, home indicator). */
export const SAFE_TOP = 230;
export const SAFE_SIDE = 60;

const FONT_FAMILY = '"Segoe UI", "Noto Sans Arabic", Tahoma, Arial, sans-serif';

export const COLORS = {
  pitch: "#07110d",
  pine: "#0f3d27",
  grass: "#1b8f55",
  chalk: "#f4f7f2",
  muted: "rgba(244,247,242,.5)",
  gold: "#f6c744",
  silver: "#cfd8d3",
  bronze: "#cd8b4a"
} as const;

const RANK_COLORS = [COLORS.gold, COLORS.silver, COLORS.bronze, COLORS.chalk, COLORS.chalk];

function rankColor(rank: number): string {
  return RANK_COLORS[rank - 1] ?? COLORS.chalk;
}

export type ScenePhase = "idle" | "countdown" | "playing" | "final";

export interface Scene {
  phase: ScenePhase;
  question: string;
  totalRanks: number;
  rankLabels: readonly string[];
  picks: readonly RankedPick[];
  /** Number shown while phase is "countdown". */
  countdownValue: number;
  /** performance.now() when the current phase (or countdown number) began. */
  phaseStartedAt: number;
}

export type ImageMap = Map<string, HTMLImageElement>;

export interface CanvasRenderer {
  draw(scene: Scene, now: number): void;
  dispose(): void;
}

/* ---------- small helpers ---------- */

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Own implementation: ctx.roundRect is missing on older Safari versions. */
export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function setFont(ctx: CanvasRenderingContext2D, weight: number, size: number) {
  ctx.font = `${weight} ${Math.round(size)}px ${FONT_FAMILY}`;
}

interface TextOptions {
  weight?: number;
  size: number;
  color?: string;
  align?: CanvasTextAlign;
  /** Use "ltr" for Latin text and numbers so they are not reordered. */
  dir?: CanvasDirection;
  /** Shrinks the font (down to minSize) until the text fits. */
  maxWidth?: number;
  minSize?: number;
}

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, o: TextOptions) {
  const weight = o.weight ?? 700;
  let size = o.size;
  setFont(ctx, weight, size);
  if (o.maxWidth !== undefined) {
    const min = o.minSize ?? size * 0.6;
    while (size > min && ctx.measureText(text).width > o.maxWidth) {
      size -= 2;
      setFont(ctx, weight, size);
    }
  }
  ctx.fillStyle = o.color ?? COLORS.chalk;
  ctx.textAlign = o.align ?? "center";
  ctx.direction = o.dir ?? "rtl";
  ctx.fillText(text, x, y);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws `src` so it fills the destination box, cropping the overflow (object-fit: cover). */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const srcRatio = sw / sh;
  const dstRatio = dw / dh;
  let cw = sw;
  let ch = sh;
  let cx = 0;
  let cy = 0;
  if (srcRatio > dstRatio) {
    cw = sh * dstRatio;
    cx = (sw - cw) / 2;
  } else {
    ch = sw / dstRatio;
    cy = (sh - ch) / 2;
  }
  ctx.drawImage(src, cx, cy, cw, ch, dx, dy, dw, dh);
}

/* ---------- building blocks ---------- */

export function drawAvatar(
  ctx: CanvasRenderingContext2D,
  player: Player,
  images: ImageMap,
  cx: number,
  cy: number,
  r: number,
  ringColor: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  const img = images.get(player.id);
  if (img) {
    ctx.fillStyle = COLORS.pine;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    drawCover(ctx, img, img.naturalWidth, img.naturalHeight, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = COLORS.pine;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    drawText(ctx, getInitials(player.name), cx, cy + r * 0.05, { size: r * 0.8, weight: 800 });
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(3, r * 0.06);
  ctx.strokeStyle = ringColor;
  ctx.stroke();
}

function drawRankBadge(ctx: CanvasRenderingContext2D, rank: number, cx: number, cy: number, r: number, filled: boolean) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  if (filled) {
    ctx.fillStyle = rankColor(rank);
    ctx.fill();
  } else {
    ctx.lineWidth = 4;
    ctx.strokeStyle = COLORS.muted;
    ctx.stroke();
  }
  drawText(ctx, String(rank), cx, cy + r * 0.04, {
    size: r * 1.05,
    weight: 800,
    dir: "ltr",
    color: filled ? COLORS.pitch : COLORS.muted
  });
}

interface RowOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  rank: number;
  pick: RankedPick | undefined;
  /** 0..1 entrance progress (slide + fade). */
  enter: number;
  highlight?: boolean;
}

/** One ranking row: [badge][avatar] name — laid out right-to-left. */
function drawRow(ctx: CanvasRenderingContext2D, images: ImageMap, o: RowOptions) {
  const { h, pick } = o;
  const eased = easeOutCubic(o.enter);
  const x = o.x + (1 - eased) * (o.w * 0.35);

  ctx.save();
  ctx.globalAlpha = clamp01(o.enter * 1.4);

  roundRectPath(ctx, x, o.y, o.w, h, h * 0.3);
  ctx.fillStyle = pick ? "rgba(7,28,18,.88)" : "rgba(0,0,0,.34)";
  ctx.fill();
  ctx.lineWidth = o.highlight ? 5 : 3;
  ctx.strokeStyle = pick ? rankColor(o.rank) : "rgba(255,255,255,.16)";
  ctx.stroke();

  const pad = h * 0.16;
  const badgeR = h * 0.3;
  const avatarR = h * 0.36;
  const cy = o.y + h / 2;
  const badgeCx = x + o.w - pad - badgeR;
  drawRankBadge(ctx, o.rank, badgeCx, cy, badgeR, Boolean(pick));

  if (pick) {
    const avatarCx = badgeCx - badgeR - h * 0.12 - avatarR;
    drawAvatar(ctx, pick.player, images, avatarCx, cy, avatarR, rankColor(o.rank));
    const nameRight = avatarCx - avatarR - h * 0.16;
    drawText(ctx, pick.player.name, nameRight, cy + 2, {
      size: h * 0.42,
      weight: 800,
      align: "right",
      maxWidth: nameRight - (x + pad),
      minSize: h * 0.26
    });
  }
  ctx.restore();
}

/* ---------- scene layers ---------- */

function drawQuestionPanel(ctx: CanvasRenderingContext2D, lines: string[]): number {
  const lineH = 84;
  const padY = 40;
  const x = SAFE_SIDE;
  const w = W - SAFE_SIDE * 2;
  const h = padY * 2 + lines.length * lineH;

  roundRectPath(ctx, x, SAFE_TOP, w, h, 44);
  ctx.fillStyle = "rgba(7,17,13,.76)";
  ctx.fill();

  ctx.save();
  roundRectPath(ctx, x, SAFE_TOP, w, h, 44);
  ctx.clip();
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(x + w - 14, SAFE_TOP, 14, h);
  ctx.restore();

  lines.forEach((line, i) => {
    drawText(ctx, line, W / 2 - 7, SAFE_TOP + padY + lineH * (i + 0.5), { size: 62, weight: 800 });
  });
  return SAFE_TOP + h;
}

export function drawCountdown(
  ctx: CanvasRenderingContext2D,
  scene: Pick<Scene, "countdownValue" | "phaseStartedAt">,
  now: number
) {
  ctx.fillStyle = "rgba(4,10,7,.5)";
  ctx.fillRect(0, 0, W, H);

  const t = (now - scene.phaseStartedAt) / 1000;
  const scale = 1.35 - 0.35 * easeOutCubic(clamp01(t / 0.35));
  const alpha = 1 - clamp01((t - 0.7) / 0.3);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(W / 2, H / 2);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.arc(0, 0, 250, 0, Math.PI * 2);
  ctx.lineWidth = 14;
  ctx.strokeStyle = COLORS.gold;
  ctx.stroke();
  drawText(ctx, String(scene.countdownValue), 0, 14, { size: 360, weight: 900, dir: "ltr" });
  ctx.restore();
}

function drawPrompt(ctx: CanvasRenderingContext2D, scene: Scene, now: number) {
  const rank = scene.picks.length + 1;
  if (rank > scene.totalRanks) return;

  const last = scene.picks[scene.picks.length - 1];
  const since = now - (last ? last.pickedAt : scene.phaseStartedAt);
  const scale = 0.9 + 0.1 * easeOutBack(clamp01(since / 400));

  const w = 780;
  const h = 130;
  const cy = 1330;
  ctx.save();
  ctx.translate(W / 2, cy);
  ctx.scale(scale, scale);
  roundRectPath(ctx, -w / 2, -h / 2, w, h, h / 2);
  ctx.fillStyle = "rgba(7,17,13,.82)";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = rankColor(rank);
  ctx.stroke();

  const badgeR = 46;
  const badgeCx = w / 2 - 20 - badgeR;
  drawRankBadge(ctx, rank, badgeCx, 0, badgeR, true);
  drawText(ctx, `اختر المرتبة ${scene.rankLabels[rank - 1]}`, badgeCx - badgeR - 24, 4, {
    size: 54,
    weight: 800,
    align: "right",
    maxWidth: w - 40 - badgeR * 2 - 24 - 40,
    minSize: 36
  });
  ctx.restore();
}

/** The big "#1 / name" moment right after a tap. */
function drawPickMoment(ctx: CanvasRenderingContext2D, images: ImageMap, scene: Scene, now: number) {
  const pick = scene.picks[scene.picks.length - 1];
  if (!pick) return;
  const t = now - pick.pickedAt;
  if (t < 0 || t > PICK_MOMENT_MS) return;

  const fadeIn = clamp01(t / 150);
  const fadeOut = clamp01((PICK_MOMENT_MS - t) / 250);
  const alpha = Math.min(fadeIn, fadeOut);
  const scale = 0.7 + 0.3 * easeOutBack(clamp01(t / 380));

  ctx.save();
  ctx.fillStyle = `rgba(4,10,7,${0.55 * alpha})`;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = alpha;
  const cx = W / 2;
  const cy = 900;
  const r = 200;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  drawAvatar(ctx, pick.player, images, cx, cy, r, rankColor(pick.rank));

  const pillW = 260;
  const pillH = 120;
  const pillY = cy + r + 20;
  roundRectPath(ctx, cx - pillW / 2, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = rankColor(pick.rank);
  ctx.fill();
  drawText(ctx, `#${pick.rank}`, cx, pillY + pillH / 2 + 4, {
    size: 84,
    weight: 900,
    dir: "ltr",
    color: COLORS.pitch
  });

  drawText(ctx, pick.player.name, cx, pillY + pillH + 100, {
    size: 84,
    weight: 800,
    maxWidth: W - SAFE_SIDE * 2,
    minSize: 48
  });
  ctx.restore();
}

function drawFinal(ctx: CanvasRenderingContext2D, images: ImageMap, scene: Scene, now: number) {
  const t = now - scene.phaseStartedAt;
  ctx.fillStyle = `rgba(4,10,7,${0.8 * clamp01(t / 300)})`;
  ctx.fillRect(0, 0, W, H);

  const titleIn = easeOutBack(clamp01(t / 450));
  ctx.save();
  ctx.globalAlpha = clamp01(t / 250);
  ctx.translate(W / 2, 330);
  ctx.scale(0.8 + 0.2 * titleIn, 0.8 + 0.2 * titleIn);
  drawText(ctx, "🔥 FINAL RANKING", 0, 0, { size: 90, weight: 900, dir: "ltr" });
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(-90, 74, 180, 8);
  ctx.restore();

  const rowH = 190;
  const gap = 22;
  const x = SAFE_SIDE;
  const w = W - SAFE_SIDE * 2;
  const top = 470;

  for (let i = 0; i < scene.totalRanks; i++) {
    const delay = 250 + i * 160;
    drawRow(ctx, images, {
      x,
      y: top + i * (rowH + gap),
      w,
      h: rowH,
      rank: i + 1,
      pick: scene.picks.find((p) => p.rank === i + 1),
      enter: clamp01((t - delay) / 450),
      highlight: i === 0
    });
  }
}

export function drawWatermark(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.globalAlpha = 0.6;
  drawText(ctx, "FOOTBALL REEL", W / 2, H - 110, { size: 34, weight: 700, dir: "ltr" });
  ctx.restore();
}

/* ---------- renderer ---------- */

/** Camera frame (mirrored like a selfie camera) plus light scrims for text legibility. */
export function drawCameraLayer(ctx: CanvasRenderingContext2D, video: HTMLVideoElement) {
  ctx.fillStyle = COLORS.pitch;
  ctx.fillRect(0, 0, W, H);
  if (video.readyState >= 2 && video.videoWidth > 0) {
    ctx.save();
    // Mirrored, so the recording matches what the user sees.
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    drawCover(ctx, video, video.videoWidth, video.videoHeight, 0, 0, W, H);
    ctx.restore();
  }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(0,0,0,.4)");
  g.addColorStop(0.3, "rgba(0,0,0,0)");
  g.addColorStop(0.7, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}


export function loadPlayerImages(players: readonly Player[], images: ImageMap, isDisposed: () => boolean) {
  for (const player of players) {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (!isDisposed() && img.naturalWidth > 0) images.set(player.id, img);
    };
    // Missing files simply keep the initials placeholder.
    img.src = player.image;
  }
}

export function createCanvasRenderer(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  players: readonly Player[]
): CanvasRenderer {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D is not available");

  const images: ImageMap = new Map();
  let disposed = false;
  loadPlayerImages(players, images, () => disposed);

  let wrappedFor = "";
  let wrappedLines: string[] = [];

  const drawCamera = () => drawCameraLayer(ctx, video);

  function drawBoard(scene: Scene, now: number) {
    if (wrappedFor !== scene.question) {
      setFont(ctx!, 800, 62);
      wrappedLines = wrapText(ctx!, scene.question, W - SAFE_SIDE * 2 - 120);
      wrappedFor = scene.question;
    }
    const panelBottom = drawQuestionPanel(ctx!, wrappedLines);

    const rowH = 112;
    const gap = 14;
    const rowW = 620;
    const x = W - SAFE_SIDE - rowW;
    for (let i = 0; i < scene.totalRanks; i++) {
      const pick = scene.picks.find((p) => p.rank === i + 1);
      drawRow(ctx!, images, {
        x,
        y: panelBottom + 36 + i * (rowH + gap),
        w: rowW,
        h: rowH,
        rank: i + 1,
        pick,
        enter: pick ? clamp01((now - pick.pickedAt) / 350) : 1
      });
    }
  }

  return {
    draw(scene, now) {
      ctx.textBaseline = "middle";
      drawCamera();

      if (scene.phase === "final") {
        drawFinal(ctx, images, scene, now);
      } else {
        drawBoard(scene, now);
        if (scene.phase === "playing") {
          drawPrompt(ctx, scene, now);
          drawPickMoment(ctx, images, scene, now);
        }
        if (scene.phase === "countdown") drawCountdown(ctx, scene, now);
      }
      drawWatermark(ctx);
    },
    dispose() {
      disposed = true;
    }
  };
}
