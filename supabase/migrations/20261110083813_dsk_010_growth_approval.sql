-- Phase 6: growth assumptions — system-suggested vs DSK-operator-approved, kept side by side.
-- The approval stamp (who, when) is written by the database from the signed-in user, never by the client:
--   * approved_pct null      → approval cleared (approved_by / approved_at null)
--   * approved_pct set/changed, or newly approved → approved_by = auth.uid(), approved_at = now()
--   * re-saving the same approved value keeps the original stamp
create or replace function private.stamp_growth_approval() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.approved_pct is null then
    new.approved_by := null;
    new.approved_at := null;
  elsif tg_op = 'INSERT' or old.approved_pct is null or new.approved_pct is distinct from old.approved_pct then
    new.approved_by := coalesce((select auth.uid()), new.approved_by);
    new.approved_at := now();
  else
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_growth_approval() from public, anon, authenticated;

create trigger growth_approval_stamp before insert or update on public.growth_assumptions
  for each row execute function private.stamp_growth_approval();

alter table public.growth_assumptions
  add constraint growth_pct_sane check (
    suggested_pct between -50 and 100
    and (approved_pct is null or approved_pct between -50 and 100)
  );

-- Text answers stay short (they feed the plan narrative as data, never as instructions).
alter table public.future_plans
  add constraint future_plan_text_len check (
    coalesce(length(loan_goal), 0) <= 500 and coalesce(length(three_year_vision), 0) <= 500
  );
alter table public.marketing_plans
  add constraint marketing_text_len check (
    coalesce(length(target_customers), 0) <= 500 and coalesce(length(current_customer_base), 0) <= 500
    and coalesce(length(competitive_advantage), 0) <= 500 and coalesce(length(pricing_strategy), 0) <= 60
  );
