import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Upload, AlertTriangle, Play, ChevronDown, ChevronUp } from "lucide-react";
import { DotMatrixNumber } from "@/components/DotMatrixNumber";

export const Route = createFileRoute("/u/$slug")({
  component: ContributorUpload,
});

const TOP_TAGS = ["Goal", "Save", "Pre-game", "Post-game", "Celebration", "B-Roll"];
const MORE_TAGS = [
  "Big Play", "Free Kick", "Corner Kick", "Penalty", "Warmup", "Huddle",
  "Bench", "Practice", "Tournament", "Travel", "Game", "Funny Moment",
];

type Phase = "upload" | "uploading" | "celebration";

function isNightMode() {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  return h >= 17.5 || h < 6;
}

function formatSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const colors = ["#D4A017", "#F0C84A", "#1F6E3A", "#4DBF78", "#A8DBBA", "#ffffff"];
    const pieces = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * -window.innerHeight,
      w: 5 + Math.random() * 5,
      h: 8 + Math.random() * 6,
      vy: 1.5 + Math.random() * 2,
      vx: -1 + Math.random() * 2,
      rot: Math.random() * Math.PI * 2,
      vr: -0.1 + Math.random() * 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      pieces.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (p.y > window.innerHeight + 20) { p.y = -20; p.x = Math.random() * window.innerWidth; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-10" />;
}

function Wave() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 9), 220);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-end justify-center gap-1 text-3xl">
      {Array.from({ length: 7 }).map((_, i) => {
        const active = step === i;
        return (
          <span
            key={i}
            className="inline-block transition-transform duration-200"
            style={{ transform: active ? "translateY(-10px)" : "translateY(0)" }}
          >
            {active ? "🙌" : "🧍"}
          </span>
        );
      })}
    </div>
  );
}

