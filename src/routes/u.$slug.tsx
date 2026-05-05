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
import { Upload, Video, PartyPopper } from "lucide-react";

export const Route = createFileRoute("/u/$slug")({
  component: ContributorUpload,
});

function ContributorUpload() {
  const { slug } = Route.useParams();
  const [team, setTeam] = useState<{ id: string; name: string; sport: string } | null>(null);
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [name, setName] = useState("");
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
      const { data: ev } = await supabase.from("schedule_events").select("id,name").eq("team_id", t.id).order("date");
      setEvents(ev || []);
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
          <div className="space-y-2">
            <Label>Your first name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
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