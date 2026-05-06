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

export function DotMatrixNumber({
  value,
  dotRadius = 5,
  gap = 11,
  digitSpacing = 2,
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

    const digits = String(value).split("").filter((d) => DIGITS[d]);
    if (digits.length === 0) return;

    const totalCols = digits.reduce(
      (a, d) => a + DIGITS[d][0].length + digitSpacing,
      -digitSpacing,
    );
    const cssW = totalCols * gap + dotRadius * 2;
    const cssH = 5 * gap + dotRadius * 2;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.ceil(cssW * dpr);
    canvas.height = Math.ceil(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const rUnlit = unlitRadius ?? Math.max(2, dotRadius * 0.4);
    let cx = 0;
    digits.forEach((d) => {
      const pattern = DIGITS[d];
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < pattern[row].length; col++) {
          const x = (cx + col) * gap + dotRadius;
          const y = row * gap + dotRadius;
          const lit = pattern[row][col] === 1;
          ctx.beginPath();
          ctx.arc(x, y, lit ? dotRadius : rUnlit, 0, Math.PI * 2);
          ctx.fillStyle = lit ? "#F0C84A" : "#1E6B3D";
          ctx.fill();
        }
      }
      cx += pattern[0].length + digitSpacing;
    });
  }, [value, dotRadius, gap, digitSpacing, unlitRadius]);

  return <canvas ref={ref} aria-label={String(value)} />;
}
