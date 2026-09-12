import { ListeningStage } from "../components/ListeningStage";

interface LivePageProps {
  onStop: () => void;
  stopping: boolean;
  micError: string | null;
  level: number;
  elapsedSeconds: number;
}

export function LivePage({ onStop, stopping, micError, level, elapsedSeconds }: LivePageProps) {
  return (
    <ListeningStage
      level={level}
      elapsedSeconds={elapsedSeconds}
      onStop={onStop}
      stopping={stopping}
      error={micError}
    />
  );
}
