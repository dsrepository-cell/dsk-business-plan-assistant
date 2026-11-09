-- DSK 006 — create a new case (entrepreneur + business) in one call, atomically.
-- SECURITY INVOKER: runs with the caller's rights, so every RLS policy still applies
-- (an operator can only create in her own centre). Without this, a failure between the two
-- inserts would leave an orphan entrepreneur the operator can't delete.
create or replace function public.create_case(p_sector_id text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_center uuid := private.auth_center();
  v_ent uuid;
  v_biz uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if v_center is null then
    raise exception 'Your account is not linked to a DSK centre. Ask an admin to assign one.';
  end if;
  if not exists (select 1 from public.sectors where id = p_sector_id and active) then
    raise exception 'Unknown industry: %', p_sector_id;
  end if;

  insert into public.entrepreneurs (center_id, created_by) values (v_center, auth.uid()) returning id into v_ent;
  insert into public.businesses (entrepreneur_id, sector_id, current_step)
    values (v_ent, p_sector_id, 'location') returning id into v_biz;
  return v_biz;
end $$;

revoke all on function public.create_case(text) from public, anon;
grant execute on function public.create_case(text) to authenticated;
