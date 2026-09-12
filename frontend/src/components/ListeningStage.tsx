import { useEffect, useRef } from "react";
import { formatElapsed } from "../lib/format";

interface ListeningStageProps {
  level: number;
  elapsedSeconds: number;
  onStop: () => void;
  stopping: boolean;
  error: string | null;
  liveLines: string[];
  liveInterim: string;
  captionSupported: boolean;
}

const BARS = [0.35, 0.7, 1, 0.55, 0.9, 0.4, 0.8, 0.6, 1, 0.45, 0.75, 0.5];

export function ListeningStage({
  level,
  elapsedSeconds,
  onStop,
  stopping,
  error,
  liveLines,
  liveInterim,
  captionSupported,
}: ListeningStageProps) {
  const voice = stopping ? 0.12 : Math.max(0.08, level);
  const streamRef = useRef<HTMLDivElement>(null);
  const hasWords = liveLines.length > 0 || Boolean(liveInterim);

  useEffect(() => {
    const node = streamRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [liveLines, liveInterim]);

  return (
    <div className="listen-stage" style={{ ["--voice" as string]: voice }}>
      <div className="listen-top">
        <p className="listen-kicker">{stopping ? "Writing the record" : "In the room"}</p>
        <h1 className="listen-title">{stopping ? "Keep the room still." : "Hearly is listening."}</h1>
        <div className="listen-meter">
          <div className="listen-orb" aria-hidden="true">
            <span className="listen-ring listen-ring-a" />
            <span className="listen-ring listen-ring-b" />
            <span className="listen-core">
              <span className="listen-wave">
                {BARS.slice(0, 7).map((amp, i) => (
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
        </div>
      </div>

      <div className="listen-stream" ref={streamRef} aria-live="polite" aria-atomic="false">
        {hasWords ? (
          <>
            {liveLines.map((line, i) => (
              <p className="listen-final" key={`${i}-${line.slice(0, 24)}`}>
                {line}
              </p>
            ))}
            {liveInterim && (
              <p className="listen-interim">
                {liveInterim}
                <span className="listen-caret" aria-hidden="true" />
              </p>
            )}
          </>
        ) : (
          <p className="listen-stream-empty">
            {stopping
              ? "Turning speech into a labelled conversation."
              : captionSupported
                ? "Speak — words will land here as they are said."
                : "Live words need Chrome or Edge. The session record still writes when you stop."}
          </p>
        )}
      </div>

      {error && <div className="listen-error">{error}</div>}

      <button className="btn btn-danger btn-lg listen-stop" onClick={onStop} disabled={stopping}>
        {stopping && <span className="spinner" />}
        {stopping ? "Finishing" : "Stop listening"}
      </button>
    </div>
  );
}
