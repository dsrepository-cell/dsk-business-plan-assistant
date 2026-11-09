-- =====================================================================
-- DSK Business Plan Assistant — Supabase schema (v1)
-- Apply with the Supabase MCP `apply_migration` tool (name: dsk_001_schema),
-- or `supabase db push`. Safe to read top to bottom.
--
-- Design rules
--   1. One source of truth: products / expenses / assets / loan are stored ONCE.
--      Revenue, margins, EMI, projections are COMPUTED (view or engine), never stored as inputs.
--   2. Every table has RLS. Operators see only their DSK centre's cases.
--   3. Plans are versioned snapshots: the numbers used are frozen in engine_snapshot.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------- enums ----------
create type app_role        as enum ('admin', 'reviewer', 'operator');
create type expense_freq    as enum ('monthly', 'weekly', 'quarterly', 'yearly');
create type business_stage  as enum ('existing', 'new');
create type case_status     as enum ('draft', 'assumptions_pending', 'ready_for_review', 'approved', 'submitted');
create type expense_class   as enum ('direct', 'operating', 'finance');
create type plan_status     as enum ('generated', 'edited', 'approved', 'superseded');

-- ---------- helpers ----------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- location (standard India hierarchy; filled by 06_location/import_pincodes.py) ----------
create table loc_states    (id serial primary key, name text not null unique);
create table loc_districts (id serial primary key, state_id int not null references loc_states(id), name text not null, unique (state_id, name));
create table loc_taluks    (id serial primary key, district_id int not null references loc_districts(id), name text not null, unique (district_id, name)); -- Mandal / Taluk / Block
create table loc_places    (id serial primary key, taluk_id int not null references loc_taluks(id), name text not null, pincode char(6) not null); -- village / post-office area
create index loc_places_pincode_idx on loc_places (pincode);
create index loc_places_name_trgm  on loc_places using gin (name gin_trgm_ops);
create index loc_districts_state   on loc_districts (state_id);
create index loc_taluks_district   on loc_taluks (district_id);
create index loc_places_taluk      on loc_places (taluk_id);

-- ---------- org ----------
create table dsk_centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district_id int references loc_districts(id),
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role app_role not null default 'operator',
  center_id uuid references dsk_centers(id),
  preferred_language text not null default 'en',
  created_at timestamptz not null default now()
);

-- auto-create a profile when a user signs up (role defaults to operator; admin promotes manually)
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create or replace function auth_role() returns app_role language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;
create or replace function auth_center() returns uuid language sql stable security definer set search_path = public as
$$ select center_id from profiles where id = auth.uid() $$;

-- ---------- sector framework (config-driven: new industry = new rows, no code change) ----------
create table sectors (
  id text primary key,                 -- 'dairy', 'tailoring', ...
  name text not null,
  icon text not null,                  -- lucide icon name
  tint text,
  default_unit text,
  active boolean not null default true,
  sort_order int not null default 0
);

create table sector_questions (
  id uuid primary key default gen_random_uuid(),
  sector_id text not null references sectors(id) on delete cascade,
  key text not null,
  label text not null,
  label_i18n jsonb not null default '{}',   -- {"te": "...", "hi": "..."}
  icon text,
  type text not null check (type in ('text','number','select','yesno','multiselect')),
  options jsonb,
  placeholder text,
  required boolean not null default false,
  stage business_stage,                      -- null = ask for both; set to limit to existing/new
  show_if jsonb,                             -- e.g. {"key":"custom","equals":"Custom-made"}
  sort_order int not null default 0,
  unique (sector_id, key)
);

create table expense_heads (
  id uuid primary key default gen_random_uuid(),
  sector_id text references sectors(id) on delete cascade,  -- null = common to all sectors
  name text not null,
  class expense_class not null default 'operating',
  name_i18n jsonb not null default '{}',
  sort_order int not null default 0
);

