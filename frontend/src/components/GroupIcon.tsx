"use client";

// Saturated palette tuned for dark backgrounds — deterministic per group id.
const PALETTE = [
  "#fb923c", // orange
  "#22d3ee", // cyan
  "#a78bfa", // violet
  "#f472b6", // pink
  "#34d399", // emerald
  "#facc15", // amber
  "#60a5fa", // blue
  "#f87171", // red
  "#c084fc", // purple
  "#2dd4bf", // teal
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = {
  group: { id: string; name: string; icon_url?: string | null };
  size?: number;
  className?: string;
};

export default function GroupIcon({ group, size = 40, className = "" }: Props) {
  if (group.icon_url) {
    return (
      // biome-ignore lint/performance/noImgElement: user-supplied URL, not a static asset
      <img
        src={group.icon_url}
        alt={group.name}
        width={size}
        height={size}
        className={`rounded-full object-cover ring-2 ring-white/20 shadow-lg shadow-black/30 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const colour = PALETTE[hashString(group.id) % PALETTE.length];
  const text = initials(group.name);
  const fontSize = Math.round(size * 0.4);

  return (
    <div
      title={group.name}
      className={`inline-flex items-center justify-center rounded-full text-slate-950 font-bold ring-2 ring-white/20 shadow-lg shadow-black/30 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: colour,
        fontSize,
        letterSpacing: "0.02em",
      }}
    >
      {text}
    </div>
  );
}
