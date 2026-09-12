function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

export function canSpeak(): boolean {
  return Boolean(getSynth() && typeof SpeechSynthesisUtterance !== "undefined");
}

export async function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  const synth = getSynth();
  if (!synth) return [];
  const existing = synth.getVoices();
  if (existing.length) return existing;
  return new Promise((resolve) => {
    const finish = () => resolve(synth.getVoices());
    synth.addEventListener("voiceschanged", finish, { once: true });
    window.setTimeout(finish, 800);
  });
}

export function pickEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const score = (voice: SpeechSynthesisVoice) => {
    const name = voice.name.toLowerCase();
    const lang = voice.lang.toLowerCase();
    let points = 0;
    if (lang.startsWith("en")) points += 12;
    if (lang === "en-us" || lang === "en-in" || lang === "en-gb") points += 4;
    if (name.includes("google")) points += 8;
    if (name.includes("natural") || name.includes("neural")) points += 5;
    if (name.includes("microsoft")) points += 3;
    if (voice.localService) points += 2;
    if (name.includes("samantha") || name.includes("aria") || name.includes("jenny") || name.includes("zira")) {
      points += 2;
    }
    return points;
  };
  return [...voices].sort((a, b) => score(b) - score(a))[0] ?? null;
}

function splitChunks(text: string, maxLen = 220): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const parts = cleaned.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let buf = "";
  for (const part of parts) {
    const next = buf ? `${buf} ${part}` : part;
    if (next.length > maxLen && buf) {
      chunks.push(buf);
      buf = part;
    } else {
      buf = next;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

export type SpeakHandle = {
  stop: () => void;
  done: Promise<void>;
};

export function speakText(text: string): SpeakHandle {
  const synth = getSynth();
  let stopped = false;
  let keepAlive: number | null = null;
  let settle: (() => void) | null = null;

  const done = new Promise<void>((resolve) => {
    settle = resolve;
  });

  const finish = () => {
    if (keepAlive !== null) {
      window.clearInterval(keepAlive);
      keepAlive = null;
    }
    settle?.();
    settle = null;
  };

  const stop = () => {
    stopped = true;
    synth?.cancel();
    finish();
  };

  void (async () => {
    if (!synth) {
      finish();
      return;
    }
    synth.cancel();
    await new Promise((resolve) => window.setTimeout(resolve, 40));
    if (stopped) return;

    const voices = await waitForVoices();
    if (stopped) return;
    const voice = pickEnglishVoice(voices);
    const chunks = splitChunks(text);
    if (chunks.length === 0) {
      finish();
      return;
    }

    keepAlive = window.setInterval(() => {
      if (synth.speaking && !synth.paused) {
        synth.pause();
        synth.resume();
      }
    }, 8000);

    try {
      for (const chunk of chunks) {
        if (stopped) break;
        await new Promise<void>((resolve, reject) => {
          const utterance = new SpeechSynthesisUtterance(chunk);
          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
          } else {
            utterance.lang = "en-US";
          }
          utterance.rate = 1;
          utterance.pitch = 1;
          utterance.volume = 1;
          utterance.onend = () => resolve();
          utterance.onerror = (event) => {
            if (event.error === "canceled" || event.error === "interrupted") resolve();
            else reject(event);
          };
          synth.speak(utterance);
        });
      }
    } finally {
      finish();
    }
  })();

  return { stop, done };
}
