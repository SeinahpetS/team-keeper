import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { AlertTriangle, Play, Video, Image as ImageIcon, X, Check, Flag, ArrowLeft, Lock, Pencil, Scissors } from "lucide-react";
import { DotMatrixNumber } from "@/components/DotMatrixNumber";

export const Route = createFileRoute("/u/$slug")({
  component: ContributorUpload,
});

const PLAY_VIBES = ["Celebration", "Hype", "Tough lesson", "Proud moment"] as const;
const BROLL_VIBES = ["Team moment", "Funny", "Hype", "Celebration"] as const;
const BROLL_TYPES = ["Team Sideline", "Fan Sideline", "Team BTS", "Practice"] as const;

type Phase =
  | "upload"
  | "preview"
  | "trim"
  | "event"
  | "kind"
  | "details"
  | "uploading"
  | "celebration";

type EventRow = { id: string; name: string; date: string; opponent: string | null };
type RosterRow = { id: string; player_name: string; jersey_number: string | null };
type MyClip = {
  id: string;
  file_url: string;
  content_type: string | null;
  broll_type: string | null;
  vibe: string | null;
  event_id: string | null;
  player_tags: string[] | null;
  flagged_for_trim_review: boolean | null;
  created_at: string;
};

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
    const colors = ["var(--color-accent)", "var(--color-accent)", "#1F6E3A", "var(--color-muted-foreground)", "var(--color-foreground)", "#ffffff"];
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
  const [team, setTeam] = useState<{ id: string; name: string; sport: string; season_year?: number | null; compile_locked?: boolean } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [poolCount, setPoolCount] = useState(0);
  const [prevPoolCount, setPrevPoolCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);
  const [addedToday, setAddedToday] = useState(0);

  const [tag, setTag] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<string>("");
  const [fileUrl, setFileUrl] = useState<string>("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [clipKind, setClipKind] = useState<"play" | "broll" | null>(null);
  const [brollType, setBrollType] = useState<string | null>(null);
  const [vibe, setVibe] = useState<string | null>(null);
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [flaggedTrim, setFlaggedTrim] = useState(false);

  const [phase, setPhase] = useState<Phase>("upload");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Starting...");
  const [recording, setRecording] = useState(false);
  const [supportsRecorder, setSupportsRecorder] = useState(true);
  const [myClipIds, setMyClipIds] = useState<string[]>([]);
  const [myClips, setMyClips] = useState<MyClip[]>([]);
  const [detailClipId, setDetailClipId] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<"preview" | "edit" | "trim">("preview");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = typeof window.MediaRecorder !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia;
    setSupportsRecorder(ok);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase
        .from("teams")
        .select("id,name,sport,season_year,compile_locked")
        .eq("upload_slug", slug)
        .maybeSingle();
      if (!t) { setNotFound(true); return; }
      setTeam(t as any);
      const [{ count }, { data: ev }, { data: rs }] = await Promise.all([
        supabase.from("clips").select("id", { count: "exact", head: true }).eq("team_id", t.id),
        supabase.from("schedule_events").select("id,name,date,opponent").eq("team_id", t.id).order("date", { ascending: false }),
        supabase.from("roster").select("id,player_name,jersey_number").eq("team_id", t.id).eq("status", "active").order("player_name"),
      ]);
      const c = count || 0;
      setPoolCount(c);
      setPrevPoolCount(c);
      setDisplayCount(c);
      setEvents((ev as EventRow[]) ?? []);
      setRoster((rs as RosterRow[]) ?? []);
    })();
    if (typeof window !== "undefined") {
      const key = `keeper_added_${slug}_${new Date().toDateString()}`;
      setAddedToday(parseInt(window.localStorage.getItem(key) || "0", 10));
      try {
        const raw = window.localStorage.getItem(`keeper_my_clips_${slug}`);
        const ids = raw ? (JSON.parse(raw) as string[]) : [];
        setMyClipIds(ids);
      } catch { /* ignore */ }
    }
  }, [slug]);

  // Fetch this contributor's clips whenever the id list changes
  useEffect(() => {
    if (!team) return;
    if (myClipIds.length === 0) { setMyClips([]); return; }
    (async () => {
      const { data } = await supabase
        .from("clips")
        .select("id,file_url,content_type,broll_type,vibe,event_id,player_tags,flagged_for_trim_review,created_at")
        .in("id", myClipIds)
        .order("created_at", { ascending: false });
      setMyClips((data as MyClip[]) ?? []);
    })();
  }, [team, myClipIds]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => { if (fileUrl) URL.revokeObjectURL(fileUrl); };
  }, [fileUrl]);

  const onFile = (f: File | null) => {
    if (fileUrl) { URL.revokeObjectURL(fileUrl); setFileUrl(""); }
    setFile(f);
    setDuration("");
    if (!f) return;
    const url = URL.createObjectURL(f);
    setFileUrl(url);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const d = v.duration;
      const m = Math.floor(d / 60);
      const s = Math.floor(d % 60);
      setDuration(`${m}:${s.toString().padStart(2, "0")}`);
    };
    v.src = url;
    // Suggest nearest event by file modified date
    const ts = f.lastModified || Date.now();
    if (events.length) {
      let best = events[0];
      let bestDiff = Infinity;
      for (const e of events) {
        const diff = Math.abs(new Date(e.date).getTime() - ts);
        if (diff < bestDiff) { bestDiff = diff; best = e; }
      }
      setEventId(best.id);
    } else {
      setEventId(null);
    }
    setPhase("preview");
  };

  const resetFlow = () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl("");
    setFile(null);
    setTag("");
    setDuration("");
    setClipKind(null);
    setBrollType(null);
    setVibe(null);
    setPlayerIds([]);
    setEventId(null);
    setFlaggedTrim(false);
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
      const { data: inserted } = await supabase.from("clips").insert({
        team_id: team.id,
        file_url: pub.publicUrl,
        content_type: clipKind ?? "play",
        broll_type: clipKind === "broll" ? brollType : null,
        vibe: vibe,
        event_id: eventId,
        player_tags: playerIds,
        flagged_for_trim_review: flaggedTrim,
        note: tag || null,
      }).select("id").single();
      if (inserted?.id && typeof window !== "undefined") {
        const next = [inserted.id, ...myClipIds];
        setMyClipIds(next);
        window.localStorage.setItem(`keeper_my_clips_${slug}`, JSON.stringify(next));
      }
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
        resetFlow();
        toast.success("Clip added!", { duration: 1500 });
      }
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
      setPhase("details");
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
      <div className="relative min-h-screen overflow-hidden" style={{ background: "var(--color-background)" }}>
        <Toaster />
        <Confetti />
        <div className="relative z-20 mx-auto flex min-h-screen max-w-[390px] flex-col items-center justify-center px-6 py-10">
          <Wave />
          <h1 className="mt-8 text-center text-4xl" style={{ color: "var(--color-accent)" }}>You're in the pool!</h1>
          <p className="mt-2 text-center text-sm" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {team.name} · {team.season_year ?? new Date().getFullYear()}
          </p>
          <div className="mt-8 w-full rounded-xl border p-5 text-center" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
            <div className="text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Clips in the pool
            </div>
            <div className="mt-3 flex justify-center">
              <DotMatrixNumber value={displayCount} scale={2} radius={4} gap={9} />
            </div>
          </div>
          <p className="mt-4 text-sm" style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>
            You've added <span style={{ color: "var(--color-accent)" }}>{addedToday}</span> clip{addedToday === 1 ? "" : "s"} today
          </p>
          <div className="mt-8 w-full space-y-3">
            <button
              onClick={() => { setPhase("upload"); setFile(null); setTag(""); setDuration(""); }}
              className="w-full rounded-xl py-4 text-base"
              style={{ background: "var(--color-accent)", color: "var(--color-accent-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              + Add another clip
            </button>
            <button
              onClick={() => { if (typeof window !== "undefined") window.close(); }}
              className="w-full rounded-xl border-2 py-4 text-base"
              style={{ borderColor: "var(--color-border)", color: "var(--color-muted-foreground)", background: "transparent", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
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
      <div className="min-h-screen" style={{ background: "var(--color-background)" }}>
        <div className="sticky top-0 z-30 flex items-start gap-2 px-4 py-3" style={{ background: "var(--color-accent)", color: "var(--color-accent-foreground)" }}>
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, textTransform: "none", letterSpacing: "normal" }}>
            Keep this window open until the upload is complete or your clip won't be saved.
          </p>
        </div>
        <div className="mx-auto max-w-[390px] px-6 py-8">
          <h1 className="text-3xl" style={{ color: "var(--color-accent)" }}>{team.name}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Uploading your clip
          </p>

          {file && (
            <div className="mt-6 rounded-xl border p-4" style={{ background: "var(--color-secondary)", borderColor: "var(--color-border)" }}>
              <p className="truncate text-sm" style={{ color: "var(--color-foreground)", fontFamily: "'Inter', sans-serif", textTransform: "none", letterSpacing: "normal" }}>{file.name}</p>
              <div className="mt-1 flex justify-between text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                <span>{tag || "Untagged"}</span>
                <span>{formatSize(file.size)}</span>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="flex justify-between text-xs" style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              <span style={{ color: "var(--color-muted-foreground)" }}>Uploading</span>
              <span style={{ color: "var(--color-accent)" }}>{Math.floor(progress)}%</span>
            </div>
            <div className="mt-2 h-[7px] w-full overflow-hidden rounded-full" style={{ background: "var(--color-border)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "var(--color-accent)" }} />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Inter', sans-serif", textTransform: "none", letterSpacing: "normal" }}>
              <span className="inline-block h-2 w-2 animate-pulse rounded-full" style={{ background: "var(--color-accent)" }} />
              {statusText}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // UPLOAD (Screen 1)
  return (
    <div className="min-h-screen" style={{ background: "var(--color-background)" }}>
      <Toaster />
      {(phase === "preview" || phase === "trim") && file && fileUrl && (
        <ClipPreviewOverlay
          fileUrl={fileUrl}
          mode={phase}
          onConfirmClip={() => setPhase("trim")}
          onChangeClip={() => { resetFlow(); setPhase("upload"); }}
          onTrimGood={() => { setFlaggedTrim(false); setPhase("event"); }}
          onTrimFlag={() => { setFlaggedTrim(true); setPhase("event"); toast.message("Flagged — admin will review the original clip."); }}
        />
      )}
      <div className="mx-auto flex min-h-screen max-w-[390px] flex-col pb-[180px]">
        {/* Header */}
        <div className="px-5 pt-6 pb-4" style={{ background: "var(--color-background)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "var(--color-accent)" }}>
                <Play className="h-4 w-4" style={{ color: "white", fill: "white" }} />
              </div>
              <span className="text-xl" style={{ color: "var(--color-accent)" }}>Keeper</span>
            </div>
          </div>
          <Card className="mt-4 border-2 p-4 shadow-md" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
            <p className="text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>Team</p>
            <p className="text-2xl" style={{ color: "var(--color-accent)" }}>{team.name}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Season {team.season_year ?? new Date().getFullYear()}
            </p>
          </Card>
        </div>

        {/* Counter strip */}
        <div className="mx-5 flex items-center justify-center rounded-xl px-4 py-3 shadow-md" style={{ background: "var(--color-card)", border: "1.5px solid var(--color-border)" }}>
          <div
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "12px 16px 10px",
              background: "var(--color-background)",
              border: "2px solid var(--color-border)",
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                color: "var(--color-muted-foreground)",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontSize: "11px",
                textAlign: "center",
                marginBottom: "6px",
              }}
            >
              Your Clips in Pool
            </div>
            <DotMatrixNumber
              value={myClips.length}
              dotRadius={4.5}
              gap={10.5}
              minDigits={3}
              litColor="var(--color-foreground)"
              offColor="var(--color-border)"
            />
          </div>
        </div>

        <div className="px-5">
          <YourContributions
            clips={myClips}
            events={events}
            roster={roster}
            locked={!!team.compile_locked}
            onOpen={(id) => { setDetailClipId(id); setDetailMode("preview"); }}
          />
        </div>

        {phase === "upload" && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[390px] px-5 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.25)]"
          style={{ background: "var(--color-background)", borderTop: "1px solid var(--color-border)" }}
        >
            <div className="space-y-3">
              {supportsRecorder ? (
                <button
                  type="button"
                  onClick={() => setRecording(true)}
                  className="flex w-full cursor-pointer flex-col items-center justify-center gap-1 py-4 text-center shadow-md"
                  style={{ background: "var(--color-accent)", border: "2px solid var(--color-accent)", borderRadius: "10px" }}
                >
                  <Video className="h-6 w-6" style={{ color: "var(--color-accent-foreground)" }} />
                  <span className="text-sm" style={{ color: "var(--color-accent-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Record a clip
                  </span>
                </button>
              ) : (
                <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-1 py-4 text-center shadow-md"
                  style={{ background: "var(--color-accent)", border: "2px solid var(--color-accent)", borderRadius: "10px" }}>
                  <Video className="h-6 w-6" style={{ color: "var(--color-accent-foreground)" }} />
                  <span className="text-sm" style={{ color: "var(--color-accent-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Record a clip
                  </span>
                  <input type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
                </label>
              )}
              <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-1 py-4 text-center"
                style={{ background: "var(--color-card)", border: "2px solid var(--color-border)", borderRadius: "10px" }}>
                <ImageIcon className="h-6 w-6" style={{ color: "var(--color-accent)" }} />
                <span className="text-sm" style={{ color: "var(--color-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Choose from library
                </span>
                <input type="file" accept="video/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
        </div>
        )}

        {phase === "event" && (
          <StepEvent
            events={events}
            eventId={eventId}
            onChange={setEventId}
            onBack={() => setPhase("trim")}
            onNext={() => setPhase("kind")}
          />
        )}

        {phase === "kind" && (
          <StepKind
            onBack={() => setPhase("event")}
            onSelect={(k) => { setClipKind(k); setBrollType(null); setVibe(null); setPhase("details"); }}
          />
        )}

        {phase === "details" && clipKind && (
          <StepDetails
            kind={clipKind}
            roster={roster}
            playerIds={playerIds}
            setPlayerIds={setPlayerIds}
            brollType={brollType}
            setBrollType={setBrollType}
            vibe={vibe}
            setVibe={setVibe}
            teamName={team.name}
            onBack={() => setPhase("kind")}
            onSubmit={submit}
            canSubmit={Boolean(vibe) && (clipKind === "play" ? true : Boolean(brollType))}
          />
        )}
      </div>
      {recording && (
        <Recorder
          onCancel={() => setRecording(false)}
          onComplete={(f) => { setRecording(false); onFile(f); }}
        />
      )}
      {detailClipId && (() => {
        const clip = myClips.find((c) => c.id === detailClipId);
        if (!clip) return null;
        return (
          <ClipDetailOverlay
            clip={clip}
            mode={detailMode}
            setMode={setDetailMode}
            events={events}
            roster={roster}
            locked={!!team.compile_locked}
            onClose={() => setDetailClipId(null)}
            onSaved={(updated) => {
              setMyClips((prev) => prev.map((c) => c.id === updated.id ? { ...c, ...updated } : c));
            }}
          />
        );
      })()}
    </div>
  );
}

/* ---------- Step components ---------- */

function ClipPreviewOverlay({
  fileUrl, mode, onConfirmClip, onChangeClip, onTrimGood, onTrimFlag,
}: {
  fileUrl: string;
  mode: "preview" | "trim";
  onConfirmClip: () => void;
  onChangeClip: () => void;
  onTrimGood: () => void;
  onTrimFlag: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#000" }}>
      <video
        key={mode}
        src={fileUrl}
        className="absolute inset-0 h-full w-full object-contain"
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center px-5 pt-6 pb-3" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.65), transparent)" }}>
        <span className="text-xs" style={{ color: "var(--color-accent)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          {mode === "preview" ? "Preview your clip" : "We trimmed your clip to the key moment"}
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 z-10 space-y-3 px-5 pb-8 pt-10" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.75), transparent)" }}>
        {mode === "preview" ? (
          <>
            <button
              onClick={onConfirmClip}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base"
              style={{ background: "var(--color-accent)", color: "var(--color-accent-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              <Check className="h-5 w-5" /> This is the right clip
            </button>
            <button
              onClick={onChangeClip}
              className="w-full rounded-xl border-2 py-4 text-base"
              style={{ borderColor: "var(--color-border)", color: "var(--color-foreground)", background: "transparent", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              Choose a different clip
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onTrimGood}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base"
              style={{ background: "var(--color-accent)", color: "var(--color-accent-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              <Check className="h-5 w-5" /> Looks good
            </button>
            <button
              onClick={onTrimFlag}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 py-4 text-base"
              style={{ borderColor: "var(--color-border)", color: "var(--color-foreground)", background: "transparent", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              <Flag className="h-5 w-5" /> Flag for review
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StepHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 px-5 pt-6">
      <button onClick={onBack} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "var(--color-secondary)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}>
        <ArrowLeft className="h-4 w-4" />
      </button>
      <h2 className="text-lg" style={{ color: "var(--color-accent)" }}>{title}</h2>
    </div>
  );
}

function PrimaryBtn({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl py-4 text-base disabled:opacity-50"
      style={{ background: "var(--color-accent)", color: "var(--color-accent-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
    >
      {children}
    </button>
  );
}

function StepEvent({ events, eventId, onChange, onBack, onNext }: {
  events: EventRow[]; eventId: string | null; onChange: (id: string | null) => void; onBack: () => void; onNext: () => void;
}) {
  return (
    <div>
      <StepHeader title="Which game or event?" onBack={onBack} />
      <p className="px-5 pt-2 text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Inter', sans-serif" }}>
        We picked the closest match based on when this clip was recorded. Change it if needed.
      </p>
      <div className="px-5 pt-4 space-y-2">
        {events.length === 0 && (
          <p className="text-sm" style={{ color: "var(--color-foreground)" }}>No events on the schedule yet.</p>
        )}
        {events.map((e) => {
          const on = eventId === e.id;
          return (
            <button
              key={e.id}
              onClick={() => onChange(on ? null : e.id)}
              className="flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left"
              style={{
                background: on ? "var(--color-accent)" : "var(--color-secondary)",
                borderColor: on ? "var(--color-accent)" : "var(--color-border)",
                color: on ? "var(--color-accent-foreground)" : "var(--color-foreground)",
              }}
            >
              <div>
                <div className="text-sm" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {e.name}{e.opponent ? ` vs ${e.opponent}` : ""}
                </div>
                <div className="text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {new Date(e.date).toLocaleDateString()}
                </div>
              </div>
              {on && <Check className="h-5 w-5" />}
            </button>
          );
        })}
      </div>
      <div className="px-5 pt-6 pb-6">
        <PrimaryBtn onClick={onNext}>Continue ▶</PrimaryBtn>
      </div>
    </div>
  );
}

function StepKind({ onBack, onSelect }: { onBack: () => void; onSelect: (k: "play" | "broll") => void }) {
  return (
    <div>
      <StepHeader title="What's in this clip?" onBack={onBack} />
      <div className="px-5 pt-4 space-y-3">
        <button
          onClick={() => onSelect("play")}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-xl py-8"
          style={{ background: "var(--color-card)", border: "2px solid var(--color-border)" }}
        >
          <Play className="h-7 w-7" style={{ color: "var(--color-accent)" }} />
          <span className="text-base" style={{ color: "var(--color-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>A play</span>
          <span className="text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Inter', sans-serif" }}>A goal, save, or in-game moment</span>
        </button>
        <button
          onClick={() => onSelect("broll")}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-xl py-8"
          style={{ background: "var(--color-card)", border: "2px dashed var(--color-border)" }}
        >
          <Video className="h-7 w-7" style={{ color: "var(--color-accent)" }} />
          <span className="text-base" style={{ color: "var(--color-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>B-roll</span>
          <span className="text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Inter', sans-serif" }}>Sideline, fans, BTS, practice</span>
        </button>
      </div>
    </div>
  );
}

function StepDetails({
  kind, roster, playerIds, setPlayerIds, brollType, setBrollType, vibe, setVibe, teamName, onBack, onSubmit, canSubmit,
}: {
  kind: "play" | "broll";
  roster: RosterRow[];
  playerIds: string[];
  setPlayerIds: (v: string[]) => void;
  brollType: string | null;
  setBrollType: (v: string | null) => void;
  vibe: string | null;
  setVibe: (v: string | null) => void;
  teamName: string;
  onBack: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
}) {
  const vibes = kind === "play" ? PLAY_VIBES : BROLL_VIBES;
  const togglePlayer = (id: string) =>
    setPlayerIds(playerIds.includes(id) ? playerIds.filter((x) => x !== id) : [...playerIds, id]);
  return (
    <div>
      <StepHeader title={kind === "play" ? "Play details" : "B-roll details"} onBack={onBack} />

      {kind === "broll" && (
        <div className="px-5 pt-4">
          <p className="text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Type</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {BROLL_TYPES.map((t) => {
              const on = brollType === t;
              return (
                <button
                  key={t}
                  onClick={() => setBrollType(on ? null : t)}
                  className="rounded-xl border-2 px-3 py-3 text-sm"
                  style={{
                    background: on ? "var(--color-accent)" : "var(--color-secondary)",
                    borderColor: on ? "var(--color-accent)" : "var(--color-border)",
                    color: on ? "var(--color-accent-foreground)" : "var(--color-foreground)",
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {kind === "play" && (
        <div className="px-5 pt-4">
          <p className="text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Tag players with significant contribution</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {roster.length === 0 && (
              <p className="text-sm" style={{ color: "var(--color-foreground)" }}>No active roster yet.</p>
            )}
            {roster.map((p) => {
              const on = playerIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePlayer(p.id)}
                  className="rounded-full border-2 px-3 py-1.5 text-xs"
                  style={{
                    background: on ? "var(--color-accent)" : "var(--color-secondary)",
                    borderColor: on ? "var(--color-accent)" : "var(--color-border)",
                    color: on ? "var(--color-accent-foreground)" : "var(--color-foreground)",
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                  }}
                >
                  {p.jersey_number ? `#${p.jersey_number} ` : ""}{p.player_name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-5 pt-5">
        <p className="text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Vibe</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {vibes.map((v) => {
            const on = vibe === v;
            return (
              <button
                key={v}
                onClick={() => setVibe(on ? null : v)}
                className="rounded-xl border-2 px-3 py-3 text-sm"
                style={{
                  background: on ? "var(--color-accent)" : "var(--color-secondary)",
                  borderColor: on ? "var(--color-accent)" : "var(--color-border)",
                  color: on ? "var(--color-accent-foreground)" : "var(--color-foreground)",
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                }}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 pt-6 pb-6">
        <PrimaryBtn onClick={onSubmit} disabled={!canSubmit}>Submit to Pool ▶</PrimaryBtn>
        <p className="mt-3 text-center text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Inter', sans-serif" }}>
          Goes straight to the {teamName} pool · No account needed
        </p>
      </div>
    </div>
  );
}

function Recorder({ onCancel, onComplete }: { onCancel: () => void; onComplete: (f: File) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: true,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch {
        setError("Camera access is needed to record. Please allow camera access and try again.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  const start = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeCandidates = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    const mime = mimeCandidates.find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) || "";
    const mr = mime ? new MediaRecorder(streamRef.current, { mimeType: mime }) : new MediaRecorder(streamRef.current);
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const type = mr.mimeType || "video/webm";
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunksRef.current, { type });
      const file = new File([blob], `keeper-clip-${Date.now()}.${ext}`, { type });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onComplete(file);
    };
    recorderRef.current = mr;
    mr.start();
    setElapsed(0);
    setIsRecording(true);
  };

  const stop = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#000" }}>
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
      <button
        onClick={() => { recorderRef.current?.state === "recording" && recorderRef.current.stop(); streamRef.current?.getTracks().forEach((t) => t.stop()); onCancel(); }}
        className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full"
        style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}
        aria-label="Cancel"
      >
        <X className="h-5 w-5" />
      </button>
      {isRecording && (
        <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full px-3 py-1 text-sm"
          style={{ background: "rgba(0,0,0,0.6)", color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em" }}>
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full" style={{ background: "#ef4444" }} />
          {mm}:{ss}
        </div>
      )}
      {error && (
        <div className="absolute inset-x-6 top-1/2 z-10 -translate-y-1/2 rounded-xl p-4 text-center" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}>
          {error}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-10 z-10 flex justify-center">
        <button
          onClick={isRecording ? stop : start}
          disabled={!!error}
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.2)", border: "4px solid #fff" }}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          <span
            className="block transition-all"
            style={{
              background: "#ef4444",
              width: isRecording ? "26px" : "56px",
              height: isRecording ? "26px" : "56px",
              borderRadius: isRecording ? "4px" : "9999px",
            }}
          />
        </button>
      </div>
    </div>
  );
}

/* ---------- Your contributions ---------- */

function VideoThumb({ url }: { url: string }) {
  return (
    <video
      src={url}
      className="absolute inset-0 h-full w-full object-cover"
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={(e) => { try { (e.currentTarget as HTMLVideoElement).currentTime = 0.1; } catch { /* ignore */ } }}
    />
  );
}

function YourContributions({
  clips, events, roster, locked, onOpen,
}: {
  clips: MyClip[];
  events: EventRow[];
  roster: RosterRow[];
  locked: boolean;
  onOpen: (id: string) => void;
}) {
  const eventName = (id: string | null) => events.find((e) => e.id === id)?.name ?? "Unassigned";
  const playerLabel = (ids: string[] | null) => {
    if (!ids || ids.length === 0) return null;
    const names = ids
      .map((i) => roster.find((r) => r.id === i)?.player_name)
      .filter(Boolean) as string[];
    if (names.length === 0) return null;
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  };
  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Your contributions
        </p>
        {locked && (
          <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--color-accent)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            <Lock className="h-3 w-3" /> Compile locked
          </span>
        )}
      </div>

      {clips.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center" style={{ background: "var(--color-card)", border: "1px dashed var(--color-border)" }}>
          <p className="text-sm" style={{ color: "var(--color-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            No clips yet — be the first to contribute
          </p>
        </div>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5 pb-2">
          <div className="flex gap-3" style={{ width: "max-content" }}>
            {clips.map((c) => {
              const tags: string[] = [];
              if (c.vibe) tags.push(c.vibe);
              if (c.content_type) tags.push(c.content_type === "broll" ? (c.broll_type ?? "B-roll") : "Play");
              const players = playerLabel(c.player_tags);
              if (players) tags.push(players);
              return (
                <button
                  key={c.id}
                  onClick={() => onOpen(c.id)}
                  className="flex w-[180px] shrink-0 flex-col overflow-hidden rounded-xl text-left"
                  style={{ background: "var(--color-card)", border: "1.5px solid var(--color-border)" }}
                >
                  <div className="relative aspect-video w-full overflow-hidden" style={{ background: "#000" }}>
                    <VideoThumb url={c.file_url} />
                    {locked && (
                      <div className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,0.65)", color: "var(--color-accent)" }}>
                        <Lock className="h-3 w-3" />
                      </div>
                    )}
                    {c.flagged_for_trim_review && (
                      <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px]" style={{ background: "rgba(0,0,0,0.65)", color: "var(--color-accent)", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        <Flag className="h-2.5 w-2.5" /> Flagged
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-xs" style={{ color: "var(--color-accent)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {eventName(c.event_id)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {tags.map((t, i) => (
                        <span key={i} className="rounded-full px-1.5 py-0.5 text-[9px]" style={{ background: "var(--color-secondary)", color: "var(--color-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", border: "1px solid var(--color-border)" }}>
                          {t}
                        </span>
                      ))}
                      {tags.length === 0 && (
                        <span className="text-[10px]" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Inter', sans-serif" }}>No tags</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ClipDetailOverlay({
  clip, mode, setMode, events, roster, locked, onClose, onSaved,
}: {
  clip: MyClip;
  mode: "preview" | "edit" | "trim";
  setMode: (m: "preview" | "edit" | "trim") => void;
  events: EventRow[];
  roster: RosterRow[];
  locked: boolean;
  onClose: () => void;
  onSaved: (c: Partial<MyClip> & { id: string }) => void;
}) {
  const [vibe, setVibe] = useState<string | null>(clip.vibe);
  const [contentType, setContentType] = useState<string>(clip.content_type ?? "play");
  const [brollType, setBrollType] = useState<string | null>(clip.broll_type);
  const [eventId, setEventId] = useState<string | null>(clip.event_id);
  const [playerIds, setPlayerIds] = useState<string[]>(clip.player_tags ?? []);
  const [flagged, setFlagged] = useState<boolean>(!!clip.flagged_for_trim_review);
  const [saving, setSaving] = useState(false);

  const vibes = contentType === "play" ? PLAY_VIBES : BROLL_VIBES;
  const togglePlayer = (id: string) =>
    setPlayerIds(playerIds.includes(id) ? playerIds.filter((x) => x !== id) : [...playerIds, id]);

  const save = async () => {
    setSaving(true);
    const patch = {
      vibe,
      content_type: contentType,
      broll_type: contentType === "broll" ? brollType : null,
      event_id: eventId,
      player_tags: playerIds,
    };
    const { error } = await supabase.from("clips").update(patch).eq("id", clip.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onSaved({ id: clip.id, ...patch });
    toast.success("Tags updated");
    setMode("preview");
  };

  const flagTrim = async () => {
    const { error } = await supabase.from("clips").update({ flagged_for_trim_review: true }).eq("id", clip.id);
    if (error) { toast.error(error.message); return; }
    setFlagged(true);
    onSaved({ id: clip.id, flagged_for_trim_review: true });
    toast.message("Flagged for admin review.");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--color-background)" }}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "var(--color-secondary)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}>
          <X className="h-4 w-4" />
        </button>
        {locked && (
          <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--color-accent)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            <Lock className="h-3 w-3" /> Locked for compile
          </span>
        )}
      </div>

      <div className="mx-5 overflow-hidden rounded-xl" style={{ background: "#000", aspectRatio: "16 / 9" }}>
        <video src={clip.file_url} className="h-full w-full object-contain" autoPlay loop muted playsInline />
      </div>

      <div className="mt-4 flex gap-2 px-5">
        <button
          onClick={() => setMode("preview")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-xs"
          style={{ background: mode === "preview" ? "var(--color-accent)" : "transparent", borderColor: mode === "preview" ? "var(--color-accent)" : "var(--color-border)", color: mode === "preview" ? "var(--color-accent-foreground)" : "var(--color-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          <Play className="h-3.5 w-3.5" /> Preview
        </button>
        <button
          onClick={() => !locked && setMode("edit")}
          disabled={locked}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-xs disabled:opacity-50"
          style={{ background: mode === "edit" ? "var(--color-accent)" : "transparent", borderColor: mode === "edit" ? "var(--color-accent)" : "var(--color-border)", color: mode === "edit" ? "var(--color-accent-foreground)" : "var(--color-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          <Pencil className="h-3.5 w-3.5" /> Edit tags
        </button>
        <button
          onClick={() => setMode("trim")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-xs"
          style={{ background: mode === "trim" ? "var(--color-accent)" : "transparent", borderColor: mode === "trim" ? "var(--color-accent)" : "var(--color-border)", color: mode === "trim" ? "var(--color-accent-foreground)" : "var(--color-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          <Scissors className="h-3.5 w-3.5" /> View trim
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
        {mode === "preview" && (
          <div className="space-y-2 text-sm" style={{ color: "var(--color-foreground)", fontFamily: "'Inter', sans-serif" }}>
            <p><span style={{ color: "var(--color-muted-foreground)" }}>Event:</span> {events.find((e) => e.id === clip.event_id)?.name ?? "Unassigned"}</p>
            <p><span style={{ color: "var(--color-muted-foreground)" }}>Type:</span> {clip.content_type === "broll" ? (clip.broll_type ?? "B-roll") : "Play"}</p>
            <p><span style={{ color: "var(--color-muted-foreground)" }}>Vibe:</span> {clip.vibe ?? "—"}</p>
            {clip.player_tags && clip.player_tags.length > 0 && (
              <p><span style={{ color: "var(--color-muted-foreground)" }}>Players:</span> {clip.player_tags.map((id) => roster.find((r) => r.id === id)?.player_name).filter(Boolean).join(", ")}</p>
            )}
          </div>
        )}

        {mode === "edit" && !locked && (
          <div className="space-y-5">
            <div>
              <p className="text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Event</p>
              <div className="mt-2 space-y-2">
                {events.map((e) => {
                  const on = eventId === e.id;
                  return (
                    <button key={e.id} onClick={() => setEventId(on ? null : e.id)}
                      className="flex w-full items-center justify-between rounded-xl border-2 px-3 py-2.5 text-left text-sm"
                      style={{ background: on ? "var(--color-accent)" : "var(--color-secondary)", borderColor: on ? "var(--color-accent)" : "var(--color-border)", color: on ? "var(--color-accent-foreground)" : "var(--color-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      <span>{e.name}</span>
                      {on && <Check className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Content type</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["play", "broll"] as const).map((k) => {
                  const on = contentType === k;
                  return (
                    <button key={k} onClick={() => setContentType(k)}
                      className="rounded-xl border-2 py-2.5 text-sm"
                      style={{ background: on ? "var(--color-accent)" : "var(--color-secondary)", borderColor: on ? "var(--color-accent)" : "var(--color-border)", color: on ? "var(--color-accent-foreground)" : "var(--color-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      {k === "play" ? "Play" : "B-roll"}
                    </button>
                  );
                })}
              </div>
            </div>
            {contentType === "broll" && (
              <div>
                <p className="text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>B-roll type</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {BROLL_TYPES.map((t) => {
                    const on = brollType === t;
                    return (
                      <button key={t} onClick={() => setBrollType(on ? null : t)}
                        className="rounded-xl border-2 py-2.5 text-sm"
                        style={{ background: on ? "var(--color-accent)" : "var(--color-secondary)", borderColor: on ? "var(--color-accent)" : "var(--color-border)", color: on ? "var(--color-accent-foreground)" : "var(--color-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {contentType === "play" && (
              <div>
                <p className="text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Players</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {roster.length === 0 && <p className="text-sm" style={{ color: "var(--color-foreground)" }}>No active roster.</p>}
                  {roster.map((p) => {
                    const on = playerIds.includes(p.id);
                    return (
                      <button key={p.id} onClick={() => togglePlayer(p.id)}
                        className="rounded-full border-2 px-3 py-1.5 text-xs"
                        style={{ background: on ? "var(--color-accent)" : "var(--color-secondary)", borderColor: on ? "var(--color-accent)" : "var(--color-border)", color: on ? "var(--color-accent-foreground)" : "var(--color-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        {p.jersey_number ? `#${p.jersey_number} ` : ""}{p.player_name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Vibe</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {vibes.map((v) => {
                  const on = vibe === v;
                  return (
                    <button key={v} onClick={() => setVibe(on ? null : v)}
                      className="rounded-xl border-2 py-2.5 text-sm"
                      style={{ background: on ? "var(--color-accent)" : "var(--color-secondary)", borderColor: on ? "var(--color-accent)" : "var(--color-border)", color: on ? "var(--color-accent-foreground)" : "var(--color-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
            <PrimaryBtn onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</PrimaryBtn>
          </div>
        )}

        {mode === "edit" && locked && (
          <p className="text-sm" style={{ color: "var(--color-foreground)" }}>This clip is locked because the admin started a compile. Tags can no longer be edited.</p>
        )}

        {mode === "trim" && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              AI trimmed version
            </p>
            <p className="text-sm" style={{ color: "var(--color-foreground)", fontFamily: "'Inter', sans-serif" }}>
              {flagged ? "You've already flagged this clip for review." : "We trimmed your clip to the key moment. Confirm or flag for review."}
            </p>
            {!flagged && (
              <div className="flex gap-2">
                <button onClick={() => { setFlagged(true); toast.success("Trim confirmed"); }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm"
                  style={{ background: "var(--color-accent)", color: "var(--color-accent-foreground)", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  <Check className="h-4 w-4" /> Looks good
                </button>
                <button onClick={flagTrim}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-foreground)", background: "transparent", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  <Flag className="h-4 w-4" /> Flag for review
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
