import { formatElapsed } from "../lib/format";

interface ListeningStageProps {
  level: number;
  elapsedSeconds: number;
  onStop: () => void;
  stopping: boolean;
  error: string | null;
}

const BARS = [0.35, 0.7, 1, 0.55, 0.9, 0.4, 0.8, 0.6, 1, 0.45, 0.75, 0.5];

export function ListeningStage({ level, elapsedSeconds, onStop, stopping, error }: ListeningStageProps) {
  const voice = stopping ? 0.12 : Math.max(0.08, level);

  return (
    <div className="listen-stage" style={{ ["--voice" as string]: voice }}>
      <p className="listen-kicker">{stopping ? "Writing the record" : "In the room"}</p>
      <h1 className="listen-title">{stopping ? "Keep the room still." : "Hearly is listening."}</h1>

      <div className="listen-orb" aria-hidden="true">
        <span className="listen-ring listen-ring-a" />
        <span className="listen-ring listen-ring-b" />
        <span className="listen-ring listen-ring-c" />
        <span className="listen-core">
          <span className="listen-wave">
            {BARS.map((amp, i) => (
              <span
                key={i}
                className="listen-bar"
                style={{ ["--amp" as string]: amp, animationDelay: `${i * 70}ms` }}
              />
            ))}
          </span>
        </span>
      </div>

      <div className="listen-clock" aria-live="polite">
        {formatElapsed(elapsedSeconds)}
      </div>
      <p className="listen-hint">
        {stopping
          ? "Turning speech into a labelled conversation."
          : "Speak naturally. Names and the transcript appear when you stop."}
      </p>

      {error && <div className="listen-error">{error}</div>}

      <button className="btn btn-danger btn-lg listen-stop" onClick={onStop} disabled={stopping}>
        {stopping && <span className="spinner" />}
        {stopping ? "Finishing" : "Stop listening"}
      </button>
    </div>
  );
}
