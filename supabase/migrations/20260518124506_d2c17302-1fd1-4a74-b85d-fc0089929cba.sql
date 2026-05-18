CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_id UUID NOT NULL,
  client_id UUID NOT NULL,
  rating SMALLINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (apartment_id, client_id)
);

CREATE INDEX idx_reviews_apartment ON public.reviews(apartment_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Reviews: public read" ON public.reviews
  FOR SELECT USING (true);

-- A client can only insert a review if they had a non-cancelled booking on that apartment
CREATE POLICY "Reviews: client insert if booked" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = client_id
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.apartment_id = reviews.apartment_id
        AND b.client_id = auth.uid()
        AND b.status <> 'cancelled'
    )
  );

CREATE POLICY "Reviews: client update own" ON public.reviews
  FOR UPDATE USING (auth.uid() = client_id);

CREATE POLICY "Reviews: client delete own" ON public.reviews
  FOR DELETE USING (auth.uid() = client_id OR has_role(auth.uid(), 'admin'::app_role));

-- Validation: rating 1..5
CREATE OR REPLACE FUNCTION public.validate_review()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'La note doit être entre 1 et 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_review_trg
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.validate_review();

CREATE TRIGGER touch_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();