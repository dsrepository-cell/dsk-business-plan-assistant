#!/usr/bin/env python3
"""
Load the full India State > District > Taluk(Mandal/Block) > Place(+Pincode) hierarchy into Supabase.

SOURCE
  data.gov.in -> "All India Pincode Directory" (India Post, CSV). Free; you must download it yourself
  (the portal may ask you to sign in). Expected columns (case-insensitive): officename, pincode, taluk, districtname, statename.
  If your file uses other names, pass --map officename=Office,pincode=PIN,taluk=Taluk,districtname=District,statename=State

RUN
  pip install "psycopg[binary]"
  export DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
  python3 import_pincodes.py all_india_pincode_directory.csv

NOTES
  * Safe to re-run: inserts use ON CONFLICT DO NOTHING.
  * "Taluk" in this directory is the nearest thing to Mandal (AP/Telangana) / Block / Tehsil. Not every row has one;
    blanks become 'Not specified'. Village-level coverage is post-office areas, not every census village.
    For full village lists, add LGD (lgdirectory.gov.in) village data later as a separate table.
  * Names are title-cased and cleaned of post-office suffixes (B.O / S.O / H.O) so dropdowns read well.
  * Never put the database password in the repo. Use the env var.
"""
import argparse, csv, io, os, re, sys

try:
    import psycopg
except ImportError:
    sys.exit('Install first: pip install "psycopg[binary]"')

DEFAULT_MAP = {"officename": "officename", "pincode": "pincode", "taluk": "taluk", "districtname": "districtname", "statename": "statename"}
SUFFIX = re.compile(r"\s+(B\.?\s?O\.?|S\.?\s?O\.?|H\.?\s?O\.?|G\.?P\.?O\.?)$", re.I)
SMALL = {"And": "and", "Of": "of"}

def clean(s: str) -> str:
    s = re.sub(r"\s+", " ", (s or "").strip())
    s = " ".join(w.capitalize() if w.isupper() or w.islower() else w for w in s.split(" "))
    for k, v in SMALL.items():
        s = re.sub(rf"\b{k}\b", v, s)
    return s

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv_path")
    ap.add_argument("--map", default="", help="canonical=ActualHeader,... overrides")
    args = ap.parse_args()

    cmap = dict(DEFAULT_MAP)
    for pair in filter(None, args.map.split(",")):
        k, v = pair.split("=", 1)
        cmap[k.strip()] = v.strip()

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("Set DATABASE_URL (Supabase > Project Settings > Database > Connection string).")

    buf = io.StringIO()
    w = csv.writer(buf)
    seen, rows, skipped = set(), 0, 0
    with open(args.csv_path, newline="", encoding="utf-8-sig", errors="replace") as f:
        rd = csv.DictReader(f)
        lower = {h.lower(): h for h in rd.fieldnames or []}
        missing = [c for c in cmap.values() if c.lower() not in lower]
        if missing:
            sys.exit(f"Columns not found: {missing}. Found: {list(lower.values())}. Use --map.")
        g = lambda row, key: row.get(lower[cmap[key].lower()], "")
        for row in rd:
            pin = re.sub(r"\D", "", g(row, "pincode"))[:6]
            state, dist = clean(g(row, "statename")), clean(g(row, "districtname"))
            if len(pin) != 6 or not state or not dist:
                skipped += 1
                continue
            taluk = clean(g(row, "taluk")) or "Not specified"
            place = clean(SUFFIX.sub("", g(row, "officename")))
            key = (state, dist, taluk, place, pin)
            if key in seen:
                continue
            seen.add(key)
            w.writerow(key)
            rows += 1
    buf.seek(0)
    print(f"Prepared {rows:,} unique rows ({skipped:,} skipped for missing state/district/pincode).")

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute("create temp table stg (state text, district text, taluk text, place text, pincode text) on commit drop")
        with cur.copy("copy stg from stdin with (format csv)") as cp:
            while chunk := buf.read(1 << 16):
                cp.write(chunk)
        cur.execute("insert into loc_states(name) select distinct state from stg on conflict (name) do nothing")
        cur.execute("""insert into loc_districts(state_id,name)
                       select distinct s.id, g.district from stg g join loc_states s on s.name = g.state
                       on conflict (state_id,name) do nothing""")
        cur.execute("""insert into loc_taluks(district_id,name)
                       select distinct d.id, g.taluk from stg g
                       join loc_states s on s.name = g.state
                       join loc_districts d on d.state_id = s.id and d.name = g.district
                       on conflict (district_id,name) do nothing""")
        cur.execute("""insert into loc_places(taluk_id,name,pincode)
                       select distinct t.id, g.place, g.pincode from stg g
                       join loc_states s on s.name = g.state
                       join loc_districts d on d.state_id = s.id and d.name = g.district
                       join loc_taluks t on t.district_id = d.id and t.name = g.taluk
                       where not exists (select 1 from loc_places p where p.taluk_id = t.id and p.name = g.place and p.pincode = g.pincode)""")
        for t in ("loc_states", "loc_districts", "loc_taluks", "loc_places"):
            cur.execute(f"select count(*) from {t}")
            print(f"{t}: {cur.fetchone()[0]:,}")
    print("Done.")

if __name__ == "__main__":
    main()
