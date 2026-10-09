interface RecordButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function RecordButton({ onClick, disabled }: RecordButtonProps) {
  return (
    <button type="button" className="record-button" onClick={onClick} disabled={disabled}>
      <span className="record-button__dot" aria-hidden="true" />
      <span>ابدأ التسجيل</span>
    </button>
  );
}
