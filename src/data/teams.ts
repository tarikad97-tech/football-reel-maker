/**
 * Team Battle data: RS Berkane (champion 2025) vs MAS Fès (champion 2026).
 *
 * Lineups, positions and image file names come from the project owner's v3 design
 * and are used as-is. Not independently verified (confirmed from sources only: Fès 2–0
 * Dcheira, scorers Tahiri and Chabani, Franco as Fès coach). Re-check Berkane's coach,
 * Benjdida's status and the Fès defenders' positions before publishing a video.
 */

import type { Player } from "./players";

/** A player or coach that can face an opponent in a round. */
export interface Entrant extends Player {
  /** Short position label shown under the name, e.g. "قلب دفاع". */
  roleLabel: string;
}

export interface BattleTeam {
  id: string;
  name: string;
  /** Year shown in the score bar and final screen. */
  title: string;
  color: string;
  coach: Entrant;
  players: readonly Entrant[];
}

const IMAGE_DIR = "/players";

/** Photos live in public/players as "<team>-<slug>.jpg". */
function entrant(team: string, id: string, name: string, roleLabel: string, slug: string): Entrant {
  return { id, name, roleLabel, image: `${IMAGE_DIR}/${team}-${slug}.jpg` };
}

export const berkane2025: BattleTeam = {
  id: "berkane-2025",
  name: "نهضة بركان",
  title: "2025",
  color: "#f28c28",
  coach: entrant("berkane", "chaabani", "معين الشعباني", "المدرب", "mouine-chaabani"),
  players: [
    entrant("berkane", "hamiani", "حمزة حمياني", "حارس مرمى", "hamza-himyani"),
    entrant("berkane", "dayo", "إيسوفو دايو", "قلب دفاع", "issoufou-dayo"),
    entrant("berkane", "tahif", "عادل تاحيف", "قلب دفاع", "adel-tahif"),
    entrant("berkane", "mousaoui", "حمزة الموساوي", "ظهير", "hamza-el-moussaoui"),
    entrant("berkane", "assal", "عبد الحق عسال", "ظهير", "abdelhak-assal"),
    entrant("berkane", "camara", "مامادو كامارا", "وسط دفاعي", "mamadou-camara"),
    entrant("berkane", "lbahiri", "ياسين لبحيري", "وسط", "yassine-labhyiri"),
    entrant("berkane", "khiri", "أيوب خيري", "وسط متقدم", "ayoub-khairi"),
    entrant("berkane", "mehri", "يوسف مهري", "جناح", "youssef-mehri"),
    entrant("berkane", "chouiar", "منير شويعر", "جناح", "munir-chouiar"),
    entrant("berkane", "lamlioui", "أسامة لمليوي", "مهاجم", "oussama-lamlioui")
  ]
};

export const fes2026: BattleTeam = {
  id: "fes-2026",
  name: "المغرب الفاسي",
  title: "2026",
  color: "#f0c419",
  coach: entrant("fassi", "franco", "بابلو فرانكو", "المدرب", "pablo-franco"),
  players: [
    entrant("fassi", "chihab", "صلاح الدين شهاب", "حارس مرمى", "salah-eddine-chihab"),
    entrant("fassi", "chabani", "أيمن شباني", "مدافع", "aymane-chbani"),
    entrant("fassi", "ouhrou", "مروان أوهرو", "مدافع", "marouane-ouhrou"),
    entrant("fassi", "rahili", "عادل الرحيلي", "مدافع", "adel-erraihli"),
    entrant("fassi", "ait-allal", "حمزة آيت علال", "مدافع", "hamza-ait-allal"),
    entrant("fassi", "tahiri", "أنس طاهري", "وسط", "anas-tahiri"),
    entrant("fassi", "hermach", "أشرف هرماش", "وسط", "achraf-hermach"),
    entrant("fassi", "mahnaoui", "رضا مهناوي", "وسط", "reda-mehnaoui"),
    entrant("fassi", "baba", "خالد بابا", "مهاجم/جناح", "khalid-baba"),
    entrant("fassi", "alouch", "سليمان علوش", "مهاجم/جناح", "soufiane-allouch"),
    entrant("fassi", "benjdida", "سفيان بنجديدة", "مهاجم", "soufiane-benjdida")
  ]
};
