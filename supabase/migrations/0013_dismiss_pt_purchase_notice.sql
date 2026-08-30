-- Lets a member permanently dismiss a pending/failed payment banner on
-- their account page once they've seen it, instead of it reappearing on
-- every visit for the full 30-day window.
alter table public.pt_purchases add column dismissed_at timestamptz;

create or replace function public.dismiss_pt_purchase_notice(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.pt_purchases
  set dismissed_at = now()
  where id = p_id and user_id = auth.uid();
end;
$$;

revoke all on function public.dismiss_pt_purchase_notice(uuid) from public;
grant execute on function public.dismiss_pt_purchase_notice(uuid) to authenticated;
