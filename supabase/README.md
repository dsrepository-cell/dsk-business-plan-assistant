# Database

Supabase project **`dsk-business-plan-assistant`** (ref `ymlytveiwifdwekkwpdo`, region `ap-south-1` Mumbai, Free plan, org "Sakhi Mentor Org").

## Migrations (applied in this order; file versions match the remote history)

| File | What |
|---|---|
| `…_dsk_001_schema.sql` | Kit schema, verbatim (`kit/02_supabase/001_schema.sql`) |
| `…_dsk_002_seed_sectors.sql` | 18 sectors, 75 questions, 56 expense heads — same rows as the kit seed, compact form, without its `begin/commit` (which would end the migration transaction early) |
| `…_dsk_003_hardening.sql` | Advisor fixes + two access gaps closed (see header of the file) |
| `…_dsk_004_business_select_policy.sql` | Fix: `insert into businesses … returning` was rejected by its own read policy |

Advisors after 004: **security 0, performance 0 warnings** (only INFO "unused index", expected on an empty DB).

## Changes vs the kit schema, in plain words

- Helper functions (`auth_role`, `auth_center`, `can_access_business`, trigger functions) live in schema **`private`**, which the REST API doesn't expose. Call them as `private.auth_role()` in new policies.
- The plan-approval guard now also runs on **insert**, so an operator can't create a plan that is already approved; approval stamps (`approved_by/at`) and `created_by` are set by the database, not the client; an approved plan is read-only for operators.
- An operator can no longer move a case under another centre's entrepreneur.
- Storage policies reject paths whose first folder isn't a business UUID, instead of throwing.
- `pg_trgm` lives in schema `extensions`.

## Re-seeding sectors

`002` runs `delete from expense_heads` before re-inserting. Once real expenses reference those heads, that delete will fail on the foreign key (safe — nothing is lost). To add an industry later, insert rows (admin screen or SQL) rather than re-running the whole seed.

## Test users (test project only)

| Email | Role | Centre |
|---|---|---|
| `operator.a@dsk.test` | operator | DSK Centre A (test) |
| `operator.b@dsk.test` | operator | DSK Centre B (test) |
| `reviewer@dsk.test` | reviewer | — (sees all centres) |

Passwords are in `.env.test.local` (gitignored, never committed). Delete these users before any real data goes in.

## RLS proof

`supabase/tests/rls_proof.sql` — run in the SQL editor as owner. It switches to the real `authenticated`/`anon` roles with each user's JWT claims, creates its own fixture cases through RLS, runs 19 checks, deletes the fixtures, and returns PASS/FAIL per check.

Last run (2026-11-09): **19 / 19 PASS**.
