import { useEffect, useRef } from "react";

const D: Record<string, number[][]> = {
  "0": [[1,1,1,1],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,1]],
  "1": [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
  "2": [[1,1,1,1],[0,0,0,1],[0,0,0,1],[1,1,1,1],[1,0,0,0],[1,0,0,0],[1,1,1,1]],
  "3": [[1,1,1,1],[0,0,0,1],[0,0,0,1],[1,1,1,1],[0,0,0,1],[0,0,0,1],[1,1,1,1]],
  "4": [[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,1],[0,0,0,1],[0,0,0,1],[0,0,0,1]],
  "5": [[1,1,1,1],[1,0,0,0],[1,0,0,0],[1,1,1,1],[0,0,0,1],[0,0,0,1],[1,1,1,1]],
  "6": [[1,1,1,1],[1,0,0,0],[1,0,0,0],[1,1,1,1],[1,0,0,1],[1,0,0,1],[1,1,1,1]],
  "7": [[1,1,1,1],[0,0,0,1],[0,0,0,1],[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
  "8": [[1,1,1,1],[1,0,0,1],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1],[1,1,1,1]],
  "9": [[1,1,1,1],[1,0,0,1],[1,0,0,1],[1,1,1,1],[0,0,0,1],[0,0,0,1],[1,1,1,1]],
};
const ROWS = 7;
const SEP1: number[][] = Array.from({ length: ROWS }, () => [0]);
const SEP2: number[][] = Array.from({ length: ROWS }, () => [0, 0]);

export function DotMatrixNumber({
  value,
  dotRadius = 5,
  gap = 11,
  unlitRadius,
  minDigits = 3,
  litColor = "#F0C84A",
  litCenter = "#FFF5C0",
  offOuter = "#1A4A2A",
  offInner = "#1E5530",
}: {
  value: number | string;
  dotRadius?: number;
  gap?: number;
  unlitRadius?: number;
  minDigits?: number;
  litColor?: string;
  litCenter?: string;
  offOuter?: string;
  offInner?: string;
  // legacy
  digitSpacing?: number;
  scale?: number;
  radius?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const str = String(value).padStart(minDigits, "0");
    const digits = str.split("").filter((d) => D[d]);
    if (digits.length === 0) return;

    const segments: { pattern: number[][]; lit: boolean }[] = [];
    digits.forEach((d, i) => {
      segments.push({ pattern: D[d], lit: true });
      if (i < digits.length - 1) {
        const left = Number(d);
        const right = Number(digits[i + 1]);
        segments.push({ pattern: left === 1 || right === 1 ? SEP1 : SEP2, lit: false });
      }
    });

    const totalCols = segments.reduce((a, s) => a + s.pattern[0].length, 0);
    const cssW = totalCols * gap + dotRadius * 2;
    const cssH = ROWS * gap + dotRadius * 2;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.ceil(cssW * dpr);
    canvas.height = Math.ceil(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const rUnlit = unlitRadius ?? Math.max(2, dotRadius * 0.4);
    const rInner = Math.max(1, rUnlit * 0.5);
    let cx = 0;
    segments.forEach((seg) => {
      const p = seg.pattern;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < p[row].length; col++) {
          const x = (cx + col) * gap + dotRadius;
          const y = row * gap + dotRadius;
          const isLit = seg.lit && p[row][col] === 1;
          if (isLit) {
            const grad = ctx.createRadialGradient(x, y, 0, x, y, dotRadius);
            grad.addColorStop(0, litCenter);
            grad.addColorStop(1, litColor);
            ctx.beginPath();
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(x, y, rUnlit, 0, Math.PI * 2);
            ctx.fillStyle = offOuter;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, y, rInner, 0, Math.PI * 2);
            ctx.fillStyle = offInner;
            ctx.fill();
          }
        }
      }
      cx += p[0].length;
    });
  }, [value, dotRadius, gap, unlitRadius, minDigits, litColor, litCenter, offOuter, offInner]);

  return (
    <canvas
      ref={ref}
      aria-label={String(value)}
      className="dot-matrix-canvas"
      style={{ display: "block", maxWidth: "100%", height: "auto", margin: "0 auto" }}
    />
  );
}
