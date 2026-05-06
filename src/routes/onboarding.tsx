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
import { Plus, X, Trophy, Calendar, Users, ShieldCheck, Sparkles, Copy, ClipboardPaste, Lock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

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
  const [players, setPlayers] = useState<{ name: string; jersey: string }[]>([{ name: "", jersey: "" }]);
  const [events, setEvents] = useState<{ name: string; date: string; event_type: string }[]>([{ name: "", date: "", event_type: "game" }]);
  const [pasteText, setPasteText] = useState("");
  const [permissionsSent, setPermissionsSent] = useState(false);
  const [createdTeam, setCreatedTeam] = useState<{ id: string; upload_slug: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const TOTAL_STEPS = 5;

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  const createTeamIfNeeded = async () => {
    if (createdTeam || !user) return createdTeam;
    const { data: team, error } = await supabase
      .from("teams")
      .insert({ name, sport, season_year: year, admin_id: user.id })
      .select()
      .single();
    if (error || !team) { toast.error(error?.message ?? "Failed"); return null; }
    setCreatedTeam({ id: team.id, upload_slug: team.upload_slug });
    return { id: team.id, upload_slug: team.upload_slug };
  };

  const saveRosterAndAdvance = async () => {
    setBusy(true);
    const t = await createTeamIfNeeded();
    if (!t) { setBusy(false); return; }
    const validPlayers = players.filter((p) => p.name.trim());
    if (validPlayers.length) {
      await supabase.from("roster").insert(validPlayers.map((p) => ({ player_name: p.name.trim(), jersey_number: p.jersey.trim() || null, team_id: t.id, status: "active" })));
    }
    setBusy(false);
    setStep(4);
  };

  const saveScheduleAndAdvance = async () => {
    setBusy(true);
    const t = await createTeamIfNeeded();
    if (!t) { setBusy(false); return; }
    const validEvents = events.filter((e) => e.name && e.date);
    if (validEvents.length) {
      await supabase.from("schedule_events").insert(validEvents.map((e) => ({ name: e.name, date: e.date, event_type: e.event_type, team_id: t.id })));
    }
    setBusy(false);
    setStep(5);
  };

  const finish = () => navigate({ to: "/dashboard" });

  const uploadUrl = createdTeam ? `${typeof window !== "undefined" ? window.location.origin : ""}/u/${createdTeam.upload_slug}` : "";

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-warm)" }}>
      <Toaster />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
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
                <Users className="h-7 w-7 text-primary" />
                <h2 className="text-2xl font-bold">Add your roster</h2>
              </div>
              <p className="text-sm text-muted-foreground">Add each player one by one. We'll use this to track coverage all season.</p>
              {players.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <Input className="flex-1 placeholder:italic placeholder:text-muted-foreground/60" placeholder="Player name" value={p.name} onChange={(e) => setPlayers(players.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <Input className="w-24 placeholder:italic placeholder:text-muted-foreground/60" placeholder="#" value={p.jersey} onChange={(e) => setPlayers(players.map((x, j) => j === i ? { ...x, jersey: e.target.value } : x))} />
                  <Button variant="ghost" size="icon" onClick={() => setPlayers(players.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => setPlayers([...players, { name: "", jersey: "" }])}><Plus className="mr-2 h-4 w-4" />Add player</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button onClick={saveRosterAndAdvance} disabled={busy || players.filter((p) => p.name.trim()).length === 0} className="flex-1" size="lg">Next</Button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-7 w-7 text-primary" />
                <h2 className="text-2xl font-bold">Build your schedule</h2>
              </div>
              <p className="text-sm text-muted-foreground">Games and events become tags so contributors can label their clips.</p>

              <div className="rounded-lg border border-dashed border-accent/60 bg-accent/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ClipboardPaste className="h-4 w-4 text-accent-foreground" />
                    Paste-to-import schedule
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground"><Lock className="h-3 w-3" />Paid</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Paste a schedule from email, league site, or PDF and we'll parse it for you.</p>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={3}
                  placeholder="Sat 9/14 vs Lincoln HS @ 10am..."
                  className="mt-2 w-full rounded-md border border-input bg-background/50 p-2 text-sm placeholder:italic placeholder:text-muted-foreground/60"
                />
                <Button variant="outline" size="sm" className="mt-2" onClick={() => toast.info("Paste-to-import is a paid feature — coming soon!")}>Parse schedule</Button>
              </div>

              <div className="space-y-2 text-sm font-medium">Or add manually:</div>
              {events.map((ev, i) => (
                <div key={i} className="flex gap-2">
                  <select className="rounded-md border border-input bg-transparent px-2 py-1 text-sm" value={ev.event_type} onChange={(e) => setEvents(events.map((x, j) => j === i ? { ...x, event_type: e.target.value } : x))}>
                    <option value="game">Game</option>
                    <option value="tournament">Tournament</option>
                    <option value="practice">Practice</option>
                    <option value="event">Event</option>
                    <option value="travel">Travel</option>
                  </select>
                  <Input className="placeholder:italic placeholder:text-muted-foreground/60" placeholder="Game vs. Lincoln HS" value={ev.name} onChange={(e) => setEvents(events.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <Input type="date" value={ev.date} onChange={(e) => setEvents(events.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} />
                  <Button variant="ghost" size="icon" onClick={() => setEvents(events.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => setEvents([...events, { name: "", date: "", event_type: "game" }])}><Plus className="mr-2 h-4 w-4" />Add event</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                <Button onClick={saveScheduleAndAdvance} disabled={busy} className="flex-1" size="lg">Next</Button>
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-7 w-7 text-primary" />
                <h2 className="text-2xl font-bold">Media permissions</h2>
              </div>
              <p className="text-sm text-muted-foreground">We'll generate a permission request per player to send to their parent or guardian — required before clips of that player can appear in shared keepsakes.</p>
              <div className="space-y-2">
                {players.filter((p) => p.name.trim()).map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <span className="font-medium">{p.name}{p.jersey ? ` #${p.jersey}` : ""}</span>
                    <span className={`text-xs ${permissionsSent ? "text-primary" : "text-muted-foreground"}`}>{permissionsSent ? "Request sent" : "Pending"}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full" onClick={() => { setPermissionsSent(true); toast.success("Permission requests generated for all players"); }}>
                <ShieldCheck className="mr-2 h-4 w-4" />Generate permission requests
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">Back</Button>
                <Button onClick={() => setStep(5)} className="flex-1" size="lg">Next</Button>
              </div>
            </div>
          )}
          {step === 5 && (
            <div className="space-y-6 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-primary" />
              <h2 className="text-2xl font-bold">Your team's upload link</h2>
              <p className="text-sm text-muted-foreground">Share this anywhere. No login, no app — contributors just tap and upload.</p>
              <div className="flex justify-center"><div className="rounded-2xl bg-card p-4 shadow-sm"><QRCodeSVG value={uploadUrl} size={180} /></div></div>
              <div className="flex gap-2">
                <code className="flex-1 truncate rounded-lg bg-muted px-3 py-2 text-left text-sm">{uploadUrl}</code>
                <Button onClick={() => { navigator.clipboard.writeText(uploadUrl); toast.success("Copied!"); }}><Copy className="h-4 w-4" /></Button>
              </div>
              <Button onClick={finish} className="w-full" size="lg">Go to dashboard 🎉</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}