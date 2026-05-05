import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Film, Users, Calendar, Sparkles, LogOut, Image } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

type Team = { id: string; name: string; sport: string; season_year: number; upload_slug: string };
type EventRow = { id: string; name: string; date: string };

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [events, setEvents] = useState<(EventRow & { count: number })[]>([]);
  const [stats, setStats] = useState({ clips: 0, contributors: 0, lastUpload: "" });
  const [compiling, setCompiling] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
    if (!user) return;
    (async () => {
      const { data: t } = await supabase.from("teams").select("*").eq("admin_id", user.id).maybeSingle();
      if (!t) { navigate({ to: "/onboarding" }); return; }
      setTeam(t as Team);
      const { data: ev } = await supabase.from("schedule_events").select("*").eq("team_id", t.id).order("date");
      const { data: clips } = await supabase.from("clips").select("event_id, uploader_name, created_at").eq("team_id", t.id);
      const counts: Record<string, number> = {};
      clips?.forEach((c) => { if (c.event_id) counts[c.event_id] = (counts[c.event_id] || 0) + 1; });
      setEvents((ev || []).map((e) => ({ ...e, count: counts[e.id] || 0 })));
      setStats({
        clips: clips?.length || 0,
        contributors: new Set(clips?.map((c) => c.uploader_name).filter(Boolean)).size,
        lastUpload: clips?.length ? new Date(Math.max(...clips.map((c) => new Date(c.created_at).getTime()))).toLocaleDateString() : "—",
      });
    })();
  }, [user, loading, navigate]);

  const uploadUrl = team ? `${typeof window !== "undefined" ? window.location.origin : ""}/u/${team.upload_slug}` : "";

  const compile = async () => {
    if (!team) return;
    setCompiling(true);
    setTimeout(async () => {
      const { data: existing } = await supabase.from("recaps").select("id").eq("team_id", team.id).maybeSingle();
      if (!existing) {
        await supabase.from("recaps").insert({ team_id: team.id, video_url: "https://www.w3schools.com/html/mov_bbb.mp4", status: "draft" });
      }
      navigate({ to: "/recap" });
    }, 3000);
  };

  if (!team) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-warm)" }}>
      <Toaster />
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold">{team.name}</h1>
            <p className="text-xs text-muted-foreground">{team.sport} • {team.season_year}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <Card className="overflow-hidden p-0" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" /> Share with parents
              </div>
              <h2 className="mt-3 text-2xl font-bold">Your team's upload link</h2>
              <p className="mt-1 text-sm text-muted-foreground">Drop this in your team group chat. No app, no login.</p>
              <div className="mt-4 flex gap-2">
                <code className="flex-1 truncate rounded-lg bg-muted px-3 py-2 text-sm">{uploadUrl}</code>
                <Button onClick={() => { navigator.clipboard.writeText(uploadUrl); toast.success("Copied!"); }}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-sm">
              <QRCodeSVG value={uploadUrl} size={140} />
            </div>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Film} label="Clips uploaded" value={stats.clips} />
          <StatCard icon={Users} label="Contributors" value={stats.contributors} />
          <StatCard icon={Calendar} label="Last upload" value={stats.lastUpload} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="font-semibold">Games & events</h3>
            <div className="mt-4 space-y-2">
              {events.length === 0 && <p className="text-sm text-muted-foreground">No events yet.</p>}
              {events.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString()}</div>
                  </div>
                  <span className="text-sm font-semibold text-primary">{e.count} clips</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6 flex flex-col gap-4">
            <h3 className="font-semibold">Quick actions</h3>
            <Link to="/clips"><Button variant="outline" className="w-full justify-start"><Image className="mr-2 h-4 w-4" />View clip pool</Button></Link>
            <Button onClick={compile} disabled={compiling || stats.clips === 0} size="lg" className="w-full" style={{ background: "var(--gradient-hero)" }}>
              {compiling ? "Compiling your reel..." : "Compile Recap ✨"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card className="p-5">
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}