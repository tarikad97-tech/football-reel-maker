import { berkane2025, fes2026, type BattleTeam, type Entrant } from "./teams";

/** "a" is the team in the right-hand column (RTL start), "b" the left-hand one. */
export type Side = "a" | "b";

export interface BattleRound {
  /** Round title, e.g. "الدفاع". */
  label: string;
  a: Entrant;
  b: Entrant;
}

export interface BattleResult {
  side: Side;
  /** performance.now() timestamp, used to time animations. */
  pickedAt: number;
}

export interface BattleTemplate {
  id: "team-battle";
  title: string;
  hook: string;
  teamA: BattleTeam;
  teamB: BattleTeam;
  rounds: readonly BattleRound[];
}

function member(team: BattleTeam, id: string): Entrant {
  const found = team.players.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown player "${id}" in ${team.id}`);
  return found;
}

export const BERKANE_VS_FES: BattleTemplate = {
  id: "team-battle",
  title: "⚔️ بطل المغرب 2025 ضد بطل المغرب 2026",
  hook: "واش كتوافقني فكل الاختيارات؟ 👀",
  teamA: berkane2025,
  teamB: fes2026,
  rounds: [
    { label: "حراسة المرمى", a: member(berkane2025, "hamiani"), b: member(fes2026, "chihab") },
    { label: "الدفاع", a: member(berkane2025, "dayo"), b: member(fes2026, "chabani") },
    { label: "الدفاع", a: member(berkane2025, "tahif"), b: member(fes2026, "rahili") },
    { label: "الدفاع", a: member(berkane2025, "mousaoui"), b: member(fes2026, "ouhrou") },
    { label: "الدفاع", a: member(berkane2025, "assal"), b: member(fes2026, "ait-allal") },
    { label: "خط الوسط", a: member(berkane2025, "camara"), b: member(fes2026, "tahiri") },
    { label: "خط الوسط", a: member(berkane2025, "lbahiri"), b: member(fes2026, "hermach") },
    { label: "خط الوسط", a: member(berkane2025, "khiri"), b: member(fes2026, "mahnaoui") },
    { label: "الهجوم", a: member(berkane2025, "mehri"), b: member(fes2026, "baba") },
    { label: "الهجوم", a: member(berkane2025, "chouiar"), b: member(fes2026, "alouch") },
    { label: "الهجوم", a: member(berkane2025, "lamlioui"), b: member(fes2026, "benjdida") },
    { label: "المدربون", a: berkane2025.coach, b: fes2026.coach }
  ]
};

export function getScore(results: readonly BattleResult[]): Record<Side, number> {
  return {
    a: results.filter((r) => r.side === "a").length,
    b: results.filter((r) => r.side === "b").length
  };
}
