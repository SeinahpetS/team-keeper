import { useEffect, useRef } from "react";

const DIGITS: Record<string, number[][]> = {
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

const SEP: number[][] = [[0],[0],[0],[0],[0]];

export function DotMatrixNumber({
  value,
  dotRadius = 4,
  gap = 9,
  unlitRadius,
}: {
  value: number | string;
  dotRadius?: number;
  gap?: number;
  digitSpacing?: number;
  unlitRadius?: number;
  // legacy props (ignored)
  scale?: number;
  radius?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const str = String(value).padStart(2, "0");
    const digits = str.split("").filter((d) => DIGITS[d]);
    if (digits.length === 0) return;

    const segments: { pattern: number[][]; lit: boolean }[] = [];
    digits.forEach((d, i) => {
      segments.push({ pattern: DIGITS[d], lit: true });
      if (i < digits.length - 1) segments.push({ pattern: SEP, lit: false });
    });

    const totalCols = segments.reduce((a, s) => a + s.pattern[0].length, 0);
    const cssW = totalCols * gap + dotRadius * 2;
    const cssH = 5 * gap + dotRadius * 2;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.ceil(cssW * dpr);
    canvas.height = Math.ceil(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const rUnlit = unlitRadius ?? dotRadius * 0.35;
    let cx = 0;
    segments.forEach((seg) => {
      const p = seg.pattern;
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < p[row].length; col++) {
          const isLit = seg.lit && p[row][col] === 1;
          ctx.beginPath();
          ctx.arc((cx + col) * gap + dotRadius, row * gap + dotRadius, isLit ? dotRadius : rUnlit, 0, Math.PI * 2);
          ctx.fillStyle = isLit ? "#F0C84A" : "#1E6B3D";
          ctx.fill();
        }
      }
      cx += p[0].length;
    });
  }, [value, dotRadius, gap, unlitRadius]);

  return <canvas ref={ref} aria-label={String(value)} style={{ display: "block" }} />;
}
