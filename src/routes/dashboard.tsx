import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Film, Users, AlertCircle, Sparkles, LogOut, Image as ImageIcon, Bell, UserPlus, CalendarPlus, ChevronRight, Trophy, Plane, Dumbbell, PartyPopper, Gamepad2, Archive, EyeOff, Plus, User, Heart, X } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DotMatrixNumber } from "@/components/DotMatrixNumber";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

type Team = { id: string; name: string; sport: string; season_year: number; upload_slug: string };
type EventRow = {
  id: string;
  name: string;
  date: string;
  end_date: string | null;
  event_type: string;
  parent_id: string | null;
  location: string | null;
  event_time: string | null;
  opponent: string | null;
  notes: string | null;
};
type RosterRow = { id: string; player_name: string; jersey_number: string | null; permission_status: string; status: string; inactive_date: string | null };
type ClipRow = { id: string; event_id: string | null; uploader_name: string | null; player_tags: string[]; content_type: string; broll_type: string | null; approval_status: string };
type RecapRow = { id: string; status: string; social_status: string };
type ClaimRow = { id: string; roster_player_id: string; claimer_name: string; contributor_type: string; created_at: string };

const EVENT_ICON: Record<string, any> = { game: Gamepad2, tournament: Trophy, practice: Dumbbell, event: PartyPopper, travel: Plane };

