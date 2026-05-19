
CREATE TABLE public.contact_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  user_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contact: anyone can send"
ON public.contact_messages FOR INSERT
WITH CHECK (
  length(name) BETWEEN 1 AND 100
  AND length(email) BETWEEN 3 AND 200
  AND length(message) BETWEEN 1 AND 5000
);

CREATE POLICY "Contact: admin read"
ON public.contact_messages FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Contact: admin update"
ON public.contact_messages FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Contact: admin delete"
ON public.contact_messages FOR DELETE
USING (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_contact_messages_created ON public.contact_messages(created_at DESC);
