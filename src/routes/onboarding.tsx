import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Plus, X, Trophy, Calendar, Users } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [events, setEvents] = useState<{ name: string; date: string }[]>([{ name: "", date: "" }]);
  const [players, setPlayers] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    const { data: team, error } = await supabase
      .from("teams")
      .insert({ name, sport, season_year: year, admin_id: user.id })
      .select()
      .single();
    if (error || !team) {
      toast.error(error?.message ?? "Failed");
      setBusy(false);
      return;
    }
    const validEvents = events.filter((e) => e.name && e.date);
    if (validEvents.length) {
      await supabase.from("schedule_events").insert(validEvents.map((e) => ({ ...e, team_id: team.id })));
    }
    const validPlayers = players.filter((p) => p.trim());
    if (validPlayers.length) {
      await supabase.from("roster").insert(validPlayers.map((p) => ({ player_name: p.trim(), team_id: team.id })));
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-warm)" }}>
      <Toaster />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <Card className="p-8" style={{ boxShadow: "var(--shadow-soft)" }}>
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Trophy className="h-7 w-7 text-primary" />
                <h2 className="text-2xl font-bold">Tell us about your team</h2>
              </div>
              <div className="space-y-2"><Label>Team name</Label><Input className="placeholder:italic placeholder:text-muted-foreground/60" value={name} onChange={(e) => setName(e.target.value)} placeholder="Lincoln Eagles U14" /></div>
              <div className="space-y-2"><Label>Sport</Label><Input className="placeholder:italic placeholder:text-muted-foreground/60" value={sport} onChange={(e) => setSport(e.target.value)} placeholder="Soccer" /></div>
              <div className="space-y-2"><Label>Season year</Label><Input className="placeholder:italic placeholder:text-muted-foreground/60" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
              <Button onClick={() => setStep(2)} disabled={!name || !sport} size="lg" className="w-full">Next</Button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-7 w-7 text-primary" />
                <h2 className="text-2xl font-bold">Add your schedule</h2>
              </div>
              <p className="text-sm text-muted-foreground">Games and events become tags so contributors can label their clips.</p>
              {events.map((ev, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Game vs. Lincoln HS" value={ev.name} onChange={(e) => setEvents(events.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <Input type="date" value={ev.date} onChange={(e) => setEvents(events.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} />
                  <Button variant="ghost" size="icon" onClick={() => setEvents(events.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => setEvents([...events, { name: "", date: "" }])}><Plus className="mr-2 h-4 w-4" />Add event</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button onClick={() => setStep(3)} className="flex-1" size="lg">Next</Button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Users className="h-7 w-7 text-primary" />
                <h2 className="text-2xl font-bold">Roster</h2>
              </div>
              <p className="text-sm text-muted-foreground">Player first names — we'll show you who's missing from the reel.</p>
              {players.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Player name" value={p} onChange={(e) => setPlayers(players.map((x, j) => j === i ? e.target.value : x))} />
                  <Button variant="ghost" size="icon" onClick={() => setPlayers(players.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => setPlayers([...players, ""])}><Plus className="mr-2 h-4 w-4" />Add player</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                <Button onClick={submit} disabled={busy} className="flex-1" size="lg">{busy ? "Creating..." : "Create team 🎉"}</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}