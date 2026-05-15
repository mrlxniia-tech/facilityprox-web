CREATE TYPE public.owner_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.owner_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  message TEXT,
  status public.owner_request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.owner_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "OwnerReq: self read" ON public.owner_requests
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "OwnerReq: self insert" ON public.owner_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "OwnerReq: admin update" ON public.owner_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_owner_requests_updated
  BEFORE UPDATE ON public.owner_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- When admin approves a request, automatically grant 'owner' role
CREATE OR REPLACE FUNCTION public.handle_owner_request_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_owner_request_approved
  AFTER UPDATE ON public.owner_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_owner_request_approval();