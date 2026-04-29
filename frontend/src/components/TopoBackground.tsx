"use client";

import { useMemo } from "react";

// Deterministic LCG so the topo doesn't shift across reloads.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

type Peak = { cx: number; cy: number; sx: number; sy: number; a: number };

function generatePeaks(
  rand: () => number,
  n: number,
  w: number,
  h: number,
): Peak[] {
  const peaks: Peak[] = [];
  for (let i = 0; i < n; i++) {
    peaks.push({
      cx: rand() * w,
      cy: rand() * h,
      sx: 6 + rand() * 14,
      sy: 6 + rand() * 14,
      a: 0.6 + rand() * 1.4 * (i % 3 === 0 ? 1.5 : 1),
    });
  }
  for (let i = 0; i < Math.max(1, Math.floor(n / 3)); i++) {
    peaks.push({
      cx: rand() * w,
      cy: rand() * h,
      sx: 5 + rand() * 10,
      sy: 5 + rand() * 10,
      a: -(0.3 + rand() * 0.8),
    });
  }
  return peaks;
}

function buildField(cols: number, rows: number, peaks: Peak[]): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      let sum = 0;
      for (const p of peaks) {
        const dx = (c - p.cx) / p.sx;
        const dy = (r - p.cy) / p.sy;
        sum += p.a * Math.exp(-(dx * dx + dy * dy));
      }
      row.push(sum);
    }
    grid.push(row);
  }
  return grid;
}

function fieldRange(grid: number[][]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const row of grid) {
    for (const v of row) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return { min, max };
}

type Pt = [number, number];

/**
 * Marching squares — each cell emits 0–2 line segments along the contour at
 * `threshold`. Segments never cross because they trace a single isoline.
 */
function marchingSquares(grid: number[][], threshold: number): Pt[][] {
  const rows = grid.length;
  const cols = grid[0].length;
  const out: Pt[][] = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const tl = grid[r][c];
      const tr = grid[r][c + 1];
      const br = grid[r + 1][c + 1];
      const bl = grid[r + 1][c];
      let idx = 0;
      if (tl > threshold) idx |= 1;
      if (tr > threshold) idx |= 2;
      if (br > threshold) idx |= 4;
      if (bl > threshold) idx |= 8;
      if (idx === 0 || idx === 15) continue;

      const lerp = (a: number, b: number) => (threshold - a) / (b - a);
      const top: Pt = [c + lerp(tl, tr), r];
      const right: Pt = [c + 1, r + lerp(tr, br)];
      const bottom: Pt = [c + lerp(bl, br), r + 1];
      const left: Pt = [c, r + lerp(tl, bl)];

      switch (idx) {
        case 1:
        case 14:
          out.push([left, top]);
          break;
        case 2:
        case 13:
          out.push([top, right]);
          break;
        case 3:
        case 12:
          out.push([left, right]);
          break;
        case 4:
        case 11:
          out.push([right, bottom]);
          break;
        case 5:
          out.push([left, top], [right, bottom]);
          break;
        case 6:
        case 9:
          out.push([top, bottom]);
          break;
        case 7:
        case 8:
          out.push([left, bottom]);
          break;
        case 10:
          out.push([left, bottom], [top, right]);
          break;
      }
    }
  }
  return out;
}

function segmentsToPath(segs: Pt[][], scaleX: number, scaleY: number): string {
  const fmt = (n: number) => n.toFixed(1);
  const parts: string[] = [];
  for (const [a, b] of segs) {
    parts.push(
      `M${fmt(a[0] * scaleX)} ${fmt(a[1] * scaleY)}L${fmt(b[0] * scaleX)} ${fmt(b[1] * scaleY)}`,
    );
  }
  return parts.join("");
}

const VIEW_W = 1600;
const VIEW_H = 1000;
const GRID_COLS = 96;
const GRID_ROWS = 60;
const NUM_LEVELS = 9;
const SEED = 1337;
const NUM_PEAKS = 6;

/**
 * Generates a topographic-contour SVG once on mount, encodes as a data URL,
 * and lets the browser rasterize it. Subsequent resizes scale the bitmap
 * natively — no re-running of the SVG glow filter on each viewport change.
 */
export default function TopoBackground() {
  const dataUrl = useMemo(() => {
    const rand = rng(SEED);
    const peaks = generatePeaks(rand, NUM_PEAKS, GRID_COLS, GRID_ROWS);
    const grid = buildField(GRID_COLS, GRID_ROWS, peaks);
    const { min, max } = fieldRange(grid);
    const span = max - min;
    const scaleX = VIEW_W / (GRID_COLS - 1);
    const scaleY = VIEW_H / (GRID_ROWS - 1);

    const pathEls: string[] = [];
    for (let i = 1; i <= NUM_LEVELS; i++) {
      const t = min + (i / (NUM_LEVELS + 1)) * span;
      const segs = marchingSquares(grid, t);
      const d = segmentsToPath(segs, scaleX, scaleY);
      const isIndex = i % 4 === 0;
      const sw = isIndex ? 1.5 : 0.7;
      const op = isIndex ? 0.9 : 0.72;
      pathEls.push(`<path d="${d}" stroke-width="${sw}" opacity="${op}"/>`);
    }

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="xMidYMid slice">` +
      `<defs>` +
      `<filter id="g" x="-5%" y="-5%" width="110%" height="110%">` +
      `<feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="b1"/>` +
      `<feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b2"/>` +
      `<feMerge><feMergeNode in="b2"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge>` +
      `</filter>` +
      `</defs>` +
      `<g stroke="#fb923c" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#g)">` +
      pathEls.join("") +
      `</g>` +
      `</svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }, []);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        backgroundImage: `url("${dataUrl}")`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
    />
  );
}
