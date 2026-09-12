import { useCallback, useEffect, useRef, useState } from "react";
import { canSpeak, speakText, type SpeakHandle } from "../lib/browserTts";

export function useBrowserTts() {
  const handleRef = useRef<SpeakHandle | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported = canSpeak();

  const stop = useCallback(() => {
    handleRef.current?.stop();
    handleRef.current = null;
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (!canSpeak()) {
        setError("This browser cannot speak. Open Hearly in Chrome.");
        return;
      }
      handleRef.current?.stop();
      setError(null);
      setSpeaking(true);
      const handle = speakText(trimmed);
      handleRef.current = handle;
      try {
        await handle.done;
      } catch {
        setError("Couldn't speak that answer.");
      } finally {
        if (handleRef.current === handle) {
          handleRef.current = null;
          setSpeaking(false);
        }
      }
    },
    [],
  );

  useEffect(() => stop, [stop]);

  return { speak, stop, speaking, supported, error };
}
