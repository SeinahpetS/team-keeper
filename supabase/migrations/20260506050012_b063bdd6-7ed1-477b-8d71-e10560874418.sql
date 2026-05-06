
CREATE TABLE public.roster_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  roster_player_id uuid NOT NULL,
  claimer_name text NOT NULL,
  claimer_contact text,
  contributor_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_roster_claims_player ON public.roster_claims(roster_player_id);
CREATE INDEX idx_roster_claims_team ON public.roster_claims(team_id);

ALTER TABLE public.roster_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "claims public read" ON public.roster_claims FOR SELECT USING (true);

CREATE POLICY "claims public insert" ON public.roster_claims FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = roster_claims.team_id));

CREATE POLICY "claims admin delete" ON public.roster_claims FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = roster_claims.team_id AND t.admin_id = auth.uid()));

CREATE POLICY "claims admin update" ON public.roster_claims FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = roster_claims.team_id AND t.admin_id = auth.uid()));
