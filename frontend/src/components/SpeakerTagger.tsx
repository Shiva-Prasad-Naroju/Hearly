import { useSessionStore, displayNameFor } from "../store/sessionStore";

export function SpeakerTagger() {
  const speakerLabels = useSessionStore((s) => s.speakerLabels);
  const activeSpeaker = useSessionStore((s) => s.activeSpeaker);
  const setActiveSpeaker = useSessionStore((s) => s.setActiveSpeaker);
  const addSpeaker = useSessionStore((s) => s.addSpeaker);
  const participants = useSessionStore((s) => s.participants);

  return (
    <div className="speaker-bar">
      <div className="speaker-bar-head">
        <p className="section-title">Who is speaking</p>
        <span className="t-meta">Tap before they talk</span>
      </div>
      <div className="speaker-tagger">
        {speakerLabels.map((label) => (
          <button
            key={label}
            type="button"
            className={`speaker-chip${activeSpeaker === label ? " active" : ""}`}
            onClick={() => setActiveSpeaker(label)}
            aria-pressed={activeSpeaker === label}
          >
            {displayNameFor({ participants }, label)}
          </button>
        ))}
        <button type="button" className="speaker-chip" onClick={addSpeaker}>
          Add speaker
        </button>
      </div>
    </div>
  );
}
