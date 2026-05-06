import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Upload, Video, PartyPopper, User, Users as UsersIcon, Heart, Megaphone } from "lucide-react";

export const Route = createFileRoute("/u/$slug")({
  component: ContributorUpload,
});

function ContributorUpload() {
  const { slug } = Route.useParams();
  const [team, setTeam] = useState<{ id: string; name: string; sport: string } | null>(null);
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [roster, setRoster] = useState<{ id: string; player_name: string; jersey_number: string | null }[]>([]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [contributorType, setContributorType] = useState<string>("");
  const [linkedPlayerId, setLinkedPlayerId] = useState<string>("");
  const [intakeDone, setIntakeDone] = useState(false);
  const [eventId, setEventId] = useState<string>("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from("teams").select("id,name,sport").eq("upload_slug", slug).maybeSingle();
      if (!t) { setNotFound(true); return; }
      setTeam(t);
      const [{ data: ev }, { data: r }] = await Promise.all([
        supabase.from("schedule_events").select("id,name").eq("team_id", t.id).order("date"),
        supabase.from("roster").select("id,player_name,jersey_number").eq("team_id", t.id).eq("status", "active"),
      ]);
      setEvents(ev || []);
      setRoster(r || []);
    })();
  }, [slug]);

  const upload = async () => {
    if (!team || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of files) {
        const path = `${team.id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("clips").upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("clips").getPublicUrl(path);
        await supabase.from("clips").insert({
          team_id: team.id,
          event_id: eventId || null,
          uploader_name: name || null,
          note: note || null,
          file_url: pub.publicUrl,
          contributor_type: contributorType || null,
          contributor_player_id: linkedPlayerId || null,
        });
      }
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
          <p className="mt-3 opacity-90">Thanks for sharing — your clips are now part of {team.name}'s season.</p>
          <Button variant="secondary" className="mt-8" onClick={() => { setDone(false); setFiles([]); setNote(""); }}>Upload more</Button>
        </div>
      </div>
    );
  }

  if (!intakeDone) {
    const types = [
      { v: "player", l: "Player", icon: User },
      { v: "parent", l: "Parent", icon: Heart },
      { v: "fan", l: "Fan", icon: UsersIcon },
      { v: "student_manager", l: "Student manager", icon: Megaphone },
    ];
    const canContinue = name.trim() && contributorType && (contributorType !== "parent" || linkedPlayerId);
    return (
      <div className="min-h-screen" style={{ background: "var(--gradient-warm)" }}>
        <Toaster />
        <div className="mx-auto max-w-md px-4 py-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-xs font-medium shadow-sm">
              <Video className="h-3 w-3 text-primary" />{team.sport}
            </div>
            <h1 className="mt-4 text-3xl font-bold">{team.name}</h1>
            <p className="mt-2 text-muted-foreground">Tell us who you are — no account needed.</p>
          </div>
          <Card className="mt-6 space-y-5 p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="space-y-2">
              <Label>Your name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jamie" className="placeholder:italic placeholder:text-muted-foreground/60" />
            </div>
            <div className="space-y-2">
              <Label>Phone or email — optional, for notifications</Label>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="555-1234 or you@email.com" className="placeholder:italic placeholder:text-muted-foreground/60" />
            </div>
            <div className="space-y-2">
              <Label>I'm a…</Label>
              <div className="grid grid-cols-2 gap-2">
                {types.map((t) => {
                  const Icon = t.icon;
                  const on = contributorType === t.v;
                  return (
                    <button key={t.v} type="button" onClick={() => { setContributorType(t.v); if (t.v !== "parent") setLinkedPlayerId(""); }} className={`flex flex-col items-center gap-1 rounded-lg border-2 px-3 py-3 text-sm font-medium ${on ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                      <Icon className="h-4 w-4" />{t.l}
                    </button>
                  );
                })}
              </div>
            </div>
            {contributorType === "parent" && (
              <div className="space-y-2">
                <Label>Whose parent are you?</Label>
                <Select value={linkedPlayerId} onValueChange={setLinkedPlayerId}>
                  <SelectTrigger><SelectValue placeholder="Pick your player" /></SelectTrigger>
                  <SelectContent>
                    {roster.map((p) => <SelectItem key={p.id} value={p.id}>{p.player_name}{p.jersey_number ? ` #${p.jersey_number}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button size="lg" className="w-full" disabled={!canContinue} onClick={() => setIntakeDone(true)}>Start uploading</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-warm)" }}>
      <Toaster />
      <div className="mx-auto max-w-md px-4 py-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-xs font-medium shadow-sm">
            <Video className="h-3 w-3 text-primary" />{team.sport}
          </div>
          <h1 className="mt-4 text-3xl font-bold">{team.name}</h1>
          <p className="mt-2 text-muted-foreground">Drop your favorite clips — they'll join the team reel.</p>
        </div>

        <Card className="mt-6 space-y-5 p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Uploading as <span className="font-semibold text-foreground">{name}</span> ({contributorType.replace("_", " ")})
          </div>

          <div className="space-y-2">
            <Label>Which game?</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger><SelectValue placeholder="Pick a game or event" /></SelectTrigger>
              <SelectContent>
                {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Add a caption — optional</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="That goal in the 2nd half!" rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Your clips</Label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center transition hover:bg-muted/60">
              <Upload className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">{files.length ? `${files.length} clip(s) selected` : "Tap to pick videos"}</span>
              <input type="file" accept="video/*" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            </label>
          </div>

          <Button onClick={upload} disabled={busy || files.length === 0} size="lg" className="w-full" style={{ background: "var(--gradient-hero)" }}>
            {busy ? "Uploading..." : "Send it in 🚀"}
          </Button>
        </Card>
      </div>
    </div>
  );
}