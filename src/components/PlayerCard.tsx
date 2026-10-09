import type { Player } from "../data/players";
import { Avatar } from "./Avatar";

interface PlayerCardProps {
  player: Player;
  onSelect: (playerId: string) => void;
}

export function PlayerCard({ player, onSelect }: PlayerCardProps) {
  return (
    <button type="button" className="player-card" onClick={() => onSelect(player.id)}>
      <Avatar player={player} className="player-card__avatar" />
      <span className="player-card__name">{player.name}</span>
    </button>
  );
}
