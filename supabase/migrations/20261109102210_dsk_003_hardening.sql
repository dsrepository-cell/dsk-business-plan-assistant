-- =====================================================================
-- DSK 003 — hardening on top of the kit schema (001) without changing the data model.
-- Every change here is either a Supabase advisor fix or a closed access gap.
--
--  A. Security-definer helpers move to schema `private` (not exposed by the REST API),
--     so they can't be called as /rpc endpoints. Policies and triggers reference functions
--     by OID, so they keep working after the move.            [lints 0028, 0029]
--  B. set_updated_at gets a fixed search_path.                  [lint 0011]
--  C. pg_trgm moves out of `public` into `extensions`.          [lint 0014]
--  D. "for all" write policies split into insert/update/delete so SELECT has one policy;
--     auth.uid()/helper calls wrapped in (select ...) so they run once per query.
--                                                               [lints 0003, 0006]
--  E. GAP: plan approval guard ran only on UPDATE — an operator could INSERT a plan that was
--     already 'approved'. Now runs on INSERT too, can't be forged, and an approved plan is
--     read-only for operators.
--  F. GAP: an operator could UPDATE a business to point at an entrepreneur in another centre
--     (the old WITH CHECK looked up the row before the change). Now checked on the new value.
--  G. Storage policy no longer errors on a path whose first folder isn't a UUID.
--  H. Indexes for every foreign key.                            [lint 0001]
-- =====================================================================

-- ---------- A. private schema for helpers ----------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.auth_role()                set schema private;
alter function public.auth_center()              set schema private;
alter function public.can_access_business(uuid)  set schema private;
alter function public.handle_new_user()          set schema private;
alter function public.guard_plan_approval()      set schema private;
alter function public.set_updated_at()           set schema private;

-- functions used inside RLS must be executable by signed-in users (policies run as the caller)
revoke all on function private.auth_role(), private.auth_center(), private.can_access_business(uuid) from public, anon;
grant execute on function private.auth_role(), private.auth_center(), private.can_access_business(uuid) to authenticated;
-- trigger functions need no caller EXECUTE privilege at all
revoke all on function private.handle_new_user(), private.guard_plan_approval(), private.set_updated_at() from public, anon, authenticated;

-- re-point bodies that referenced the helpers by name
create or replace function private.can_access_business(b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.businesses bz join public.entrepreneurs e on e.id = bz.entrepreneur_id
    where bz.id = b and (private.auth_role() in ('admin','reviewer') or e.center_id = private.auth_center())
  )
$$;
create or replace function private.auth_role() returns public.app_role
language sql stable security definer set search_path = '' as
$$ select role from public.profiles where id = (select auth.uid()) $$;
create or replace function private.auth_center() returns uuid
language sql stable security definer set search_path = '' as
$$ select center_id from public.profiles where id = (select auth.uid()) $$;
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end $$;

-- ---------- B. ----------
create or replace function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- C. ----------
alter extension pg_trgm set schema extensions;

-- ---------- D. policies ----------
-- reference data: one SELECT policy; admin writes split by command
drop policy ref_admin_sectors   on sectors;
drop policy ref_admin_questions on sector_questions;
drop policy ref_admin_heads     on expense_heads;
do $$
declare t text;
begin
  foreach t in array array['sectors','sector_questions','expense_heads'] loop
    execute format('create policy %I_admin_insert on %I for insert to authenticated with check ((select private.auth_role()) = ''admin'')', t, t);
    execute format('create policy %I_admin_update on %I for update to authenticated using ((select private.auth_role()) = ''admin'') with check ((select private.auth_role()) = ''admin'')', t, t);
    execute format('create policy %I_admin_delete on %I for delete to authenticated using ((select private.auth_role()) = ''admin'')', t, t);
  end loop;
end $$;

drop policy profiles_self_read   on profiles;
drop policy profiles_admin_write on profiles;
create policy profiles_read on profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.auth_role()) = 'admin');
create policy profiles_admin_update on profiles for update to authenticated
  using ((select private.auth_role()) = 'admin') with check ((select private.auth_role()) = 'admin');

drop policy centers_read  on dsk_centers;
drop policy centers_admin on dsk_centers;
create policy centers_read on dsk_centers for select to authenticated
  using ((select private.auth_role()) in ('admin','reviewer') or id = (select private.auth_center()));
create policy centers_admin_insert on dsk_centers for insert to authenticated with check ((select private.auth_role()) = 'admin');
create policy centers_admin_update on dsk_centers for update to authenticated
  using ((select private.auth_role()) = 'admin') with check ((select private.auth_role()) = 'admin');
create policy centers_admin_delete on dsk_centers for delete to authenticated using ((select private.auth_role()) = 'admin');

drop policy ent_select on entrepreneurs;
drop policy ent_insert on entrepreneurs;
drop policy ent_update on entrepreneurs;
create policy ent_select on entrepreneurs for select to authenticated
  using ((select private.auth_role()) in ('admin','reviewer') or center_id = (select private.auth_center()));
create policy ent_insert on entrepreneurs for insert to authenticated
  with check (center_id = (select private.auth_center()) and created_by = (select auth.uid()));
