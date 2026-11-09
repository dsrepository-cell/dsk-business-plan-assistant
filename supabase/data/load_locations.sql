-- Normalise private.loc_import (filled by the load-pincodes function) into loc_*. Idempotent.
insert into public.loc_states(name) select distinct state from private.loc_import where state <> 'Na' on conflict (name) do nothing;
insert into public.loc_districts(state_id, name)
  select distinct s.id, g.district from private.loc_import g join public.loc_states s on s.name = g.state
  on conflict (state_id, name) do nothing;
insert into public.loc_taluks(district_id, name)
  select distinct d.id, 'Not specified' from private.loc_import g
  join public.loc_states s on s.name = g.state
  join public.loc_districts d on d.state_id = s.id and d.name = g.district
  on conflict (district_id, name) do nothing;
insert into public.loc_places(taluk_id, name, pincode)
  select distinct t.id, g.place, g.pincode from private.loc_import g
  join public.loc_states s on s.name = g.state
  join public.loc_districts d on d.state_id = s.id and d.name = g.district
  join public.loc_taluks t on t.district_id = d.id and t.name = 'Not specified'
  on conflict (taluk_id, name, pincode) do nothing;

-- Offices with state/district "NA": file under the pincode's district only when that is unambiguous.
create temp table pin_home as
  select pincode, min(state) state, min(district) district
  from (select distinct pincode, state, district from private.loc_import where state <> 'Na') k
  group by pincode having count(*) = 1;
insert into public.loc_places(taluk_id, name, pincode)
  select distinct t.id, g.place, g.pincode
  from private.loc_import g
  join pin_home h on h.pincode = g.pincode
  join public.loc_states s on s.name = h.state
  join public.loc_districts d on d.state_id = s.id and d.name = h.district
  join public.loc_taluks t on t.district_id = d.id and t.name = 'Not specified'
  where g.state = 'Na'
  on conflict (taluk_id, name, pincode) do nothing;
