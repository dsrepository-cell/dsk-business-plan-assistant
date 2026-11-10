-- RLS + approval-guard proof. Run as the database owner (SQL editor / MCP execute_sql).
-- Each step switches to the real `authenticated` role with a user's JWT claims, so every
-- policy and trigger applies exactly as it would for a request from the app.
-- Creates its own fixture cases and deletes them at the end. Returns one row per check.
do $$
declare
  ua uuid := (select id from auth.users where email = 'operator.a@dsk.test');
  ub uuid := (select id from auth.users where email = 'operator.b@dsk.test');
  ur uuid := (select id from auth.users where email = 'reviewer@dsk.test');
  ca uuid := (select center_id from public.profiles where id = ua);
  cb uuid := (select center_id from public.profiles where id = ub);
  ea uuid; eb uuid; ba uuid; bb uuid; pa uuid; pb uuid; plan_a uuid; plan_x uuid;
  n int; ok boolean; v text; res jsonb := '[]';

begin

  -------------------------------------------------------------- fixtures, created THROUGH RLS
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.entrepreneurs (center_id, created_by, full_name) values (ca, ua, 'RLS test — A') returning id into ea;
  insert into public.businesses (entrepreneur_id, sector_id, stage) values (ea, 'foodprocessing', 'existing') returning id into ba;
  insert into public.products (business_id, name, qty_per_month, selling_price, direct_cost_per_unit) values (ba, 'Pickle', 500, 120, 70) returning id into pa;
  insert into public.plan_versions (business_id, version, engine_snapshot) values (ba, 1, '{}') returning id into plan_a;

  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  insert into public.entrepreneurs (center_id, created_by, full_name) values (cb, ub, 'RLS test — B') returning id into eb;
  insert into public.businesses (entrepreneur_id, sector_id, stage) values (eb, 'tailoring', 'new') returning id into bb;
  insert into public.products (business_id, name, qty_per_month, selling_price) values (bb, 'Blouse', 40, 350) returning id into pb;

  -------------------------------------------------------------- as Operator A
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);

  select count(*) into n from public.entrepreneurs;
  res := res || jsonb_build_object('check','01 A sees only own centre''s entrepreneurs','expected','1','actual',n::text,'pass',n=1);

  select count(*) into n from public.entrepreneurs where id = eb;
  res := res || jsonb_build_object('check','02 A cannot read B''s entrepreneur','expected','0','actual',n::text,'pass',n=0);

  select count(*) into n from public.businesses where id = bb;
  res := res || jsonb_build_object('check','03 A cannot read B''s business','expected','0','actual',n::text,'pass',n=0);

  select count(*) into n from public.product_costing where business_id = bb;
  res := res || jsonb_build_object('check','04 A cannot read B''s products (costing view)','expected','0','actual',n::text,'pass',n=0);

  select revenue_per_month::text into v from public.product_costing where id = pa;
  res := res || jsonb_build_object('check','05 costing view computes A''s revenue (500 x 120)','expected','60000','actual',v,'pass',v::numeric = 60000);

  update public.products set selling_price = 1 where id = pb; get diagnostics n = row_count;
  res := res || jsonb_build_object('check','06 A cannot update B''s product','expected','0 rows','actual',n||' rows','pass',n=0);

  begin
    insert into public.products (business_id, name) values (bb, 'injected'); ok := false; v := 'inserted';
  exception when others then ok := true; v := sqlerrm; end;
  res := res || jsonb_build_object('check','07 A cannot add a product to B''s business','expected','blocked','actual',v,'pass',ok);

  begin
    insert into public.entrepreneurs (center_id, created_by, full_name) values (cb, ua, 'x'); ok := false; v := 'inserted';
  exception when others then ok := true; v := sqlerrm; end;
  res := res || jsonb_build_object('check','08 A cannot create an entrepreneur in Centre B','expected','blocked','actual',v,'pass',ok);

  begin
    update public.businesses set entrepreneur_id = eb where id = ba; ok := false; v := 'moved';
  exception when others then ok := true; v := sqlerrm; end;
  res := res || jsonb_build_object('check','09 A cannot move her case under B''s entrepreneur','expected','blocked','actual',v,'pass',ok);

  update public.profiles set role = 'admin' where id = ua; get diagnostics n = row_count;
  res := res || jsonb_build_object('check','10 A cannot promote herself to admin','expected','0 rows','actual',n||' rows','pass',n=0);

  begin
    update public.plan_versions set status = 'approved' where id = plan_a; ok := false; v := 'approved';
  exception when others then ok := true; v := sqlerrm; end;
  res := res || jsonb_build_object('check','11 operator cannot approve a plan (update)','expected','blocked','actual',v,'pass',ok);

  begin
    insert into public.plan_versions (business_id, version, status, engine_snapshot) values (ba, 2, 'approved', '{}'); ok := false; v := 'inserted approved';
  exception when others then ok := true; v := sqlerrm; end;
  res := res || jsonb_build_object('check','12 operator cannot insert an already-approved plan','expected','blocked','actual',v,'pass',ok);

  insert into public.plan_versions (business_id, version, engine_snapshot, approved_by, approved_at, created_by)
    values (ba, 3, '{}', ur, now(), ur) returning id into plan_x;
  select coalesce(approved_by::text,'null') || ' / created_by=' || case when created_by = ua then 'A' else 'forged' end
    into v from public.plan_versions where id = plan_x;
  res := res || jsonb_build_object('check','13 approval stamps and author cannot be forged','expected','null / created_by=A','actual',v,'pass',v='null / created_by=A');

  ok := private.can_access_storage_path(bb::text || '/aadhaar.jpg');
  res := res || jsonb_build_object('check','14 A cannot open files under B''s case folder','expected','false','actual',ok::text,'pass',not ok);
  ok := private.can_access_storage_path('not-a-uuid/x.pdf');
  res := res || jsonb_build_object('check','15 malformed storage path is denied (no error)','expected','false','actual',ok::text,'pass',not ok);

  -------------------------------------------------------------- as Reviewer
  perform set_config('request.jwt.claims', json_build_object('sub', ur, 'role', 'authenticated')::text, true);

  select count(*) into n from public.entrepreneurs where id in (ea, eb);
  res := res || jsonb_build_object('check','16 reviewer sees cases from both centres','expected','2','actual',n::text,'pass',n=2);

  update public.plan_versions set status = 'approved' where id = plan_a;
  select case when approved_by = ur and approved_at is not null then 'approved by reviewer' else 'not stamped' end into v
    from public.plan_versions where id = plan_a;
  res := res || jsonb_build_object('check','17 reviewer can approve; stamp set by DB','expected','approved by reviewer','actual',v,'pass',v='approved by reviewer');

  -------------------------------------------------------------- back to Operator A
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  begin
    update public.plan_versions set narrative = '{"executiveSummary":"edited after approval"}' where id = plan_a; ok := false; v := 'edited';
  exception when others then ok := true; v := sqlerrm; end;
  res := res || jsonb_build_object('check','18 operator cannot edit an approved plan','expected','blocked','actual',v,'pass',ok);

  -------------------------------------------------------------- anonymous (not signed in)
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
  begin
    select count(*) into n from public.sectors; v := n::text || ' rows';
  exception when others then n := 0; v := sqlerrm; end;
  res := res || jsonb_build_object('check','19 signed-out user reads nothing','expected','0 rows / denied','actual',v,'pass',n=0);

  -------------------------------------------------------------- cleanup (as owner)
  execute 'reset role';
  delete from public.entrepreneurs where id in (ea, eb);   -- cascades to businesses, products, plans

  create temp table if not exists rls_results (r jsonb);
  truncate rls_results;
  insert into rls_results select jsonb_array_elements(res);
end $$;

select r->>'check' as check, r->>'expected' as expected, left(r->>'actual', 80) as actual,
       case when (r->>'pass')::boolean then 'PASS' else 'FAIL' end as result
from rls_results order by 1;
