import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/r/$slug")({
  component: TeamRecap,
});

function TeamRecap() {
  const { slug } = Route.useParams();
  const [team, setTeam] = useState<{ id: string; name: string; sport: string; season_year: number } | null>(null);
  const [recap, setRecap] = useState<{ video_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from("teams").select("id,name,sport,season_year").eq("upload_slug", slug).maybeSingle();
      if (t) {
        setTeam(t);
        const { data: r } = await supabase.from("recaps").select("video_url").eq("team_id", t.id).eq("status", "sent").maybeSingle();
        setRecap(r);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!team) return <div className="flex min-h-screen items-center justify-center text-center"><h1 className="text-2xl font-bold">Team not found</h1></div>;

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-warm)" }}>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--gradient-hero)" }}>
            <Trophy className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mt-6 text-4xl font-bold">{team.name}</h1>
          <p className="mt-2 text-muted-foreground">{team.sport} • {team.season_year} Season KEEPER</p>
        </div>
        <Card className="mt-8 overflow-hidden p-0" style={{ boxShadow: "var(--shadow-soft)" }}>
          {recap?.video_url ? (
            <video src={recap.video_url} controls autoPlay className="aspect-video w-full bg-black" />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-muted text-muted-foreground">KEEPER coming soon ✨</div>
          )}
        </Card>
        <p className="mt-6 text-center text-sm text-muted-foreground">Made by everyone. For everyone. ❤️</p>
      </div>
    </div>
  );
}