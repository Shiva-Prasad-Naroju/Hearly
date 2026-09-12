import { useEffect, useMemo } from "react";
import { ListeningStage } from "../components/ListeningStage";
import { useLiveCaption } from "../hooks/useLiveCaption";
import { useSessionStore } from "../store/sessionStore";

interface LivePageProps {
  onStop: () => void;
  stopping: boolean;
  micError: string | null;
  level: number;
  elapsedSeconds: number;
}

export function LivePage({ onStop, stopping, micError, level, elapsedSeconds }: LivePageProps) {
  const caption = useLiveCaption();
  const segments = useSessionStore((s) => s.segments);
  const groqLines = useMemo(
    () => segments.map((seg) => seg.text).filter(Boolean),
    [segments],
  );

  useEffect(() => {
    if (stopping) {
      caption.stop();
      return;
    }
    caption.start();
    return () => caption.stop();
  }, [stopping, caption.start, caption.stop]);

  const liveLines = caption.lines.length > 0 ? caption.lines : groqLines;
  const error = micError || caption.error;

  return (
    <ListeningStage
      level={level}
      elapsedSeconds={elapsedSeconds}
      onStop={onStop}
      stopping={stopping}
      error={error}
      liveLines={liveLines}
      liveInterim={caption.interim}
      captionSupported={caption.supported}
    />
  );
}
