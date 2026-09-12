export function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatClock(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + (iso.endsWith("Z") ? "" : "Z"));
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function eventLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const AVATAR_COLORS = ["#1b6b93", "#2a6b4f", "#b85c2a", "#4a5d8a", "#8b4d63", "#3d6b5a"];

export function avatarColor(speakerLabel: string): string {
  const n = parseInt(speakerLabel.replace(/\D/g, ""), 10) || 0;
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

export function initialsFor(name: string): string {
  const parts = name.replace("Speaker ", "S").split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}
