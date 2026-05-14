
-- Storage bucket for apartment images
INSERT INTO storage.buckets (id, name, public) VALUES ('apartment-images', 'apartment-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Apartment images: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'apartment-images');

-- Owners/admins upload to their own folder (folder = user id)
CREATE POLICY "Apartment images: owner upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'apartment-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Apartment images: owner update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'apartment-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Apartment images: owner delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'apartment-images'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
);

-- Allow admins to read all roles already covered by 'admin manage'.
-- Add policy: admins can view all profiles already covered.

-- Function to let admins assign roles via RPC (using service-definer pattern not needed; admin policy already allows insert)
