import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Upload, Video, PartyPopper, Check } from "lucide-react";

export const Route = createFileRoute("/u/$slug")({
  component: ContributorUpload,
});

const PLAY_VIBES = ["Celebration", "Hype", "Tough lesson", "Proud moment"];
const BROLL_VIBES = ["Team moment", "Funny", "Hype", "Celebration"];
const BROLL_TYPES = [
  { v: "team_sideline", l: "Team Sideline" },
  { v: "fan_sideline", l: "Fan Sideline" },
  { v: "team_bts", l: "Team BTS" },
  { v: "practice", l: "Practice" },
];

function ContributorUpload() {
  const { slug } = Route.useParams();
  const [team, setTeam] = useState<{ id: string; name: string; sport: string } | null>(null);
  const [events, setEvents] = useState<{ id: string; name: string; date: string }[]>([]);
  const [roster, setRoster] = useState<{ id: string; player_name: string; jersey_number: string | null }[]>([]);
  const [notFound, setNotFound] = useState(false);

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [eventId, setEventId] = useState<string>("");
  const [contentType, setContentType] = useState<"play" | "broll">("play");
  const [brollType, setBrollType] = useState<string>("");
  const [vibe, setVibe] = useState<string>("");
  const [taggedPlayers, setTaggedPlayers] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from("teams").select("id,name,sport").eq("upload_slug", slug).maybeSingle();
      if (!t) { setNotFound(true); return; }
      setTeam(t);
      const [{ data: ev }, { data: r }] = await Promise.all([
        supabase.from("schedule_events").select("id,name,date").eq("team_id", t.id).order("date"),
        supabase.from("roster").select("id,player_name,jersey_number").eq("team_id", t.id),
      ]);
      setEvents(ev || []);
      setRoster(r || []);
    })();
  }, [slug]);

  const reset = () => {
    setStep(1); setFile(null); setEventId(""); setContentType("play"); setBrollType("");
    setVibe(""); setTaggedPlayers([]); setDone(false);
  };

  const upload = async () => {
    if (!team || !file) return;
    setBusy(true);
    try {
      const path = `${team.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("clips").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("clips").getPublicUrl(path);
      const { error } = await supabase.from("clips").insert({
        team_id: team.id,
        event_id: eventId || null,
        uploader_name: name || null,
        file_url: pub.publicUrl,
        content_type: contentType,
        broll_type: contentType === "broll" ? brollType || null : null,
        vibe: vibe || null,
        player_tags: contentType === "play" ? taggedPlayers : [],
        permission_cleared: consent,
      });
      if (error) throw error;
      setDone(true);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  if (notFound) return <div className="flex min-h-screen items-center justify-center px-6 text-center"><div><h1 className="text-2xl font-bold">Link not found</h1><p className="mt-2 text-muted-foreground">Ask your coach for the right link.</p></div></div>;
  if (!team) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6" style={{ background: "var(--gradient-hero)" }}>
        <div className="text-center text-primary-foreground">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur"><PartyPopper className="h-12 w-12" /></div>
          <h1 className="mt-6 text-4xl font-bold">You're in the reel 🎉</h1>
          <p className="mt-3 opacity-90">Thanks for sharing — your clip is now part of {team.name}'s season.</p>
          <Button variant="secondary" className="mt-8" onClick={reset}>Upload another</Button>
        </div>
      </div>
    );
  }

  const togglePlayer = (n: string) => setTaggedPlayers((prev) => prev.includes(n) ? prev.filter((p) => p !== n) : [...prev, n]);

  // Suggested event: most recent past event (timestamp suggestion stub)
  const suggested = events.slice().sort((a, b) => +new Date(b.date) - +new Date(a.date))[0];

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-warm)" }}>
      <Toaster />
      <div className="mx-auto max-w-md px-4 py-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-xs font-medium shadow-sm">
            <Video className="h-3 w-3 text-primary" />{team.sport}
          </div>
          <h1 className="mt-4 text-3xl font-bold">{team.name}</h1>
          <p className="mt-2 text-muted-foreground">Drop your favorite clip — we'll add it to the team reel.</p>
        </div>

        <div className="mt-6 flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <Card className="mt-4 space-y-5 p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Your first name (optional)</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jamie" className="placeholder:italic placeholder:text-muted-foreground/60" />
              </div>
              <div className="space-y-2">
                <Label>Pick a clip</Label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center transition hover:bg-muted/60">
                  <Upload className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">{file ? file.name : "Tap to pick a video"}</span>
                  <input type="file" accept="video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3">
                <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(!!v)} />
                <label htmlFor="consent" className="text-xs leading-relaxed text-muted-foreground">I own this clip or have permission to share it with the team.</label>
              </div>
              <Button size="lg" className="w-full" disabled={!file || !consent} onClick={() => setStep(2)}>Next</Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Which game or event?</Label>
                {suggested && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                    <div className="text-xs font-medium text-primary">Suggested from your video</div>
                    <div className="mt-1 flex items-center justify-between">
                      <div>{suggested.name}</div>
                      <Button size="sm" variant="ghost" onClick={() => setEventId(suggested.id)}>{eventId === suggested.id ? <Check className="h-4 w-4" /> : "Use this"}</Button>
                    </div>
                  </div>
                )}
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger><SelectValue placeholder="Pick a game or event" /></SelectTrigger>
                  <SelectContent>
                    {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>What kind of clip?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["play", "broll"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setContentType(t)} className={`rounded-lg border-2 px-4 py-3 text-sm font-medium ${contentType === t ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                      {t === "play" ? "Play" : "B-roll"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" onClick={() => setStep(3)}>Next</Button>
              </div>
            </>
          )}

          {step === 3 && contentType === "play" && (
            <>
              <div className="space-y-2">
                <Label>Tag players with significant contribution</Label>
                <p className="text-xs text-muted-foreground">Only tag players who actually made the play.</p>
                <div className="flex flex-wrap gap-2">
                  {roster.map((p) => {
                    const on = taggedPlayers.includes(p.player_name);
                    return (
                      <button key={p.id} type="button" onClick={() => togglePlayer(p.player_name)} className={`rounded-full border px-3 py-1 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                        {p.player_name}{p.jersey_number ? ` #${p.jersey_number}` : ""}
                      </button>
                    );
                  })}
                  {roster.length === 0 && <p className="text-xs text-muted-foreground">No roster yet.</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                <Button className="flex-1" onClick={() => setStep(4)}>Next</Button>
              </div>
            </>
          )}

          {step === 3 && contentType === "broll" && (
            <>
              <div className="space-y-2">
                <Label>What kind of b-roll?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {BROLL_TYPES.map((b) => (
                    <button key={b.v} type="button" onClick={() => setBrollType(b.v)} className={`rounded-lg border-2 px-3 py-2 text-sm ${brollType === b.v ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                      {b.l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                <Button className="flex-1" disabled={!brollType} onClick={() => setStep(4)}>Next</Button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="space-y-2">
                <Label>What was the vibe?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(contentType === "play" ? PLAY_VIBES : BROLL_VIBES).map((v) => (
                    <button key={v} type="button" onClick={() => setVibe(v)} className={`rounded-lg border-2 px-3 py-2 text-sm ${vibe === v ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>Back</Button>
                <Button className="flex-1" disabled={busy || !vibe} onClick={upload} size="lg" style={{ background: "var(--gradient-hero)" }}>
                  {busy ? "Uploading..." : "Send it 🚀"}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
