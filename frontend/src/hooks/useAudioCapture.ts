import { useCallback, useEffect, useRef, useState } from "react";

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

interface UseAudioCaptureOptions {
  chunkMs?: number;
  getSpeakerLabel: () => string;
  onChunk: (blob: Blob, speakerLabel: string) => void | Promise<void>;
  onError?: (message: string) => void;
}

/**
 * Records the microphone in back-to-back, self-contained clips (stop/start cycling
 * a fresh MediaRecorder rather than using `start(timeslice)`) so every chunk is a
 * standalone, independently-decodable audio file the backend can hand straight to
 * a transcription API. A lightweight volume gate skips uploading pure silence.
 */
export function useAudioCapture({ chunkMs = 10000, getSpeakerLabel, onChunk, onError }: UseAudioCaptureOptions) {
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const hasSoundRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const levelIntervalRef = useRef<number | null>(null);
  const stopResolveRef = useRef<(() => void) | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  const startCycle = useCallback(() => {
    if (stopRequestedRef.current || !streamRef.current) return;
    const mimeType = pickMimeType();
    const chunks: Blob[] = [];
    const mr = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    recorderRef.current = mr;
    hasSoundRef.current = false;

    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    mr.onstop = () => {
      const blob = new Blob(chunks, { type: mr.mimeType || mimeType || "audio/webm" });
      // Groq can filter silence; skip only tiny container-only blobs.
      if (blob.size > 800 && (hasSoundRef.current || blob.size > 2500 || stopRequestedRef.current)) {
        void onChunk(blob, getSpeakerLabel());
      }
      if (!stopRequestedRef.current) {
        startCycle();
      } else {
        stopResolveRef.current?.();
        stopResolveRef.current = null;
      }
    };

    mr.start();
    timeoutRef.current = window.setTimeout(() => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    }, chunkMs);
  }, [chunkMs, getSpeakerLabel, onChunk]);

  const stop = useCallback(() => {
    return new Promise<void>((resolve) => {
      stopRequestedRef.current = true;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      if (levelIntervalRef.current) window.clearInterval(levelIntervalRef.current);

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        stopResolveRef.current = null;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (audioCtxRef.current) {
          audioCtxRef.current.close().catch(() => undefined);
          audioCtxRef.current = null;
        }
        setIsActive(false);
        setLevel(0);
        resolve();
      };

      const mr = recorderRef.current;
      if (mr && mr.state !== "inactive") {
        stopResolveRef.current = finish;
        window.setTimeout(() => {
          if (stopResolveRef.current) {
            const done = stopResolveRef.current;
            stopResolveRef.current = null;
            done();
          }
        }, 2000);
        try {
          mr.stop();
        } catch {
          finish();
        }
      } else {
        finish();
      }
    });
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextCtor();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") {
        await ctx.resume().catch(() => undefined);
      }
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      levelIntervalRef.current = window.setInterval(() => {
        analyser.getByteTimeDomainData(data);
        let sumSq = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / data.length);
        if (rms > 0.008) hasSoundRef.current = true;
        setLevel((prev) => prev * 0.4 + Math.min(1, rms * 5) * 0.6);
      }, 80);

      stopRequestedRef.current = false;
      setIsActive(true);
      startCycle();
    } catch (e) {
      const err = e as DOMException;
      let message = "Microphone access failed.";
      if (err.name === "NotAllowedError") message = "Microphone permission was denied.";
      else if (err.name === "NotFoundError") message = "No microphone was found on this device.";
      setError(message);
      onError?.(message);
    }
  }, [onError, startCycle]);

  useEffect(() => stop, [stop]);

  return { start, stop, isActive, error, level };
}
