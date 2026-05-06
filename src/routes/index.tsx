import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Sparkles, Video, Users, Heart } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      // Check if they have a team
      supabase.from("teams").select("id").eq("admin_id", user.id).limit(1).then(({ data }) => {
        if (data && data.length > 0) navigate({ to: "/dashboard" });
        else navigate({ to: "/onboarding" });
      });
    }
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fn = mode === "signup" ? supabase.auth.signUp : supabase.auth.signInWithPassword;
    const { error } = await fn({
      email,
      password,
      ...(mode === "signup" ? { options: { emailRedirectTo: `${window.location.origin}/` } } : {}),
    } as any);
    setBusy(false);
    if (error) toast.error(error.message);
    else if (mode === "signup") toast.success("Welcome! Let's set up your team.");
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-warm)" }}>
      <Toaster />
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium shadow-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              For youth sports teams
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your whole season,
              <br />
              <span className="inline-block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                from every angle.
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Recap turns the clips trapped in everyone's camera roll into a season highlight video your whole team will love.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { icon: Users, t: "Share one link" },
                { icon: Video, t: "Clips pour in" },
                { icon: Heart, t: "Team gets the reel" },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-card/60 p-3 text-sm">
                  <f.icon className="h-5 w-5 text-primary" />
                  {f.t}
                </div>
              ))}
            </div>
          </div>

          <Card className="p-8 shadow-2xl" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h2 className="text-2xl font-bold">{mode === "signup" ? "Start your team" : "Welcome back"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "signup" ? "Create your coach/parent account" : "Sign in to your team"}
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy} className="w-full" size="lg">
                {busy ? "..." : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
              <button
                type="button"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="w-full text-sm text-muted-foreground transition-colors hover:text-[#D4A017]"
              >
                {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
              </button>
            </form>
            <div className="mt-4 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate({ to: "/dashboard" })}
                onClickCapture={() => { try { window.localStorage.setItem("recap_dev_mode", "1"); } catch {} }}
              >
                Skip sign in (dev mode)
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