-- ---------- people & businesses ----------
create table entrepreneurs (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references dsk_centers(id),
  created_by uuid not null references auth.users(id),
  full_name text not null,
  gender text,
  date_of_birth date,
  mobile text,
  education text,
  social_category text,
  household_members int,
  earning_members int,
  dependents int,
  monthly_family_income numeric(12,2),
  place_id int references loc_places(id),   -- ONE place of truth: state/district/taluk derive from it
  address_note text,
  consent_given_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger entrepreneurs_touch before update on entrepreneurs for each row execute function set_updated_at();
create index entrepreneurs_center on entrepreneurs (center_id);

create table businesses (
  id uuid primary key default gen_random_uuid(),
  entrepreneur_id uuid not null references entrepreneurs(id) on delete cascade,
  sector_id text not null references sectors(id),
  stage business_stage not null,
  business_name text,
  sector_answers jsonb not null default '{}',   -- answers to sector_questions, keyed by question key
  stated_monthly_turnover numeric(12,2),        -- what she SAYS; used only for cross-check validation
  status case_status not null default 'draft',
  current_step text,                            -- for "save draft / resume"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger businesses_touch before update on businesses for each row execute function set_updated_at();
create index businesses_entrepreneur on businesses (entrepreneur_id);

-- ---------- the one place revenue/cost inputs live ----------
create table products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  category text,
  unit text,
  qty_per_month numeric(14,2) not null default 0 check (qty_per_month >= 0),
  selling_price numeric(14,2) not null default 0 check (selling_price >= 0),
  direct_cost_per_unit numeric(14,2) not null default 0 check (direct_cost_per_unit >= 0),
  other_cost_per_unit numeric(14,2) not null default 0 check (other_cost_per_unit >= 0),
  max_capacity_per_month numeric(14,2),
  seasonal boolean not null default false,
  sort_order int not null default 0
);
create index products_business on products (business_id);

-- costing is derived, not entered twice
create view product_costing with (security_invoker = true) as
select
  p.*,
  (p.direct_cost_per_unit + p.other_cost_per_unit)                              as total_cost_per_unit,
  p.qty_per_month * p.selling_price                                             as revenue_per_month,
  p.qty_per_month * (p.direct_cost_per_unit + p.other_cost_per_unit)            as cost_per_month,
  p.qty_per_month * (p.selling_price - p.direct_cost_per_unit - p.other_cost_per_unit) as gross_profit_per_month,
  case when p.qty_per_month * p.selling_price > 0
       then round(100 * (p.selling_price - p.direct_cost_per_unit - p.other_cost_per_unit) / p.selling_price, 2)
       else 0 end                                                               as gross_margin_pct
from products p;

create table expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  head_id uuid references expense_heads(id),
  custom_head text,
  amount numeric(14,2) not null check (amount >= 0),
  frequency expense_freq not null default 'monthly',
  monthly_amount numeric(14,2) generated always as (
    case frequency
      when 'monthly'   then amount
      when 'weekly'    then amount * 52 / 12
      when 'quarterly' then amount / 3
      when 'yearly'    then amount / 12
    end) stored,
  check (head_id is not null or custom_head is not null)
);
create index expenses_business on expenses (business_id);

create table assets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  kind text,                              -- machinery | equipment | stock | vehicle | other
  qty numeric(10,2) not null default 1,
  unit_cost numeric(14,2) not null default 0,
  is_proposed boolean not null default true,   -- true = to be bought with the loan; false = already owned
  quotation_doc_id uuid
);
create index assets_business on assets (business_id);

create table loan_requests (
  business_id uuid primary key references businesses(id) on delete cascade,
  other_setup_cost numeric(14,2) not null default 0,
  own_contribution numeric(14,2) not null default 0,
  requested_amount numeric(14,2),
  tenure_months int not null default 36,
  interest_rate_pct numeric(5,2) not null default 11.5,
  moratorium_months int not null default 2,
  existing_monthly_emi numeric(14,2) not null default 0,
  purpose text,
  updated_at timestamptz not null default now()
);

create table future_plans (
  business_id uuid primary key references businesses(id) on delete cascade,
  goals text[] not null default '{}',     -- engine Goal keys
  loan_goal text,
  three_year_vision text
);

create table marketing_plans (
  business_id uuid primary key references businesses(id) on delete cascade,
  target_customers text,
  current_customer_base text,
  current_channels text[] not null default '{}',
  proposed_channels text[] not null default '{}',
  pricing_strategy text,
  competitive_advantage text
);

-- suggested vs operator-approved, kept side by side
create table growth_assumptions (
  business_id uuid not null references businesses(id) on delete cascade,
  year smallint not null check (year between 1 and 3),
  suggested_pct numeric(5,2) not null,
  suggested_reasons jsonb not null default '[]',
  approved_pct numeric(5,2),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  primary key (business_id, year)
);

-- ---------- generated output (versioned, frozen) ----------
create table plan_versions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  version int not null,
  status plan_status not null default 'generated',
  engine_snapshot jsonb not null,        -- every number in the document, frozen
  narrative jsonb not null default '{}', -- AI prose keyed by section
  narrative_warnings jsonb not null default '[]',  -- number-guard findings
  model text,
  prompt_version text,
  pdf_path text,                         -- storage path in bucket 'plans'
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, version)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  doc_type text not null,                -- aadhaar | pan | bank_passbook | quotation | udyam | fssai | photo | other
  storage_path text not null,            -- bucket 'documents'
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now()
);

create table audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null,
  table_name text,
  row_id text,
  detail jsonb
);

