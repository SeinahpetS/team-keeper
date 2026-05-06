import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Trophy, Send, ArrowLeft, Sparkles, Check, X, Film, Share2 } from "lucide-react";

export const Route = createFileRoute("/recap")({
  component: RecapFlow,
});

const MAX_RENDERS = 10;

type Recap = {
  id: string;
  video_url: string | null;
  status: string;
  mix_individual: number;
  mix_team_broll: number;
  mix_fan: number;
  mix_full_game: number;
  render_count: number;
  recap_type: string;
  social_video_url: string | null;
  social_status: string;
};
type Clip = { id: string; file_url: string; content_type: string; broll_type: string | null; uploader_name: string | null; vibe: string | null; approval_status: string };

function RecapFlow() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<{ id: string; name: string; upload_slug: string } | null>(null);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
    if (!user) return;
    (async () => {
      const { data: t } = await supabase.from("teams").select("id,name,upload_slug").eq("admin_id", user.id).maybeSingle();
      if (!t) return;
      setTeam(t);
      let { data: r } = await supabase.from("recaps").select("*").eq("team_id", t.id).maybeSingle();
      if (!r) {
        const { data: created } = await supabase.from("recaps").insert({ team_id: t.id, status: "draft" }).select().single();
        r = created;
      }
      setRecap(r as any);
      const { data: c } = await supabase.from("clips").select("id,file_url,content_type,broll_type,uploader_name,vibe,approval_status").eq("team_id", t.id);
      setClips(c || []);
    })();
  }, [user, loading, navigate]);

  if (!recap || !team) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;

  const updateRecap = async (patch: Partial<Recap>) => {
    setRecap({ ...recap, ...patch });
    await supabase.from("recaps").update(patch).eq("id", recap.id);
  };

  const setMix = async (key: "mix_individual" | "mix_team_broll" | "mix_fan" | "mix_full_game", val: number) => {
    // proportionally rescale others so total = 100
    const others: ("mix_individual" | "mix_team_broll" | "mix_fan" | "mix_full_game")[] = (
      ["mix_individual", "mix_team_broll", "mix_fan", "mix_full_game"] as const
    ).filter((k) => k !== key);
    const rest = 100 - val;
    const sumOthers = others.reduce((s, k) => s + recap[k], 0) || 1;
    const next: any = { [key]: val };
    others.forEach((k) => { next[k] = Math.round((recap[k] / sumOthers) * rest); });
    // ensure exactly 100
    const total = next[key] + others.reduce((s, k) => s + next[k], 0);
    next[others[0]] += 100 - total;
    setRecap({ ...recap, ...next });
  };

  const saveMix = () => updateRecap({
    mix_individual: recap.mix_individual,
    mix_team_broll: recap.mix_team_broll,
    mix_fan: recap.mix_fan,
    mix_full_game: recap.mix_full_game,
  });

  const playClips = clips.filter((c) => c.content_type === "play");
  const brollClips = clips.filter((c) => c.content_type === "broll");
  const approvedCount = clips.filter((c) => c.approval_status === "approved").length;
  const estRuntimeSec = Math.max(15, approvedCount * 4);

  const setApproval = async (id: string, status: "approved" | "rejected" | "pending") => {
    setClips((cs) => cs.map((c) => c.id === id ? { ...c, approval_status: status } : c));
    await supabase.from("clips").update({ approval_status: status }).eq("id", id);
  };

  const renderPreview = async () => {
    if (recap.render_count >= MAX_RENDERS) { toast.error("Out of renders for this beta"); return; }
    setRendering(true);
    setTimeout(async () => {
      await updateRecap({
        render_count: recap.render_count + 1,
        status: "ready",
        video_url: recap.video_url || "https://www.w3schools.com/html/mov_bbb.mp4",
        social_status: "ready",
        social_video_url: recap.social_video_url || "https://www.w3schools.com/html/mov_bbb.mp4",
      });
      setRendering(false);
      setStep(3);
    }, 2500);
  };

  const sendToTeam = async () => {
    await updateRecap({ status: "sent" });
    await supabase.from("recaps").update({ sent_at: new Date().toISOString() }).eq("id", recap.id);
    setConfirmOpen(false);
    setSent(true);
  };

  if (sent) {
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/r/${team.upload_slug}`;
    return (
      <div className="flex min-h-screen items-center justify-center px-6" style={{ background: "var(--gradient-hero)" }}>
        <div className="text-center text-primary-foreground">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur"><Trophy className="h-12 w-12" /></div>
          <h1 className="mt-6 text-4xl font-bold">Recap sent! 🏆</h1>
          <p className="mt-3 text-lg opacity-90">Your team has been notified.</p>
          <div className="mt-8 rounded-xl bg-white/10 p-4 backdrop-blur">
            <div className="text-xs opacity-75">Shareable link</div>
            <div className="mt-1 break-all font-mono text-sm">{shareUrl}</div>
          </div>
          <Button variant="secondary" className="mt-6" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Copied!"); }}>Copy share link</Button>
          <div className="mt-4"><Link to="/dashboard" className="text-sm underline opacity-75">Back to dashboard</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-warm)" }}>
      <Toaster />
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
          <div className="text-xs text-muted-foreground">Renders used: <span className="font-semibold text-foreground">{recap.render_count} / {MAX_RENDERS}</span></div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <button key={s} onClick={() => setStep(s as any)} className={`h-2 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 1 && (
          <Card className="space-y-6 p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div>
              <h2 className="text-2xl font-bold">Set your mix</h2>
              <p className="mt-1 text-sm text-muted-foreground">Sliders auto-balance to 100%. We'll flag any category bigger than your clip pool.</p>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Recap type</div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { v: "tournament", l: "Tournament recap", d: "A specific tournament & nested games" },
                  { v: "season", l: "End of season recap", d: "The full season" },
                ] as const).map((t) => (
                  <button key={t.v} type="button" onClick={() => updateRecap({ recap_type: t.v })} className={`rounded-lg border-2 px-3 py-2 text-left text-sm ${recap.recap_type === t.v ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                    <div className="font-medium">{t.l}</div>
                    <div className="text-xs text-muted-foreground">{t.d}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              Every compile produces <span className="font-semibold text-foreground">two outputs</span>: a 3–5 min full-length recap and a free 60–90s social cut for Instagram & TikTok.
            </div>
            <MixSlider label="Individual plays" value={recap.mix_individual} available={playClips.length} onChange={(v) => setMix("mix_individual", v)} onCommit={saveMix} />
            <MixSlider label="Team b-roll" value={recap.mix_team_broll} available={brollClips.filter((c) => c.broll_type !== "fan_sideline").length} onChange={(v) => setMix("mix_team_broll", v)} onCommit={saveMix} />
            <MixSlider label="Fan footage" value={recap.mix_fan} available={brollClips.filter((c) => c.broll_type === "fan_sideline").length} onChange={(v) => setMix("mix_fan", v)} onCommit={saveMix} />
            <MixSlider label="Full game view" value={recap.mix_full_game} available={playClips.length} onChange={(v) => setMix("mix_full_game", v)} onCommit={saveMix} />
            <Button size="lg" className="w-full" onClick={() => setStep(2)}>Next: Approve clips</Button>
          </Card>
        )}

        {step === 2 && (
          <Card className="space-y-4 p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Approved clip pool</h2>
                <p className="mt-1 text-sm text-muted-foreground">Estimated runtime: ~{Math.floor(estRuntimeSec / 60)}m {estRuntimeSec % 60}s</p>
              </div>
              <div className="text-right text-sm"><span className="font-bold text-primary">{approvedCount}</span> / {clips.length} approved</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {clips.map((c) => (
                <Card key={c.id} className="overflow-hidden p-0">
                  <video src={c.file_url} className="aspect-video w-full bg-black object-cover" preload="metadata" />
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="rounded bg-muted px-2 py-0.5 capitalize">{c.content_type}{c.broll_type ? ` • ${c.broll_type.replace("_", " ")}` : ""}</span>
                      {c.vibe && <span className="text-muted-foreground">{c.vibe}</span>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant={c.approval_status === "approved" ? "default" : "outline"} className="flex-1" onClick={() => setApproval(c.id, "approved")}><Check className="h-3 w-3" /></Button>
                      <Button size="sm" variant={c.approval_status === "rejected" ? "destructive" : "outline"} className="flex-1" onClick={() => setApproval(c.id, "rejected")}><X className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
              {clips.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No clips yet.</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={renderPreview} disabled={rendering || approvedCount === 0} size="lg" style={{ background: "var(--gradient-hero)" }}>
                <Sparkles className="mr-2 h-4 w-4" />{rendering ? "Rendering..." : `Render preview (${MAX_RENDERS - recap.render_count} left)`}
              </Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="space-y-4 p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h2 className="text-2xl font-bold">Render preview</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium"><Film className="h-4 w-4 text-primary" />Full-length recap <span className="text-xs text-muted-foreground">3–5 min</span></div>
                {recap.video_url ? (
                  <video src={recap.video_url} controls className="aspect-video w-full rounded-lg bg-black" />
                ) : <div className="aspect-video w-full rounded-lg bg-muted" />}
                <div className="text-xs text-muted-foreground">Status: <span className="font-semibold text-foreground capitalize">{recap.status}</span></div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium"><Share2 className="h-4 w-4 text-accent-foreground" />Social cut <span className="text-xs text-muted-foreground">60–90s • free</span></div>
                {recap.social_video_url ? (
                  <video src={recap.social_video_url} controls className="aspect-video w-full rounded-lg bg-black" />
                ) : <div className="aspect-video w-full rounded-lg bg-muted" />}
                <div className="text-xs text-muted-foreground">Includes a tasteful Recap watermark for sharing.</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Renders used: {recap.render_count} / {MAX_RENDERS}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Adjust mix</Button>
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Re-approve clips</Button>
              <Button className="flex-1" size="lg" onClick={() => setStep(4)} style={{ background: "var(--gradient-hero)" }}>Looks good →</Button>
            </div>
          </Card>
        )}

        {step === 4 && (
          <Card className="space-y-4 p-6 text-center" style={{ boxShadow: "var(--shadow-soft)" }}>
            <Sparkles className="mx-auto h-10 w-10 text-primary" />
            <h2 className="text-2xl font-bold">Send to the team?</h2>
            <p className="text-sm text-muted-foreground">Everyone who contributed gets the recap. Make their day.</p>
            <Button size="lg" className="w-full" style={{ background: "var(--gradient-hero)" }} onClick={() => setConfirmOpen(true)}>
              <Send className="mr-2 h-4 w-4" />Send to Team 🎉
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setStep(3)}>Watch again</Button>
          </Card>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Your team is about to receive the recap</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Ready to make their day?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Not yet</Button>
            <Button onClick={sendToTeam} style={{ background: "var(--gradient-hero)" }}>Send it 🎉</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MixSlider({ label, value, available, onChange, onCommit }: { label: string; value: number; available: number; onChange: (v: number) => void; onCommit: () => void }) {
  const overshoot = available === 0 || value > available * 10; // heuristic
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <Label>{label}</Label>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{value}%</span>
          <span>• {available} clip{available === 1 ? "" : "s"} available</span>
        </div>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} onValueCommit={onCommit} min={0} max={100} step={5} />
      {overshoot && value > 0 && <p className="text-xs text-accent-foreground">Not enough clips to fill this category — consider lowering it.</p>}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="font-medium">{children}</div>;
}
