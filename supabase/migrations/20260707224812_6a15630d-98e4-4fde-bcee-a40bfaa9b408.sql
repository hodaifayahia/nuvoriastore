
-- 1. return_photos table: restrict SELECT to admins
DROP POLICY IF EXISTS "Return photos publicly readable" ON public.return_photos;
CREATE POLICY "Admins can view return_photos"
  ON public.return_photos FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. storage.objects for 'returns' bucket: restrict SELECT + INSERT to admins
DROP POLICY IF EXISTS "Anyone can view return photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload return photos" ON storage.objects;

CREATE POLICY "Admins can view return photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'returns' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can upload return photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'returns' AND has_role(auth.uid(), 'admin'::app_role));

-- 3. supplier-documents bucket: remove public SELECT policy (admin-only SELECT policy already exists)
DROP POLICY IF EXISTS "Supplier docs publicly readable" ON storage.objects;