function healthColor(count: number) {
  if (count === 0) return "bg-destructive";
  if (count < 3) return "bg-accent";
  return "bg-primary";
}

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [recap, setRecap] = useState<RecapRow | null>(null);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [seenClaimIds, setSeenClaimIds] = useState<Set<string>>(new Set());
  const [openTournaments, setOpenTournaments] = useState<Record<string, boolean>>({});
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const refresh = async (uid: string) => {
    const { data: t } = await supabase.from("teams").select("*").eq("admin_id", uid).maybeSingle();
    if (!t) { navigate({ to: "/onboarding" }); return; }
    setTeam(t as Team);
    const [{ data: ev }, { data: r }, { data: c }, { data: rc }, { data: cl }] = await Promise.all([
      supabase.from("schedule_events").select("*").eq("team_id", t.id).order("date"),
      supabase.from("roster").select("id,player_name,jersey_number,permission_status,status,inactive_date").eq("team_id", t.id).order("jersey_number"),
      supabase.from("clips").select("id,event_id,uploader_name,player_tags,content_type,broll_type,approval_status").eq("team_id", t.id),
      supabase.from("recaps").select("id,status,social_status").eq("team_id", t.id).maybeSingle(),
      supabase.from("roster_claims").select("id,roster_player_id,claimer_name,contributor_type,created_at").eq("team_id", t.id).order("created_at", { ascending: false }),
    ]);
    setEvents((ev || []) as any);
    setRoster((r || []) as any);
    setClips((c || []) as any);
    setRecap((rc as any) || null);
    const newClaims = (cl || []) as ClaimRow[];
    if (typeof window !== "undefined") {
      const seen = new Set<string>(JSON.parse(window.localStorage.getItem(`recap_seen_claims_${t.id}`) || "[]"));
      const unseen = newClaims.filter((cc) => !seen.has(cc.id));
      if (unseen.length && claims.length) {
        unseen.slice(0, 3).forEach((u) => {
          const player = (r || []).find((rr: any) => rr.id === u.roster_player_id);
          const j = player?.jersey_number ? `#${player.jersey_number}` : player?.player_name ?? "Player";
          toast.success(`${j} has been claimed by ${u.claimer_name}`);
        });
      }
      const all = new Set<string>([...seen, ...newClaims.map((cc) => cc.id)]);
      window.localStorage.setItem(`recap_seen_claims_${t.id}`, JSON.stringify(Array.from(all)));
      setSeenClaimIds(all);
    }
    setClaims(newClaims);
  };

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
    if (user) refresh(user.id);
  }, [user, loading, navigate]);

  const clipsByEvent = useMemo(() => {
    const m: Record<string, number> = {};
    clips.forEach((c) => { if (c.event_id) m[c.event_id] = (m[c.event_id] || 0) + 1; });
    return m;
  }, [clips]);

  const playersWithFootage = useMemo(() => {
    const set = new Set<string>();
    clips.forEach((c) => c.player_tags?.forEach((p) => set.add(p.toLowerCase())));
    return set;
  }, [clips]);

  const playersWithMentions = useMemo(() => {
    // also count name appearing in uploader_name as "has clips but untagged"
    const set = new Set<string>();
    clips.forEach((c) => {
      const text = `${c.uploader_name ?? ""}`.toLowerCase();
      roster.forEach((p) => { if (text.includes(p.player_name.toLowerCase())) set.add(p.player_name.toLowerCase()); });
    });
    return set;
  }, [clips, roster]);

  const activeRoster = roster.filter((p) => p.status === "active");
  const inactiveRoster = roster.filter((p) => p.status === "inactive");
  const claimsByPlayer = useMemo(() => {
    const m: Record<string, ClaimRow[]> = {};
    claims.forEach((c) => { (m[c.roster_player_id] ||= []).push(c); });
    return m;
  }, [claims]);
  const noFootageCount = activeRoster.filter((p) => !playersWithFootage.has(p.player_name.toLowerCase()) && !playersWithMentions.has(p.player_name.toLowerCase())).length;
  const contributors = new Set(clips.map((c) => c.uploader_name).filter(Boolean)).size;

  const brollClips = clips.filter((c) => c.content_type === "broll");
  const brollByType = (t: string) => brollClips.filter((c) => c.broll_type === t).length;

  const labelFor = (s: string | undefined) => {
    if (!s) return clips.length >= 5 ? "Enough to compile" : "Not started";
    if (s === "sent") return "Sent";
    if (s === "ready") return "Ready to review";
    if (s === "compiling") return "Compiling";
    if (s === "draft") return clips.length >= 5 ? "Enough to compile" : "Not started";
    return "Ready to review";
  };
  const recapState = labelFor(recap?.status);
  const socialState = labelFor(recap?.social_status);

  const uploadUrl = team ? `${typeof window !== "undefined" ? window.location.origin : ""}/u/${team.upload_slug}` : "";

  const topLevelEvents = events.filter((e) => !e.parent_id);
  const childrenOf = (id: string) => events.filter((e) => e.parent_id === id);

  const tournamentClipCount = (tournId: string) => {
    const childIds = childrenOf(tournId).map((c) => c.id);
    return (clipsByEvent[tournId] || 0) + childIds.reduce((s, id) => s + (clipsByEvent[id] || 0), 0);
  };

  const sendPoke = () => toast.success("Poke sent to contributors with no submissions 📣");
  const requestPlayerFootage = (name: string) => toast.success(`Request sent: more footage of ${name}`);

  if (!team) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-warm)" }}>
      <Toaster />
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{team.name}</h1>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">Admin-dev</span>
            </div>
            <p className="text-xs text-muted-foreground">{team.sport} • {team.season_year}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {/* Upload link */}
        <Card className="overflow-hidden p-0" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" /> Invite contributors
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

        {/* Stat tiles */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Film} label="Clips" value={clips.length} />
          <StatCard icon={Gamepad2} label="Games" value={events.filter((e) => e.event_type === "game").length} />
          <StatCard icon={Users} label="Players" value={activeRoster.length} />
        </div>

        {/* Schedule + Recap status */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Schedule</h3>
              <Button variant="ghost" size="sm" onClick={() => setAddEventOpen(true)}><CalendarPlus className="mr-1 h-4 w-4" />Add</Button>
            </div>
            <div className="mt-4 space-y-2">
              {topLevelEvents.length === 0 && <p className="text-sm text-muted-foreground">No entries yet.</p>}
              {topLevelEvents.map((e) => {
                const Icon = EVENT_ICON[e.event_type] ?? Gamepad2;
                if (e.event_type === "tournament") {
                  const kids = childrenOf(e.id);
                  const total = tournamentClipCount(e.id);
                  const open = openTournaments[e.id];
                  return (
                    <Collapsible key={e.id} open={open} onOpenChange={(o) => setOpenTournaments({ ...openTournaments, [e.id]: o })}>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 hover:bg-muted/70">
                          <div className="flex items-center gap-2">
                            <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
                            <Icon className="h-4 w-4 text-primary" />
                            <div className="text-left">
                              <div className="font-medium">{e.name}</div>
                              <div className="text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString()}{e.end_date ? ` – ${new Date(e.end_date).toLocaleDateString()}` : ""}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${healthColor(total)}`} />
                            <span className="text-sm font-semibold text-primary">{total}</span>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="ml-6 mt-1 space-y-1">
                        {kids.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No nested entries yet.</p>}
                        {kids.map((k) => <EventRowItem key={k.id} ev={k} count={clipsByEvent[k.id] || 0} />)}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                }
                return <EventRowItem key={e.id} ev={e} count={clipsByEvent[e.id] || 0} />;
              })}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Recap status</h3>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Full-length</div>
                    <div className="font-semibold">{recapState}</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">3–5 min</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Social cut</div>
                    <div className="font-semibold">{socialState}</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-accent-foreground">60–90s • free</span>
                </div>
              </div>
              <Link to="/recap"><Button variant="outline" className="mt-4 w-full">Open recap</Button></Link>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold">Season b-roll</h3>
              <div className="mt-3 text-2xl font-bold">{brollClips.length}</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {[
                  ["Team Sideline", "team_sideline"],
                  ["Fan Sideline", "fan_sideline"],
                  ["Team BTS", "team_bts"],
                  ["Practice", "practice"],
                ].map(([label, key]) => (
                  <div key={key} className="flex items-center justify-between rounded bg-muted/40 px-2 py-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold">{brollByType(key)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Roster coverage */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Roster coverage</h3>
            <Button variant="ghost" size="sm" onClick={() => setAddPlayerOpen(true)}><Plus className="mr-1 h-4 w-4" />Add player</Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Tap a player to send a focused content request, or change status.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {activeRoster.map((p) => {
              const hasTagged = playersWithFootage.has(p.player_name.toLowerCase());
              const hasMention = playersWithMentions.has(p.player_name.toLowerCase());
              const color = hasTagged ? "border-primary bg-primary/10" : hasMention ? "border-accent bg-accent/10" : "border-destructive bg-destructive/10";
              return (
                <PlayerChip key={p.id} player={p} colorClass={color} claims={claimsByPlayer[p.id] || []} onRequest={() => requestPlayerFootage(p.player_name)} onChanged={() => user && refresh(user.id)} />
              );
            })}
            {activeRoster.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No active players yet.</p>}
          </div>

          {inactiveRoster.length > 0 && (
            <Collapsible open={showInactive} onOpenChange={setShowInactive} className="mt-4">
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-left text-sm">
                <ChevronRight className={`h-4 w-4 transition-transform ${showInactive ? "rotate-90" : ""}`} />
                <EyeOff className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Inactive ({inactiveRoster.length})</span>
                <span className="ml-2 text-xs text-muted-foreground">Not counted toward coverage gaps</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 grid grid-cols-2 gap-2 opacity-60 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {inactiveRoster.map((p) => (
                  <PlayerChip key={p.id} player={p} colorClass="border-border bg-muted/30" claims={claimsByPlayer[p.id] || []} onRequest={() => {}} onChanged={() => user && refresh(user.id)} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </Card>

        {/* Quick actions */}
        <Card className="p-6">
          <h3 className="font-semibold">Quick actions</h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/clips"><Button variant="outline" className="w-full justify-start"><ImageIcon className="mr-2 h-4 w-4" />View clip pool</Button></Link>
            <Button variant="outline" className="justify-start" onClick={sendPoke}><Bell className="mr-2 h-4 w-4" />Send poke</Button>
            <Button variant="outline" className="justify-start" onClick={() => toast.info("Pick a player above to request footage")}><UserPlus className="mr-2 h-4 w-4" />Request player footage</Button>
            <Button variant="outline" className="justify-start" onClick={() => setAddEventOpen(true)}><CalendarPlus className="mr-2 h-4 w-4" />Add schedule entry</Button>
          </div>
        </Card>
      </div>

      <AddEventDialog
        open={addEventOpen}
        onOpenChange={setAddEventOpen}
        teamId={team.id}
        tournaments={topLevelEvents.filter((e) => e.event_type === "tournament")}
        onAdded={() => user && refresh(user.id)}
      />
      <AddPlayerDialog
        open={addPlayerOpen}
        onOpenChange={setAddPlayerOpen}
        teamId={team.id}
        onAdded={() => user && refresh(user.id)}
      />
    </div>
  );
}

function EventRowItem({ ev, count }: { ev: EventRow; count: number }) {
  const Icon = EVENT_ICON[ev.event_type] ?? Gamepad2;
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <div>
          <div className="font-medium">{ev.name}{ev.opponent ? ` vs ${ev.opponent}` : ""}</div>
          <div className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleDateString()}{ev.event_time ? ` • ${ev.event_time}` : ""}{ev.location ? ` • ${ev.location}` : ""}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${healthColor(count)}`} />
        <span className="text-sm font-semibold text-primary">{count}</span>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: any; accent?: boolean }) {
  return (
    <Card className="p-5">
      <Icon className={`h-5 w-5 ${accent ? "text-destructive" : "text-primary"}`} />
      <div className="mt-3 flex h-[60px] items-center">
        <DotMatrixNumber value={value} scale={2} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

function AddEventDialog({ open, onOpenChange, teamId, tournaments, onAdded }: { open: boolean; onOpenChange: (b: boolean) => void; teamId: string; tournaments: EventRow[]; onAdded: () => void }) {
  const [type, setType] = useState("game");
  const [name, setName] = useState("");
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const reset = () => { setName(""); setOpponent(""); setDate(""); setEndDate(""); setTime(""); setLocation(""); setNotes(""); setParentId(""); setType("game"); };

  const submit = async () => {
    if (!name || !date) { toast.error("Name and date required"); return; }
    setBusy(true);
    const { error } = await supabase.from("schedule_events").insert({
      team_id: teamId,
      event_type: type,
      name,
      opponent: opponent || null,
      date,
      end_date: endDate || null,
      event_time: time || null,
      location: location || null,
      notes: notes || null,
      parent_id: parentId || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Added");
    reset();
    onOpenChange(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add schedule entry</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="game">Game</SelectItem>
                <SelectItem value="tournament">Tournament</SelectItem>
                <SelectItem value="practice">Practice</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(type === "game" || type === "travel") && tournaments.length > 0 && (
            <div className="space-y-1.5">
              <Label>Part of tournament? (optional)</Label>
              <Select value={parentId || "_none"} onValueChange={(v) => setParentId(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Standalone" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Standalone</SelectItem>
                  {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "tournament" ? "Spring Classic" : type === "event" ? "Senior Night" : "Home opener"} /></div>
          {type === "game" && <div className="space-y-1.5"><Label>Opponent</Label><Input value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="Lincoln HS" /></div>}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label>{type === "tournament" ? "Start date" : "Date"}</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            {type === "tournament" ? (
              <div className="space-y-1.5"><Label>End date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
            ) : (
              <div className="space-y-1.5"><Label>Time</Label><Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="6:00 PM" /></div>
            )}
          </div>
          <div className="space-y-1.5"><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Home field" /></div>
          {(type === "practice" || type === "event") && <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Adding..." : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlayerChip({ player, colorClass, claims, onRequest, onChanged }: { player: RosterRow; colorClass: string; claims: ClaimRow[]; onRequest: () => void; onChanged: () => void }) {
  const setStatus = async (status: string) => {
    const patch: any = { status };
    if (status === "inactive") patch.inactive_date = new Date().toISOString().slice(0, 10);
    await supabase.from("roster").update(patch).eq("id", player.id);
    toast.success(`${player.player_name} → ${status}`);
    onChanged();
  };
  const removeClaim = async (claimId: string, claimerName: string) => {
    await supabase.from("roster_claims").delete().eq("id", claimId);
    toast.success(`Removed claim from ${claimerName}`);
    onChanged();
  };
  const hasPlayer = claims.some((c) => c.contributor_type === "player");
  const hasParent = claims.some((c) => c.contributor_type === "parent");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`flex items-center justify-between gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm hover:opacity-80 ${colorClass}`}>
          <span className="truncate font-medium">{player.player_name}</span>
          <span className="flex items-center gap-1">
            {hasPlayer && <User className="h-3 w-3 text-primary" aria-label="Claimed by player" />}
            {hasParent && <Heart className="h-3 w-3 text-accent-foreground" aria-label="Claimed by parent" />}
            {player.jersey_number && <span className="text-xs text-muted-foreground">#{player.jersey_number}</span>}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={onRequest}><UserPlus className="mr-2 h-4 w-4" />Request footage</DropdownMenuItem>
        {claims.length > 0 && (
          <>
            <div className="border-t my-1" />
            <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Claimed by</div>
            {claims.map((c) => (
              <DropdownMenuItem key={c.id} onSelect={(e) => e.preventDefault()} className="justify-between gap-2">
                <span className="flex items-center gap-2">
                  {c.contributor_type === "player" ? <User className="h-3 w-3" /> : c.contributor_type === "parent" ? <Heart className="h-3 w-3" /> : null}
                  <span className="text-xs">{c.claimer_name}</span>
                </span>
                <button onClick={() => removeClaim(c.id, c.claimer_name)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
              </DropdownMenuItem>
            ))}
            <div className="border-t my-1" />
          </>
        )}
        {player.status !== "active" && <DropdownMenuItem onClick={() => setStatus("active")}>Set active</DropdownMenuItem>}
        {player.status !== "inactive" && <DropdownMenuItem onClick={() => setStatus("inactive")}><EyeOff className="mr-2 h-4 w-4" />Mark inactive</DropdownMenuItem>}
        {player.status !== "archived" && <DropdownMenuItem onClick={() => setStatus("archived")}><Archive className="mr-2 h-4 w-4" />Archive</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AddPlayerDialog({ open, onOpenChange, teamId, onAdded }: { open: boolean; onOpenChange: (b: boolean) => void; teamId: string; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [jersey, setJersey] = useState("");
  const [status, setStatus] = useState("active");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    setBusy(true);
    const { error } = await supabase.from("roster").insert({
      team_id: teamId,
      player_name: name.trim(),
      jersey_number: jersey.trim() || null,
      status,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Player added");
    setName(""); setJersey(""); setStatus("active");
    onOpenChange(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add player</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Player name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Player name" /></div>
          <div className="space-y-1.5"><Label>Jersey number</Label><Input value={jersey} onChange={(e) => setJersey(e.target.value)} placeholder="#" /></div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Adding..." : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
