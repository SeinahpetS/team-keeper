import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Trophy, Flag, Send, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/recap")({
  component: RecapPreview,
});

function RecapPreview() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<{ id: string; name: string; upload_slug: string } | null>(null);
  const [recap, setRecap] = useState<{ id: string; video_url: string | null; status: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [flagText, setFlagText] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
    if (!user) return;
    (async () => {
      const { data: t } = await supabase.from("teams").select("id,name,upload_slug").eq("admin_id", user.id).maybeSingle();
      if (!t) return;
      setTeam(t);
      const { data: r } = await supabase.from("recaps").select("*").eq("team_id", t.id).maybeSingle();
      setRecap(r);
    })();
  }, [user, loading, navigate]);

  const sendToTeam = async () => {
    if (!recap) return;
    await supabase.from("recaps").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", recap.id);
    setConfirmOpen(false);
    setSent(true);
  };

  if (sent && team) {
    const shareUrl = `${window.location.origin}/r/${team.upload_slug}`;
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
          <div className="mt-4">
            <Link to="/dashboard" className="text-sm underline opacity-75">Back to dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-warm)" }}>
      <Toaster />
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium"><ArrowLeft className="h-4 w-4" />Dashboard</Link>
        </div>
      </header>
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Your team's recap is ready ✨</h1>
          <p className="mt-2 text-muted-foreground">Take a look. When it feels right, send it to the team.</p>
        </div>
        <Card className="overflow-hidden p-0" style={{ boxShadow: "var(--shadow-soft)" }}>
          {recap?.video_url ? (
            <video src={recap.video_url} controls className="aspect-video w-full bg-black" />
          ) : (
            <div className="aspect-video w-full bg-muted" />
          )}
        </Card>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="flex-1" style={{ background: "var(--gradient-hero)" }} onClick={() => setConfirmOpen(true)}>
            <Send className="mr-2 h-4 w-4" />Send to Team 🎉
          </Button>
          <Button size="lg" variant="outline" onClick={() => setFlagOpen(true)}><Flag className="mr-2 h-4 w-4" />Flag an Issue</Button>
        </div>
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

      <Dialog open={flagOpen} onOpenChange={setFlagOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tell us what's wrong</DialogTitle></DialogHeader>
          <Textarea value={flagText} onChange={(e) => setFlagText(e.target.value)} placeholder="What needs to change?" rows={4} />
          <DialogFooter>
            <Button onClick={() => { toast.success("Thanks — we'll take a look."); setFlagOpen(false); setFlagText(""); }}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}