function ContributorUpload() {
  const { slug } = Route.useParams();
  const [team, setTeam] = useState<{ id: string; name: string; sport: string; season_year?: number | null } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [poolCount, setPoolCount] = useState(0);
  const [prevPoolCount, setPrevPoolCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);
  const [addedToday, setAddedToday] = useState(0);

  const [tag, setTag] = useState<string>("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<string>("");

  const [phase, setPhase] = useState<Phase>("upload");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Starting...");
  const [night] = useState(isNightMode());

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (night) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [night]);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase
        .from("teams")
        .select("id,name,sport,season_year")
        .eq("upload_slug", slug)
        .maybeSingle();
      if (!t) { setNotFound(true); return; }
      setTeam(t as any);
      const { count } = await supabase
        .from("clips")
        .select("id", { count: "exact", head: true })
        .eq("team_id", t.id);
      const c = count || 0;
      setPoolCount(c);
      setPrevPoolCount(c);
      setDisplayCount(c);
    })();
    if (typeof window !== "undefined") {
      const key = `keeper_added_${slug}_${new Date().toDateString()}`;
      setAddedToday(parseInt(window.localStorage.getItem(key) || "0", 10));
    }
  }, [slug]);

  const onFile = (f: File | null) => {
    setFile(f);
    setDuration("");
    if (!f) return;
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const d = v.duration;
      const m = Math.floor(d / 60);
      const s = Math.floor(d % 60);
      setDuration(`${m}:${s.toString().padStart(2, "0")}`);
      URL.revokeObjectURL(v.src);
    };
    v.src = URL.createObjectURL(f);
  };

  const startProgress = () =>
    new Promise<void>((resolve) => {
      let p = 0;
      const tick = () => {
        let inc = 2.8;
        if (p >= 96) inc = 0.08;
        else if (p >= 88) inc = 0.25;
        else if (p >= 70) inc = 0.7;
        p = Math.min(100, p + inc);
        setProgress(p);
        if (p >= 100) { setStatusText("Complete!"); resolve(); return; }
        if (p >= 96) setStatusText("Saving to pool...");
        else if (p >= 88) setStatusText("Finishing up...");
        else if (p >= 65) setStatusText("Almost there...");
        else if (p >= 20) setStatusText("Uploading...");
        setTimeout(tick, 80);
      };
      tick();
    });

  const submit = async () => {
    if (!team || !file) return;
    setPhase("uploading");
    setProgress(0);
    setStatusText("Starting...");
    try {
      const path = `${team.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
      const uploadPromise = supabase.storage.from("clips").upload(path, file);
      await Promise.all([uploadPromise, startProgress()]);
      const { data: pub } = supabase.storage.from("clips").getPublicUrl(path);
      await supabase.from("clips").insert({
        team_id: team.id,
        file_url: pub.publicUrl,
        note: tag || null,
      });
      const newCount = poolCount + 1;
      const isFirst = addedToday === 0;
      setPrevPoolCount(poolCount);
      setPoolCount(newCount);
      const next = addedToday + 1;
      setAddedToday(next);
      if (typeof window !== "undefined") {
        const key = `keeper_added_${slug}_${new Date().toDateString()}`;
        window.localStorage.setItem(key, String(next));
      }
      if (isFirst) {
        setDisplayCount(poolCount);
        setPhase("celebration");
      } else {
        setDisplayCount(newCount);
        setPhase("upload");
        setFile(null); setTag(""); setDuration("");
        toast.success("Clip added!", { duration: 1500 });
      }
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
      setPhase("upload");
    }
  };

  // Animate displayCount up to poolCount on celebration
  useEffect(() => {
    if (phase !== "celebration") return;
    if (displayCount >= poolCount) return;
    const id = setTimeout(() => setDisplayCount((c) => c + 1), 480);
    return () => clearTimeout(id);
  }, [phase, displayCount, poolCount]);

  if (notFound) return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div><h1 className="text-2xl">Link not found</h1><p className="mt-2 text-muted-foreground">Ask your coach for the right link.</p></div>
    </div>
  );
  if (!team) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;

  // CELEBRATION
  if (phase === "celebration") {
    return (
      <div className="relative min-h-screen overflow-hidden" style={{ background: "#0A2517" }}>
        <Toaster />
        <Confetti />
        <div className="relative z-20 mx-auto flex min-h-screen max-w-[390px] flex-col items-center justify-center px-6 py-10">
          <Wave />
          <h1 className="mt-8 text-center text-4xl" style={{ color: "#F0C84A" }}>You're in the pool!</h1>
          <p className="mt-2 text-center text-sm" style={{ color: "#4DBF78", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {team.name} · {team.season_year ?? new Date().getFullYear()}
          </p>
          <div className="mt-8 w-full rounded-xl border p-5 text-center" style={{ background: "#0F3320", borderColor: "#1E6B3D" }}>
            <div className="text-xs" style={{ color: "#4DBF78", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Clips in the pool
            </div>
            <div className="mt-3 flex justify-center">
              <DotMatrixNumber value={displayCount} scale={2} radius={4} gap={9} />
            </div>
          </div>
          <p className="mt-4 text-sm" style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", color: "#4DBF78" }}>
            You've added <span style={{ color: "#F0C84A" }}>{addedToday}</span> clip{addedToday === 1 ? "" : "s"} today
          </p>
          <div className="mt-8 w-full space-y-3">
            <button
              onClick={() => { setPhase("upload"); setFile(null); setTag(""); setDuration(""); }}
              className="w-full rounded-xl py-4 text-base"
              style={{ background: "#D4A017", color: "#2C1A00", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              + Add another clip
            </button>
            <button
              onClick={() => { if (typeof window !== "undefined") window.close(); }}
              className="w-full rounded-xl border-2 py-4 text-base"
              style={{ borderColor: "#1E6B3D", color: "#4DBF78", background: "transparent", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // UPLOADING
  if (phase === "uploading") {
    return (
      <div className="min-h-screen" style={{ background: "#0A2517" }}>
        <div className="sticky top-0 z-30 flex items-start gap-2 px-4 py-3" style={{ background: "#D4A017", color: "#2C1A00" }}>
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, textTransform: "none", letterSpacing: "normal" }}>
            Keep this window open until the upload is complete or your clip won't be saved.
          </p>
        </div>
        <div className="mx-auto max-w-[390px] px-6 py-8">
          <h1 className="text-3xl" style={{ color: "#F0C84A" }}>{team.name}</h1>
          <p className="mt-1 text-sm" style={{ color: "#4DBF78", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Uploading your clip
          </p>

          {file && (
            <div className="mt-6 rounded-xl border p-4" style={{ background: "#144D2E", borderColor: "#1E6B3D" }}>
              <p className="truncate text-sm" style={{ color: "#A8DBBA", fontFamily: "'Inter', sans-serif", textTransform: "none", letterSpacing: "normal" }}>{file.name}</p>
              <div className="mt-1 flex justify-between text-xs" style={{ color: "#4DBF78", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                <span>{tag || "Untagged"}</span>
                <span>{formatSize(file.size)}</span>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="flex justify-between text-xs" style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              <span style={{ color: "#4DBF78" }}>Uploading</span>
              <span style={{ color: "#F0C84A" }}>{Math.floor(progress)}%</span>
            </div>
            <div className="mt-2 h-[7px] w-full overflow-hidden rounded-full" style={{ background: "#1E6B3D" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "#D4A017" }} />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "#4DBF78", fontFamily: "'Inter', sans-serif", textTransform: "none", letterSpacing: "normal" }}>
              <span className="inline-block h-2 w-2 animate-pulse rounded-full" style={{ background: "#F0C84A" }} />
              {statusText}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // UPLOAD (Screen 1)
  return (
    <div className="min-h-screen" style={{ background: "#0A2517" }}>
      <Toaster />
      <div className="mx-auto max-w-[390px]">
        {/* Header */}
        <div className="px-5 pt-6 pb-4" style={{ background: "#0A2517" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "#D4A017" }}>
                <Play className="h-4 w-4" style={{ color: "white", fill: "white" }} />
              </div>
              <span className="text-xl" style={{ color: "#F0C84A" }}>Keeper</span>
            </div>
            <span className="rounded-full px-3 py-1 text-[10px]" style={{ background: "#144D2E", color: "#F0C84A", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", border: "1px solid #1E6B3D" }}>
              {night ? "Night game" : "Day game"}
            </span>
          </div>
          <Card className="mt-4 border p-4" style={{ background: "#144D2E", borderColor: "#1E6B3D" }}>
            <p className="text-xs" style={{ color: "#4DBF78", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>Team</p>
            <p className="text-2xl" style={{ color: "#F0C84A" }}>{team.name}</p>
            <p className="mt-1 text-xs" style={{ color: "#4DBF78", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Season {team.season_year ?? new Date().getFullYear()}
            </p>
          </Card>
        </div>

        {/* Counter strip */}
        <div className="mx-5 flex items-center justify-between rounded-xl border px-4 py-3" style={{ background: "#0F3320", borderColor: "#1E6B3D" }}>
          <span className="text-xs" style={{ color: "#4DBF78", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Clips in pool
          </span>
          <DotMatrixNumber value={poolCount} scale={1} radius={3} gap={6} />
        </div>

        {/* Tag picker */}
        <div className="px-5 pt-6">
          <p className="text-xs" style={{ color: "#4DBF78", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>Tag your clip</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TOP_TAGS.map((t) => {
              const on = tag === t;
              return (
                <button
                  key={t}
                  onClick={() => setTag(on ? "" : t)}
                  className="rounded-full border px-3 py-1.5 text-xs"
                  style={{
                    background: on ? "#D4A017" : "#144D2E",
                    color: on ? "#2C1A00" : "#4DBF78",
                    borderColor: on ? "#D4A017" : "#1E6B3D",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {t}
                </button>
              );
            })}
            <button
              onClick={() => setMoreOpen((o) => !o)}
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs"
              style={{ background: "#144D2E", color: "#4DBF78", borderColor: "#1E6B3D", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              {moreOpen ? <><ChevronUp className="h-3 w-3" />Less</> : <><ChevronDown className="h-3 w-3" />More tags</>}
            </button>
            {moreOpen && MORE_TAGS.map((t) => {
              const on = tag === t;
              return (
                <button
                  key={t}
                  onClick={() => setTag(on ? "" : t)}
                  className="rounded-full border px-3 py-1.5 text-xs"
                  style={{
                    background: on ? "#D4A017" : "#144D2E",
                    color: on ? "#2C1A00" : "#4DBF78",
                    borderColor: on ? "#D4A017" : "#1E6B3D",
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Upload zone */}
        <div className="px-5 pt-6">
          {!file ? (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 text-center"
              style={{ background: "#0F3320", borderColor: "#1E6B3D" }}>
              <Upload className="h-7 w-7" style={{ color: "#F0C84A" }} />
              <span className="text-sm" style={{ color: "#F0C84A", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Tap to add your clip
              </span>
              <span className="text-xs" style={{ color: "#4DBF78", fontFamily: "'Inter', sans-serif", textTransform: "none", letterSpacing: "normal" }}>
                No account needed
              </span>
              <input type="file" accept="video/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            </label>
          ) : (
            <div className="rounded-xl border p-4" style={{ background: "#144D2E", borderColor: "#1E6B3D" }}>
              <p className="truncate text-sm" style={{ color: "#A8DBBA", fontFamily: "'Inter', sans-serif", textTransform: "none", letterSpacing: "normal" }}>{file.name}</p>
              <div className="mt-1 flex items-center justify-between text-xs" style={{ color: "#4DBF78", fontFamily: "'Inter', sans-serif", textTransform: "none", letterSpacing: "normal" }}>
                <span>{duration && `${duration} · `}{formatSize(file.size)}</span>
                <label className="cursor-pointer underline" style={{ color: "#F0C84A" }}>
                  Change
                  <input type="file" accept="video/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="px-5 pt-6 pb-4">
          <button
            onClick={submit}
            disabled={!file}
            className="w-full rounded-xl py-4 text-base disabled:opacity-50"
            style={{ background: "#D4A017", color: "#2C1A00", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            Submit to Pool ▶
          </button>
          <p className="mt-3 text-center text-xs" style={{ color: "#4DBF78", fontFamily: "'Inter', sans-serif", textTransform: "none", letterSpacing: "normal" }}>
            Goes straight to the {team.name} pool · No account needed
          </p>
        </div>
      </div>
    </div>
  );
}
