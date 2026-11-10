# Location data (State → District → Taluk → Place + pincode)

Loaded 2026-11-09 into project `ymlytveiwifdwekkwpdo`. No CSV download was needed.

## Source
India Post **All India Pincode Directory** (the data.gov.in dataset, current district boundaries — e.g. Telangana 33,
Andhra Pradesh 26 districts), as republished in the MIT-licensed npm package **`india-pincode@2.5.9`**
(`data/pincodes.json.gz`, sha256 `10b80a286d60baed60e8e6630ac8d76992ecd240b8373d1a6b3f0ab98efae401`,
165,627 post offices). The loader refused to run unless the downloaded file matched that checksum.
Underlying data: Government Open Data License – India (attribute India Post / data.gov.in).

## Result
| | rows |
|---|---|
| States / UTs | 36 |
| Districts | 754 |
| Taluks | 754 (one per district, all `Not specified` — see limits) |
| Places (post-office areas) | 165,449 |
| Pincodes | 19,486 |

## How (reproducible)
1. `supabase/functions/load-pincodes/index.ts` fetched the pinned file, verified sha256, cleaned names exactly like
   `kit/06_location/import_pincodes.py` (title-case, strip B.O/S.O/H.O), and wrote 10 slices into `private.loc_import`
   (one slice per call — parallel calls exceeded the Edge Function memory limit).
2. `load_locations.sql` normalised staging into `loc_*` (same SQL as the kit script).
3. 715 offices had state/district = "NA" in the source. 590 were filed under the district that their pincode
   unambiguously belongs to (every other office with that pincode is in one district); 125 whose pincode spans
   districts were left out. No other inference was made.
4. Staging table, token table and helper were dropped; the function was redeployed as a 410 stub.

## Known limits (keep visible)
- **No Mandal/Taluk.** This edition of the directory has no taluk column, so `loc_taluks` holds one
  `Not specified` row per district and the picker hides that level. Older editions have taluks but pre-2016
  districts. Proper Mandals need LGD (lgdirectory.gov.in) sub-district data — a later add-on.
- **"Village" = post-office area**, not every census village.
- 44 exact duplicate (district, office, pincode) rows collapsed to one.

## Reloading
Re-running is idempotent (`on conflict do nothing`). For a new edition, update the URL + sha256 in the function,
redeploy it, re-run the slices, then `load_locations.sql`.
