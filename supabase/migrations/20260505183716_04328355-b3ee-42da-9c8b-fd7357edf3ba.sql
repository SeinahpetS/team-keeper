
-- Teams
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  season_year INT NOT NULL,
  upload_slug TEXT NOT NULL UNIQUE DEFAULT lower(substr(md5(random()::text), 1, 10)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.schedule_events(id) ON DELETE SET NULL,
  uploader_name TEXT,
  note TEXT,
  file_url TEXT NOT NULL,
  hearted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  video_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recaps ENABLE ROW LEVEL SECURITY;

-- Teams: admin can manage; public can read (needed for upload/recap pages by slug)
CREATE POLICY "teams public read" ON public.teams FOR SELECT USING (true);
CREATE POLICY "teams admin insert" ON public.teams FOR INSERT WITH CHECK (auth.uid() = admin_id);
CREATE POLICY "teams admin update" ON public.teams FOR UPDATE USING (auth.uid() = admin_id);
CREATE POLICY "teams admin delete" ON public.teams FOR DELETE USING (auth.uid() = admin_id);

-- Schedule events: public read (for contributor dropdown), admin write
CREATE POLICY "events public read" ON public.schedule_events FOR SELECT USING (true);
CREATE POLICY "events admin insert" ON public.schedule_events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.admin_id = auth.uid())
);
CREATE POLICY "events admin update" ON public.schedule_events FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.admin_id = auth.uid())
);
CREATE POLICY "events admin delete" ON public.schedule_events FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.admin_id = auth.uid())
);

-- Roster: only admin reads/writes (used in admin "Who's Missing")
CREATE POLICY "roster admin read" ON public.roster FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.admin_id = auth.uid())
);
CREATE POLICY "roster admin insert" ON public.roster FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.admin_id = auth.uid())
);
CREATE POLICY "roster admin delete" ON public.roster FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.admin_id = auth.uid())
);

-- Clips: public insert (anyone with team_id from upload link), admin read/update
CREATE POLICY "clips public insert" ON public.clips FOR INSERT WITH CHECK (true);
CREATE POLICY "clips admin read" ON public.clips FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.admin_id = auth.uid())
);
CREATE POLICY "clips admin update" ON public.clips FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.admin_id = auth.uid())
);

-- Recaps: public read (shareable), admin write
CREATE POLICY "recaps public read" ON public.recaps FOR SELECT USING (true);
CREATE POLICY "recaps admin insert" ON public.recaps FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.admin_id = auth.uid())
);
CREATE POLICY "recaps admin update" ON public.recaps FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.admin_id = auth.uid())
);

-- Storage bucket for clips
INSERT INTO storage.buckets (id, name, public) VALUES ('clips', 'clips', true);

CREATE POLICY "clips bucket public read" ON storage.objects FOR SELECT USING (bucket_id = 'clips');
CREATE POLICY "clips bucket public upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'clips');
