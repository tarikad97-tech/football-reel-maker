import { useCallback, useMemo, useState } from "react";
import { getScore, type BattleResult, type BattleTemplate, type Side } from "../data/battles";

export function useBattle(battle: BattleTemplate) {
  const total = battle.rounds.length;
  const [results, setResults] = useState<readonly BattleResult[]>([]);

  const roundIndex = results.length;
  const isComplete = roundIndex >= total;
  const currentRound = isComplete ? null : battle.rounds[roundIndex];
  const score = useMemo(() => getScore(results), [results]);

  const choose = useCallback(
    (side: Side) => {
      setResults((previous) =>
        previous.length >= total ? previous : [...previous, { side, pickedAt: performance.now() }]
      );
    },
    [total]
  );

  const reset = useCallback(() => setResults([]), []);

  return { results, roundIndex, currentRound, score, isComplete, choose, reset };
}
