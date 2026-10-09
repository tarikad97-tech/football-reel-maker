import { useCallback, useMemo, useState } from "react";
import type { Player } from "../data/players";
import type { RankedPick } from "../data/templates";

export function useRanking(players: readonly Player[], totalRanks: number) {
  const [picks, setPicks] = useState<readonly RankedPick[]>([]);

  const availablePlayers = useMemo(
    () => players.filter((player) => !picks.some((pick) => pick.player.id === player.id)),
    [players, picks]
  );

  const isComplete = picks.length >= totalRanks;
  const currentRank = Math.min(picks.length + 1, totalRanks);

  const select = useCallback(
    (playerId: string) => {
      setPicks((previous) => {
        if (previous.length >= totalRanks) return previous;
        if (previous.some((pick) => pick.player.id === playerId)) return previous;
        const player = players.find((p) => p.id === playerId);
        if (!player) return previous;
        return [...previous, { player, rank: previous.length + 1, pickedAt: performance.now() }];
      });
    },
    [players, totalRanks]
  );

  const reset = useCallback(() => setPicks([]), []);

  return { picks, availablePlayers, currentRank, isComplete, select, reset };
}
