import { useState } from "react";
import { getInitials, type Player } from "../data/players";

interface AvatarProps {
  player: Player;
  className: string;
}

/** Round player photo; falls back to initials when the image file is missing. */
export function Avatar({ player, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  return (
    <span className={`avatar ${className}`}>
      {failed ? (
        <span className="avatar__initials">{getInitials(player.name)}</span>
      ) : (
        <img src={player.image} alt="" draggable={false} onError={() => setFailed(true)} />
      )}
    </span>
  );
}
