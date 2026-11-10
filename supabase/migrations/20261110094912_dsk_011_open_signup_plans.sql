-- Phase 8 (+ open sign-up).
-- A. Anyone may create an account. Each new account gets its OWN private DSK centre, so people who sign up
--    independently never see each other's entrepreneurs. Role is always 'operator' — never taken from sign-up
--    data (only an admin can change roles or move someone into another centre; see profiles/dsk_centers policies).
create or replace function private.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name   text := left(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), 120);
  v_centre text := left(nullif(btrim(new.raw_user_meta_data->>'centre_name'), ''), 120);
  v_center uuid;
begin
  insert into public.dsk_centers (name)
  values (coalesce(v_centre, coalesce(v_name, split_part(new.email, '@', 1)) || ' (own centre)'))
  returning id into v_center;

  insert into public.profiles (id, full_name, center_id, role)
  values (new.id, coalesce(v_name, new.email), v_center, 'operator');
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

-- B. Backstop for the app's readiness gate: a plan version can only be created when the DSK operator has
--    approved growth for all three years (rule 5). The app additionally checks staleness and every engine flag.
create or replace function private.guard_plan_insert() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.growth_assumptions
      where business_id = new.business_id and approved_pct is not null and year between 1 and 3) < 3 then
    raise exception 'Growth assumptions must be approved by the DSK operator before a plan is generated'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_plan_insert() from public, anon, authenticated;
create trigger plan_requires_approved_growth before insert on public.plan_versions
  for each row execute function private.guard_plan_insert();

-- C. Plan versions are numbered per case; fast lookups for "latest version" and the per-user daily limit.
create unique index if not exists plan_versions_business_version on public.plan_versions (business_id, version);
create index if not exists plan_versions_creator_time on public.plan_versions (created_by, created_at);
