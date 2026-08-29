-- Harden search_path on trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- These are internal helpers only meant to run as triggers / inside policies,
-- not to be called directly over the REST RPC endpoint.
revoke execute on function public.is_admin() from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
