
ALTER TABLE public.roster
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS inactive_date date;

ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS contributor_type text,
  ADD COLUMN IF NOT EXISTS contributor_player_id uuid;

ALTER TABLE public.recaps
  ADD COLUMN IF NOT EXISTS social_video_url text,
  ADD COLUMN IF NOT EXISTS social_status text NOT NULL DEFAULT 'draft';

-- Allow roster updates by admins (currently roster has no UPDATE policy)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='roster' AND policyname='roster admin update') THEN
    CREATE POLICY "roster admin update" ON public.roster
      FOR UPDATE USING (EXISTS (SELECT 1 FROM teams t WHERE t.id = roster.team_id AND t.admin_id = auth.uid()));
  END IF;
END $$;
