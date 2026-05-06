import { useEffect, useRef } from "react";

const GLYPHS: Record<string, number[][]> = {
  "0": [[0,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[0,1,1,0]],
  "1": [[0,0,1,0],[0,1,1,0],[0,0,1,0],[0,0,1,0],[0,1,1,1]],
  "2": [[0,1,1,0],[1,0,0,1],[0,0,1,0],[0,1,0,0],[1,1,1,1]],
  "3": [[1,1,1,0],[0,0,0,1],[0,1,1,0],[0,0,0,1],[1,1,1,0]],
  "4": [[1,0,0,1],[1,0,0,1],[1,1,1,1],[0,0,0,1],[0,0,0,1]],
  "5": [[1,1,1,1],[1,0,0,0],[1,1,1,0],[0,0,0,1],[1,1,1,0]],
  "6": [[0,1,1,1],[1,0,0,0],[1,1,1,0],[1,0,0,1],[0,1,1,0]],
  "7": [[1,1,1,1],[0,0,0,1],[0,0,1,0],[0,1,0,0],[0,1,0,0]],
  "8": [[0,1,1,0],[1,0,0,1],[0,1,1,0],[1,0,0,1],[0,1,1,0]],
  "9": [[0,1,1,0],[1,0,0,1],[0,1,1,1],[0,0,0,1],[0,1,1,0]],
};

const COLS = 4;
const ROWS = 5;
const RADIUS = 2.5;
const GAP = 5;

export function DotMatrixNumber({ value, scale = 2 }: { value: number | string; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const digits = String(value);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    const lit = isDark ? "#F0C84A" : "#1F6E3A";
    const unlit = isDark ? "#1E6B3D" : "#BDE3CB";

    const r = RADIUS * scale;
    const gap = GAP * scale;
    const step = r * 2 + gap;
    const digitW = COLS * r * 2 + (COLS - 1) * gap;
    const digitH = ROWS * r * 2 + (ROWS - 1) * gap;
    const digitGap = gap * 2;

    const totalW = digits.length * digitW + (digits.length - 1) * digitGap;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    canvas.width = Math.ceil(totalW * dpr);
    canvas.height = Math.ceil(digitH * dpr);
    canvas.style.width = `${totalW}px`;
    canvas.style.height = `${digitH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, totalW, digitH);

    digits.split("").forEach((d, di) => {
      const glyph = GLYPHS[d] ?? GLYPHS["0"];
      const offsetX = di * (digitW + digitGap);
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const cx = offsetX + r + col * step;
          const cy = r + row * step;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = glyph[row][col] ? lit : unlit;
          ctx.fill();
        }
      }
    });
  }, [digits, scale]);

  return <canvas ref={ref} aria-label={String(value)} />;
}