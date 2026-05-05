
DROP POLICY "clips public insert" ON public.clips;
CREATE POLICY "clips public insert" ON public.clips FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id)
);

DROP POLICY "clips bucket public read" ON storage.objects;
CREATE POLICY "clips bucket public read" ON storage.objects FOR SELECT USING (
  bucket_id = 'clips' AND (storage.foldername(name))[1] IS NOT NULL
);

DROP POLICY "clips bucket public upload" ON storage.objects;
CREATE POLICY "clips bucket public upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'clips' AND (storage.foldername(name))[1] IS NOT NULL
);
