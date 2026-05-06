const DIGITS: Record<string, number[][]> = {
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
  dotRadius = 4.5,
  gap = 10.5,
  minDigits = 3,
  litColor = "#F0C84A",
  offColor = "#0D2018",
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
  offColor?: string;
  digitSpacing?: number;
  scale?: number;
  radius?: number;
}) {
  const R = dotRadius;
  const G = gap;
  const str = String(value).padStart(minDigits, "0");
  const digits = str.split("").filter((d) => DIGITS[d]);

  const segs: { p: number[][]; lit: boolean }[] = [];
  digits.forEach((d, i) => {
    segs.push({ p: DIGITS[d], lit: true });
    if (i < digits.length - 1) {
      const l = Number(d);
      const r = Number(digits[i + 1]);
      segs.push({ p: l === 1 || r === 1 ? SEP1 : SEP2, lit: false });
    }
  });

  const totalCols = segs.reduce((a, s) => a + s.p[0].length, 0);
  const W = totalCols * G + R * 2;
  const H = ROWS * G + R * 2;

  const circles: JSX.Element[] = [];
  let cx = 0;
  segs.forEach((seg, segIdx) => {
    seg.p.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        const isLit = seg.lit && cell === 1;
        const x = (cx + ci) * G + R;
        const y = ri * G + R;
        circles.push(
          <circle
            key={`${segIdx}-${ri}-${ci}`}
            cx={x}
            cy={y}
            r={isLit ? R : R * 0.5}
            fill={isLit ? litColor : offColor}
            opacity={isLit ? 1 : 0.8}
          />
        );
      });
    });
    cx += seg.p[0].length;
  });

  return (
    <svg
      width={W}
      height={H}
      aria-label={String(value)}
      style={{ display: "block" }}
    >
      {circles}
    </svg>
  );
}