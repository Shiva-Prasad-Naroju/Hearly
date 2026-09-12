import { useCallback, useRef, useState } from "react";

function recognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function canLiveCaption(): boolean {
  return recognitionCtor() !== null;
}

export function useLiveCaption() {
  const recRef = useRef<SpeechRecognition | null>(null);
  const wantedRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);

  const [interim, setInterim] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  const clearRestart = () => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  const stop = useCallback(() => {
    wantedRef.current = false;
    clearRestart();
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    }
    setInterim("");
    setActive(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setError("Live words need Chrome or Edge.");
      return;
    }

    stop();
    wantedRef.current = true;
    setError(null);
    setLines([]);
    setInterim("");

    let rec: SpeechRecognition;
    try {
      rec = new Ctor();
    } catch {
      setError("Couldn't start live captions.");
      return;
    }
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = navigator.language?.startsWith("en") ? navigator.language : "en-IN";

    rec.onresult = (event) => {
      let live = "";
      const finals: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript.replace(/\s+/g, " ").trim();
        if (!text) continue;
        if (result.isFinal) finals.push(text);
        else live = live ? `${live} ${text}` : text;
      }
      if (finals.length) {
        setLines((prev) => [...prev, ...finals].slice(-40));
      }
      setInterim(live);
    };

    rec.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech" || event.error === "audio-capture") return;
      if (event.error === "not-allowed") {
        wantedRef.current = false;
        setError("Chrome needs the microphone to stream words.");
        setActive(false);
      }
    };

    rec.onend = () => {
      if (!wantedRef.current) {
        setActive(false);
        return;
      }
      clearRestart();
      restartTimerRef.current = window.setTimeout(() => {
        if (!wantedRef.current) return;
        try {
          rec.start();
          setActive(true);
        } catch {
          /* already running */
        }
      }, 180);
    };

    recRef.current = rec;
    try {
      rec.start();
      setActive(true);
    } catch {
      setError("Couldn't start live captions.");
    }
  }, [stop]);

  return {
    start,
    stop,
    interim,
    lines,
    error,
    active,
    supported: canLiveCaption(),
  };
}
