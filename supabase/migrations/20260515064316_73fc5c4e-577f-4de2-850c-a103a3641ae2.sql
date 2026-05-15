REVOKE EXECUTE ON FUNCTION public.handle_owner_request_approval() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_booking_overlap() FROM anon, authenticated, public;