-- =====================================================================
-- Row Level Security
-- =====================================================================
create or replace function can_access_business(b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from businesses bz join entrepreneurs e on e.id = bz.entrepreneur_id
    where bz.id = b and (auth_role() in ('admin','reviewer') or e.center_id = auth_center())
  )
$$;

alter table profiles          enable row level security;
alter table dsk_centers       enable row level security;
alter table entrepreneurs     enable row level security;
alter table businesses        enable row level security;
alter table products          enable row level security;
alter table expenses          enable row level security;
alter table assets            enable row level security;
alter table loan_requests     enable row level security;
alter table future_plans      enable row level security;
alter table marketing_plans   enable row level security;
alter table growth_assumptions enable row level security;
alter table plan_versions     enable row level security;
alter table documents         enable row level security;
alter table audit_log         enable row level security;
alter table sectors           enable row level security;
alter table sector_questions  enable row level security;
alter table expense_heads     enable row level security;
alter table loc_states        enable row level security;
alter table loc_districts     enable row level security;
alter table loc_taluks        enable row level security;
alter table loc_places        enable row level security;

-- reference data: any signed-in user can read
create policy ref_read_sectors   on sectors          for select to authenticated using (true);
create policy ref_read_questions on sector_questions for select to authenticated using (true);
create policy ref_read_heads     on expense_heads    for select to authenticated using (true);
create policy ref_read_states    on loc_states       for select to authenticated using (true);
create policy ref_read_districts on loc_districts    for select to authenticated using (true);
create policy ref_read_taluks    on loc_taluks       for select to authenticated using (true);
create policy ref_read_places    on loc_places       for select to authenticated using (true);
-- reference data writes: admin only
create policy ref_admin_sectors   on sectors          for all to authenticated using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy ref_admin_questions on sector_questions for all to authenticated using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy ref_admin_heads     on expense_heads    for all to authenticated using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- org
create policy profiles_self_read  on profiles for select to authenticated using (id = auth.uid() or auth_role() = 'admin');
create policy profiles_admin_write on profiles for update to authenticated using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy centers_read on dsk_centers for select to authenticated using (auth_role() in ('admin','reviewer') or id = auth_center());
create policy centers_admin on dsk_centers for all to authenticated using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- entrepreneurs
create policy ent_select on entrepreneurs for select to authenticated using (auth_role() in ('admin','reviewer') or center_id = auth_center());
create policy ent_insert on entrepreneurs for insert to authenticated with check (center_id = auth_center() and created_by = auth.uid());
create policy ent_update on entrepreneurs for update to authenticated using (auth_role() = 'admin' or center_id = auth_center()) with check (auth_role() = 'admin' or center_id = auth_center());

-- businesses
create policy biz_select on businesses for select to authenticated using (can_access_business(id));
create policy biz_insert on businesses for insert to authenticated with check (
  exists (select 1 from entrepreneurs e where e.id = entrepreneur_id and (auth_role() = 'admin' or e.center_id = auth_center())));
create policy biz_update on businesses for update to authenticated using (can_access_business(id)) with check (can_access_business(id));

-- child tables keyed by business_id
do $$
declare t text;
begin
  foreach t in array array['products','expenses','assets','loan_requests','future_plans','marketing_plans','growth_assumptions','documents'] loop
    execute format('create policy %I_select on %I for select to authenticated using (can_access_business(business_id))', t, t);
    execute format('create policy %I_write  on %I for all    to authenticated using (can_access_business(business_id)) with check (can_access_business(business_id))', t, t);
  end loop;
end $$;

-- plan versions: operators can read/create/edit; only reviewer/admin can approve (enforced by trigger below)
create policy plans_select on plan_versions for select to authenticated using (can_access_business(business_id));
create policy plans_insert on plan_versions for insert to authenticated with check (can_access_business(business_id));
create policy plans_update on plan_versions for update to authenticated using (can_access_business(business_id)) with check (can_access_business(business_id));

create or replace function guard_plan_approval() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    if auth_role() not in ('admin','reviewer') then
      raise exception 'Only a reviewer or admin can approve a business plan';
    end if;
    new.approved_by := auth.uid();
    new.approved_at := now();
  end if;
  return new;
end $$;
create trigger plan_approval_guard before update on plan_versions for each row execute function guard_plan_approval();

-- audit: admin read only; writes happen through service role
create policy audit_admin_read on audit_log for select to authenticated using (auth_role() = 'admin');

-- =====================================================================
-- Storage buckets (private). Path convention: <business_id>/<filename>
-- =====================================================================
insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('plans', 'plans', false) on conflict (id) do nothing;

create policy storage_docs_rw on storage.objects for all to authenticated
  using (bucket_id in ('documents','plans') and can_access_business(((storage.foldername(name))[1])::uuid))
  with check (bucket_id in ('documents','plans') and can_access_business(((storage.foldername(name))[1])::uuid));
