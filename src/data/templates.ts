import type { Player } from "./players";

export interface Template {
  id: string;
  question: string;
  /** Number of ranking slots the user fills. */
  slots: number;
  /** Arabic ordinals used in the "choose rank …" prompt, one per slot. */
  rankLabels: readonly string[];
}

export interface RankedPick {
  player: Player;
  rank: number;
  /** performance.now() timestamp, used to time animations. */
  pickedAt: number;
}

export const RANK_5: Template = {
  id: "rank-5",
  question: "🔥 رتب أفضل 5 لاعبين مغاربة في رأيك",
  slots: 5,
  rankLabels: ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة"]
};
