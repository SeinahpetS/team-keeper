import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const STORAGE_KEY = "keeper_game_mode";
type Mode = "day" | "night";

function defaultMode(): Mode {
  if (typeof window === "undefined") return "day";
  return new Date().getHours() >= 17 ? "night" : "day";
}

function readMode(): Mode {
  if (typeof window === "undefined") return "day";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "day" || stored === "night") return stored;
  return defaultMode();
}

function applyMode(mode: Mode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "night");
}

const listeners = new Set<(m: Mode) => void>();

export function setGameMode(mode: Mode) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, mode);
  applyMode(mode);
  listeners.forEach((l) => l(mode));
}

export function useGameMode(): [Mode, (m: Mode) => void] {
  const [mode, setMode] = useState<Mode>(() => readMode());
  useEffect(() => {
    applyMode(mode);
    const l = (m: Mode) => setMode(m);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return [mode, setGameMode];
}

export function GameModeToggle() {
  const [mode, setMode] = useGameMode();
  const isNight = mode === "night";
  return (
    <button
      type="button"
      onClick={() => setMode(isNight ? "day" : "night")}
      aria-label={`Switch to ${isNight ? "day" : "night"} game`}
      className="fixed right-4 top-4 z-[60] flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-[10px] backdrop-blur-sm transition-colors"
      style={{
        background: "color-mix(in oklab, var(--color-background) 70%, transparent)",
        borderColor: "var(--color-border)",
        color: "var(--color-accent)",
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      {isNight ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
      {isNight ? "Night game" : "Day game"}
    </button>
  );
}
