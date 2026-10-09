interface TopBarProps {
  isRecording: boolean;
}

/** Brand and REC indicator. UI only, never part of the recorded video. */
export function TopBar({ isRecording }: TopBarProps) {
  return (
    <header className="topbar">
      <strong className="topbar__brand" dir="ltr">FOOTBALL REEL</strong>
      <span className={isRecording ? "rec is-live" : "rec"} dir="ltr">
        {isRecording ? "● REC" : "READY"}
      </span>
    </header>
  );
}
