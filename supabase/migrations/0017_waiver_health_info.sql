alter table public.waivers
  add column emergency_contact_name text not null default '',
  add column emergency_contact_phone text not null default '',
  add column emergency_contact_relationship text not null default '',
  add column medical_conditions text not null default '',
  add column injuries text not null default '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  );

  if new.raw_user_meta_data ->> 'waiver_accepted_at' is not null then
    insert into public.waivers (
      user_id, full_name, version, accepted_at,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
      medical_conditions, injuries
    )
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', ''),
      coalesce(new.raw_user_meta_data ->> 'waiver_version', 'v1'),
      (new.raw_user_meta_data ->> 'waiver_accepted_at')::timestamptz,
      coalesce(new.raw_user_meta_data ->> 'emergency_contact_name', ''),
      coalesce(new.raw_user_meta_data ->> 'emergency_contact_phone', ''),
      coalesce(new.raw_user_meta_data ->> 'emergency_contact_relationship', ''),
      coalesce(new.raw_user_meta_data ->> 'medical_conditions', ''),
      coalesce(new.raw_user_meta_data ->> 'injuries', '')
    );
  end if;

  return new;
end;
$$;
