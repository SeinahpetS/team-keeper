import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const DEV_USER_ID = "deadbeef-dead-dead-dead-deaddeaddead";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const devMode = typeof window !== "undefined" && window.localStorage.getItem("keeper_dev_mode") === "1";
  const devUser = devMode ? ({ id: DEV_USER_ID, email: "dev@keeper.local" } as any) : null;
  return { session, user: session?.user ?? devUser, loading };
}