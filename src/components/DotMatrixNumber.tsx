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

export function DotMatrixNumber({
  value,
  scale = 2,
  radius = 2.5,
  gap = 5,
}: {
  value: number | string;
  scale?: number;
  radius?: number;
  gap?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const digits = String(value);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const lit = "#F0C84A";
    const unlit = "#1E6B3D";

    const r = radius * scale;
    const g = gap * scale;
    const step = r * 2 + g;
    const digitW = COLS * r * 2 + (COLS - 1) * g;
    const digitH = ROWS * r * 2 + (ROWS - 1) * g;
    const digitGap = g + r * 2; // 1-column gap between digits

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
  }, [digits, scale, radius, gap]);

  return <canvas ref={ref} aria-label={String(value)} />;
}