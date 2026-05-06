type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, { fontSize: string; letterSpacing: string }> = {
  sm: { fontSize: "14px", letterSpacing: "0.04em" },
  md: { fontSize: "18px", letterSpacing: "0.04em" },
  lg: { fontSize: "24px", letterSpacing: "0.04em" },
  xl: { fontSize: "32px", letterSpacing: "0.04em" },
};

export function KeeperWordmark({ size = "md" }: { size?: Size }) {
  const style = SIZES[size];
  return (
    <span
      style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 700,
        textTransform: "uppercase",
        ...style,
      }}
    >
      <span style={{ color: "#4DBF78" }}>Keep</span>
      <span style={{ color: "#D4A017" }}>er</span>
    </span>
  );
}

export default KeeperWordmark;