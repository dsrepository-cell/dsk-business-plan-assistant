-- DSK 008 — the prototype asks "Age", the kit schema only had date_of_birth.
-- Store what she actually says; never fabricate a birth date from an age.
alter table public.entrepreneurs
  add column if not exists age_years smallint check (age_years between 14 and 110);
