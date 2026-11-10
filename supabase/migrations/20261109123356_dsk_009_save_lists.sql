-- Phase 5: save a whole list (products / expenses / assets) in ONE transaction.
-- SECURITY INVOKER: every statement runs as the signed-in operator, so the RLS policies on each table decide
-- what she may touch. A row id from the client is only honoured if it already belongs to THIS case; otherwise
-- the row is inserted fresh (so a tampered id can never move or overwrite another case's row).
-- Rows not in the submitted list are deleted. Ids of unchanged rows are kept (assets may later link quotations).

create or replace function public.save_products(p_business_id uuid, p_rows jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r jsonb;
  i int := 0;
  keep uuid[] := '{}';
  rid uuid;
begin
  perform 1 from public.businesses where id = p_business_id;
  if not found then raise exception 'case not found' using errcode = 'P0002'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'rows must be a JSON array'; end if;

  for r in select value from jsonb_array_elements(p_rows) loop
    i := i + 1;
    rid := nullif(r->>'id', '')::uuid;
    if rid is not null then
      update public.products set
        name = r->>'name',
        unit = nullif(r->>'unit', ''),
        qty_per_month = (r->>'qty_per_month')::numeric,
        selling_price = (r->>'selling_price')::numeric,
        direct_cost_per_unit = (r->>'direct_cost_per_unit')::numeric,
        other_cost_per_unit = (r->>'other_cost_per_unit')::numeric,
        max_capacity_per_month = nullif(r->>'max_capacity_per_month', '')::numeric,
        sort_order = i
      where id = rid and business_id = p_business_id;
      if not found then rid := null; end if;
    end if;
    if rid is null then
      insert into public.products (business_id, name, unit, qty_per_month, selling_price, direct_cost_per_unit,
                                   other_cost_per_unit, max_capacity_per_month, sort_order)
      values (p_business_id, r->>'name', nullif(r->>'unit', ''), (r->>'qty_per_month')::numeric,
              (r->>'selling_price')::numeric, (r->>'direct_cost_per_unit')::numeric,
              (r->>'other_cost_per_unit')::numeric, nullif(r->>'max_capacity_per_month', '')::numeric, i)
      returning id into rid;
    end if;
    keep := keep || rid;
  end loop;

  delete from public.products where business_id = p_business_id and id <> all (keep);
end;
$$;

create or replace function public.save_expenses(p_business_id uuid, p_rows jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r jsonb;
  keep uuid[] := '{}';
  rid uuid;
begin
  perform 1 from public.businesses where id = p_business_id;
  if not found then raise exception 'case not found' using errcode = 'P0002'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'rows must be a JSON array'; end if;

  for r in select value from jsonb_array_elements(p_rows) loop
    rid := nullif(r->>'id', '')::uuid;
    if rid is not null then
      update public.expenses set
        head_id = nullif(r->>'head_id', '')::uuid,
        custom_head = nullif(r->>'custom_head', ''),
        amount = (r->>'amount')::numeric,
        frequency = (r->>'frequency')::public.expense_freq
      where id = rid and business_id = p_business_id;
      if not found then rid := null; end if;
    end if;
    if rid is null then
      insert into public.expenses (business_id, head_id, custom_head, amount, frequency)
      values (p_business_id, nullif(r->>'head_id', '')::uuid, nullif(r->>'custom_head', ''),
              (r->>'amount')::numeric, (r->>'frequency')::public.expense_freq)
      returning id into rid;
    end if;
    keep := keep || rid;
  end loop;

  delete from public.expenses where business_id = p_business_id and id <> all (keep);
end;
$$;

-- Assets + the two loan_requests figures entered on the same screen, saved together.
create or replace function public.save_assets(p_business_id uuid, p_rows jsonb, p_other_setup_cost numeric,
                                              p_own_contribution numeric)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r jsonb;
  keep uuid[] := '{}';
  rid uuid;
begin
  perform 1 from public.businesses where id = p_business_id;
  if not found then raise exception 'case not found' using errcode = 'P0002'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'rows must be a JSON array'; end if;

  for r in select value from jsonb_array_elements(p_rows) loop
    rid := nullif(r->>'id', '')::uuid;
    if rid is not null then
      update public.assets set
        name = r->>'name',
        qty = (r->>'qty')::numeric,
        unit_cost = (r->>'unit_cost')::numeric
      where id = rid and business_id = p_business_id;
      if not found then rid := null; end if;
    end if;
    if rid is null then
      insert into public.assets (business_id, name, qty, unit_cost, is_proposed)
      values (p_business_id, r->>'name', (r->>'qty')::numeric, (r->>'unit_cost')::numeric, true)
      returning id into rid;
    end if;
    keep := keep || rid;
  end loop;

  delete from public.assets where business_id = p_business_id and id <> all (keep);

  insert into public.loan_requests (business_id, other_setup_cost, own_contribution)
  values (p_business_id, coalesce(p_other_setup_cost, 0), coalesce(p_own_contribution, 0))
  on conflict (business_id) do update
    set other_setup_cost = excluded.other_setup_cost, own_contribution = excluded.own_contribution;
end;
$$;

revoke all on function public.save_products(uuid, jsonb) from public, anon;
revoke all on function public.save_expenses(uuid, jsonb) from public, anon;
revoke all on function public.save_assets(uuid, jsonb, numeric, numeric) from public, anon;
grant execute on function public.save_products(uuid, jsonb) to authenticated;
grant execute on function public.save_expenses(uuid, jsonb) to authenticated;
grant execute on function public.save_assets(uuid, jsonb, numeric, numeric) to authenticated;

-- Sanity limits the app also enforces (defence in depth).
alter table public.loan_requests
  add constraint loan_terms_sane check (
    tenure_months between 1 and 240
    and moratorium_months >= 0 and moratorium_months < tenure_months
    and interest_rate_pct >= 0 and interest_rate_pct <= 50
    and other_setup_cost >= 0 and own_contribution >= 0 and existing_monthly_emi >= 0
    and (requested_amount is null or requested_amount >= 0)
  );
alter table public.assets
  add constraint assets_amounts_sane check (qty > 0 and unit_cost >= 0);
