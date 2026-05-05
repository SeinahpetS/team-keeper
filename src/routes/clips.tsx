import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Heart, ArrowLeft, Bell } from "lucide-react";

export const Route = createFileRoute("/clips")({
  component: ClipsPool,
});

type Clip = { id: string; uploader_name: string | null; note: string | null; file_url: string; hearted: boolean; event_id: string | null };
type EventRow = { id: string; name: string };

function ClipsPool() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
    if (!user) return;
    (async () => {
      const { data: t } = await supabase.from("teams").select("id").eq("admin_id", user.id).maybeSingle();
      if (!t) return;
      setTeamId(t.id);
      const [{ data: c }, { data: ev }, { data: roster }] = await Promise.all([
        supabase.from("clips").select("*").eq("team_id", t.id).order("created_at", { ascending: false }),
        supabase.from("schedule_events").select("id,name").eq("team_id", t.id),
        supabase.from("roster").select("player_name").eq("team_id", t.id),
      ]);
      setClips(c || []);
      setEvents(ev || []);
      const mentioned = new Set<string>();
      (c || []).forEach((cl) => {
        const text = `${cl.uploader_name ?? ""} ${cl.note ?? ""}`.toLowerCase();
        (roster || []).forEach((r) => { if (text.includes(r.player_name.toLowerCase())) mentioned.add(r.player_name); });
      });
      setMissing((roster || []).map((r) => r.player_name).filter((n) => !mentioned.has(n)));
    })();
  }, [user, loading, navigate]);

  const toggleHeart = async (id: string, current: boolean) => {
    setClips((cs) => cs.map((c) => (c.id === id ? { ...c, hearted: !current } : c)));
    await supabase.from("clips").update({ hearted: !current }).eq("id", id);
  };

  const eventName = (id: string | null) => events.find((e) => e.id === id)?.name ?? "Untagged";

  const grouped = events.map((e) => ({ event: e, items: clips.filter((c) => c.event_id === e.id) }));
  const untagged = clips.filter((c) => !c.event_id);

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-warm)" }}>
      <Toaster />
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
          <Button variant="outline" size="sm" onClick={() => toast.success("Reminder sent to contributors 📣")}><Bell className="mr-2 h-4 w-4" />Send Reminder</Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {missing.length > 0 && (
          <Card className="p-5">
            <h3 className="font-semibold">Who's missing</h3>
            <p className="mt-1 text-sm text-muted-foreground">No clips yet for these players:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {missing.map((m) => <span key={m} className="rounded-full bg-accent px-3 py-1 text-sm">{m}</span>)}
            </div>
          </Card>
        )}

        {clips.length === 0 && <Card className="p-12 text-center text-muted-foreground">No clips yet — share your upload link to get started.</Card>}

        {grouped.filter((g) => g.items.length > 0).map((g) => (
          <section key={g.event.id}>
            <h2 className="mb-3 text-lg font-bold">{g.event.name}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((c) => <ClipCard key={c.id} clip={c} eventName={g.event.name} onHeart={toggleHeart} />)}
            </div>
          </section>
        ))}
        {untagged.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-bold">Untagged</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {untagged.map((c) => <ClipCard key={c.id} clip={c} eventName="Untagged" onHeart={toggleHeart} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ClipCard({ clip, eventName, onHeart }: { clip: Clip; eventName: string; onHeart: (id: string, c: boolean) => void }) {
  return (
    <Card className="overflow-hidden p-0">
      <video src={clip.file_url} className="aspect-video w-full bg-black object-cover" controls preload="metadata" />
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{clip.uploader_name || "Anonymous"}</div>
          <div className="text-xs text-muted-foreground">{eventName}</div>
          {clip.note && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">"{clip.note}"</p>}
        </div>
        <button onClick={() => onHeart(clip.id, clip.hearted)} className="shrink-0">
          <Heart className={`h-5 w-5 ${clip.hearted ? "fill-primary text-primary" : "text-muted-foreground"}`} />
        </button>
      </div>
    </Card>
  );
}