interface ConsentModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ConsentModal({ onConfirm, onCancel, busy }: ConsentModalProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className="modal-panel">
        <p className="modal-kicker">Room consent</p>
        <h2 className="modal-title" id="consent-title">
          Everyone here should know
        </h2>
        <p className="modal-body">
          This conversation will be transcribed in real time. Audio is not kept — only the
          transcript and what Hearly extracts from it are stored, for 30 days by default.
          Nothing is emailed unless you approve a draft.
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={busy}>
            {busy ? <span className="spinner" /> : null}
            Start listening
          </button>
        </div>
      </div>
    </div>
  );
}
