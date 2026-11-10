-- DSK 007 — location import plumbing + search support.
--
-- Data source: India Post "All India Pincode Directory" (the data.gov.in dataset, current district boundaries),
-- as packaged in the MIT-licensed npm package india-pincode@2.5.9 (data/pincodes.json.gz,
-- sha256 10b80a286d60baed60e8e6630ac8d76992ecd240b8373d1a6b3f0ab98efae401). 165,627 post offices,
-- 755 districts, 19,586 pincodes. This edition has NO taluk/mandal column, so every place is filed under
-- taluk 'Not specified' (exactly what kit/06_location/import_pincodes.py does for a blank taluk).
--
-- Flow: the edge function `load-pincodes` fetches that pinned file, refuses it unless the sha256 matches,
-- and writes cleaned rows into private.loc_import; then dsk_008 normalises them into loc_* and drops staging.

create extension if not exists pg_net with schema extensions;

create table if not exists private.loc_import (
  part int not null,
  state text not null,
  district text not null,
  place text not null,
  pincode text not null
);

-- Fast pincode lookups and place-name search scoped to a district
create index if not exists loc_places_taluk_name on public.loc_places (taluk_id, name);
create unique index if not exists loc_places_uniq on public.loc_places (taluk_id, name, pincode);

-- One-time tokens that authorise the loader function (private schema: not reachable through the REST API).
create table if not exists private.load_tokens (token text primary key, expires_at timestamptz not null);
