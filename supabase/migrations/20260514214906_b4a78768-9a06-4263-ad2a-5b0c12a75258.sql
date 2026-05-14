
-- Prevent overlapping bookings via trigger
CREATE OR REPLACE FUNCTION public.prevent_booking_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.apartment_id = NEW.apartment_id
      AND b.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND b.status <> 'cancelled'
      AND daterange(b.check_in, b.check_out, '[)') && daterange(NEW.check_in, NEW.check_out, '[)')
  ) THEN
    RAISE EXCEPTION 'Ces dates sont déjà réservées pour cet appartement';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_prevent_overlap ON public.bookings;
CREATE TRIGGER bookings_prevent_overlap
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_overlap();

-- Public function to fetch booked ranges (no PII)
CREATE OR REPLACE FUNCTION public.get_apartment_booked_ranges(_apartment_id uuid)
RETURNS TABLE(check_in date, check_out date)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_in, check_out FROM public.bookings
  WHERE apartment_id = _apartment_id AND status <> 'cancelled';
$$;
