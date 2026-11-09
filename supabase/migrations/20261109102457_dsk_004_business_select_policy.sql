-- DSK 004 — fix: `insert into businesses ... returning *` (supabase-js `.insert().select()`) was rejected.
-- biz_select called can_access_business(id), which looks the business up in its own table; a row that is
-- still being inserted is not visible to that lookup, so the RETURNING check failed. Check the row's own
-- entrepreneur_id instead (same rule, works for new rows, one lookup fewer).
drop policy biz_select on businesses;
create policy biz_select on businesses for select to authenticated using (
  exists (select 1 from entrepreneurs e where e.id = entrepreneur_id
          and ((select private.auth_role()) in ('admin','reviewer') or e.center_id = (select private.auth_center()))));