create policy ent_update on entrepreneurs for update to authenticated
  using ((select private.auth_role()) = 'admin' or center_id = (select private.auth_center()))
  with check ((select private.auth_role()) = 'admin' or center_id = (select private.auth_center()));

-- ---------- F. businesses: check the NEW entrepreneur on insert and update ----------
drop policy biz_select on businesses;
drop policy biz_insert on businesses;
drop policy biz_update on businesses;
create policy biz_select on businesses for select to authenticated using (private.can_access_business(id));
create policy biz_insert on businesses for insert to authenticated with check (
  exists (select 1 from entrepreneurs e where e.id = entrepreneur_id
          and ((select private.auth_role()) = 'admin' or e.center_id = (select private.auth_center()))));
create policy biz_update on businesses for update to authenticated
  using (private.can_access_business(id))
  with check (exists (select 1 from entrepreneurs e where e.id = entrepreneur_id
          and ((select private.auth_role()) in ('admin','reviewer') or e.center_id = (select private.auth_center()))));

-- child tables: one SELECT policy, writes split by command
do $$
declare t text;
begin
  foreach t in array array['products','expenses','assets','loan_requests','future_plans','marketing_plans','growth_assumptions','documents'] loop
    execute format('drop policy %I on %I', t || '_write', t);
    execute format('create policy %I on %I for insert to authenticated with check (private.can_access_business(business_id))', t || '_insert', t);
    execute format('create policy %I on %I for update to authenticated using (private.can_access_business(business_id)) with check (private.can_access_business(business_id))', t || '_update', t);
    execute format('create policy %I on %I for delete to authenticated using (private.can_access_business(business_id))', t || '_delete', t);
  end loop;
end $$;

drop policy audit_admin_read on audit_log;
create policy audit_admin_read on audit_log for select to authenticated using ((select private.auth_role()) = 'admin');

-- ---------- E. plan approval guard ----------
create or replace function private.guard_plan_approval() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  is_reviewer boolean := coalesce(private.auth_role()::text, '') in ('admin', 'reviewer');
begin
  -- An approved plan is frozen for operators (they generate a new version instead).
  if tg_op = 'UPDATE' and old.status = 'approved' and not is_reviewer then
    raise exception 'This plan is approved and can only be changed by a reviewer or admin';
  end if;

  if new.status = 'approved' then
    if tg_op = 'INSERT' or old.status is distinct from 'approved' then
      if not is_reviewer then
        raise exception 'Only a reviewer or admin can approve a business plan';
      end if;
      new.approved_by := auth.uid();
      new.approved_at := now();
    end if;
  else
    -- approval stamps can't be written by hand on a non-approved plan
    new.approved_by := null;
    new.approved_at := null;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  end if;
  return new;
end $$;
revoke all on function private.guard_plan_approval() from public, anon, authenticated;

drop trigger plan_approval_guard on plan_versions;
create trigger plan_approval_guard before insert or update on plan_versions
  for each row execute function private.guard_plan_approval();

drop policy plans_select on plan_versions;
drop policy plans_insert on plan_versions;
drop policy plans_update on plan_versions;
create policy plans_select on plan_versions for select to authenticated using (private.can_access_business(business_id));
create policy plans_insert on plan_versions for insert to authenticated with check (private.can_access_business(business_id));
create policy plans_update on plan_versions for update to authenticated
  using (private.can_access_business(business_id)) with check (private.can_access_business(business_id));

-- ---------- G. storage ----------
drop policy storage_docs_rw on storage.objects;
create or replace function private.can_access_storage_path(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when (storage.foldername(path))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then private.can_access_business(((storage.foldername(path))[1])::uuid)
    else false
  end
$$;
revoke all on function private.can_access_storage_path(text) from public, anon;
grant execute on function private.can_access_storage_path(text) to authenticated;

create policy dsk_files_select on storage.objects for select to authenticated
  using (bucket_id in ('documents','plans') and private.can_access_storage_path(name));
create policy dsk_files_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('documents','plans') and private.can_access_storage_path(name));
create policy dsk_files_update on storage.objects for update to authenticated
  using (bucket_id in ('documents','plans') and private.can_access_storage_path(name))
  with check (bucket_id in ('documents','plans') and private.can_access_storage_path(name));
create policy dsk_files_delete on storage.objects for delete to authenticated
  using (bucket_id in ('documents','plans') and private.can_access_storage_path(name));

-- ---------- H. foreign-key indexes ----------
create index if not exists businesses_sector          on businesses (sector_id);
create index if not exists documents_business         on documents (business_id);
create index if not exists documents_uploaded_by      on documents (uploaded_by);
create index if not exists dsk_centers_district       on dsk_centers (district_id);
create index if not exists entrepreneurs_created_by   on entrepreneurs (created_by);
create index if not exists entrepreneurs_place        on entrepreneurs (place_id);
create index if not exists expense_heads_sector       on expense_heads (sector_id);
create index if not exists expenses_head              on expenses (head_id);
create index if not exists growth_assumptions_approver on growth_assumptions (approved_by);
create index if not exists plan_versions_approved_by  on plan_versions (approved_by);
create index if not exists plan_versions_created_by   on plan_versions (created_by);
create index if not exists profiles_center            on profiles (center_id);
