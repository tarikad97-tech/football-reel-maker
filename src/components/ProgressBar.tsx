interface ProgressBarProps {
  total: number;
  filled: number;
}

export function ProgressBar({ total, filled }: ProgressBarProps) {
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={filled}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < filled ? "progress__step is-filled" : "progress__step"} />
      ))}
    </div>
  );
}
