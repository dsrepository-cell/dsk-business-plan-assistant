# Go-live checklist (GitHub → Supabase → Vercel)

## 1. GitHub
- [ ] Private repo `dsk-business-plan-assistant` created
- [ ] `main` protected; work on feature branches, PR per phase
- [ ] `.gitignore` includes `.env*`, `node_modules`, `.next`
- [ ] No secrets in history (`git log -p | grep -i "sk-ant\|service_role"` returns nothing)

## 2. Supabase
- [ ] Project created (cost confirmed with owner) — region **ap-south-1 (Mumbai)** for latency in India
- [ ] Migrations applied in order: `001_schema.sql`, then `002_seed_sectors.sql`
- [ ] `get_advisors` (security + performance) shows no warnings
- [ ] Auth: email confirmations on; site URL + redirect URLs set to the Vercel domains
- [ ] Two DSK centres, operator A + operator B + one reviewer created; promote roles in `profiles`
- [ ] **RLS proof:** operator A cannot select operator B's `entrepreneurs`, `businesses`, `products`, storage files
- [ ] **Approval proof:** an operator's update to `plan_versions.status='approved'` is rejected; reviewer's succeeds
- [ ] Location loaded: `python3 06_location/import_pincodes.py <csv>`; row counts look sane (≈ 36 states/UTs, 700+ districts, 150k places)
- [ ] Storage buckets `documents` and `plans` are private
- [ ] Daily backups confirmed for the plan tier

## 3. Vercel
- [ ] Project linked to the GitHub repo; framework preset Next.js
- [ ] Env vars set for Preview + Production (see `.env.example`); service-role and Anthropic keys are **not** `NEXT_PUBLIC_`
- [ ] Preview deployment opened on a real phone; wizard completes end to end
- [ ] `maxDuration` ≥ 60 s on `/api/plans/generate` (check the plan allows it)
- [ ] Production deploy only after owner says go
- [ ] Custom domain (optional) + HTTPS

## 4. Quality gates before showing management
- [ ] `npm test` green (engine unit tests)
- [ ] Playwright: the 8 acceptance scenarios green
- [ ] A generated PDF reviewed by a human for: numbers match the screen, no invented figures, Telugu/Hindi text renders
- [ ] Every AI warning (`narrative_warnings`) visible to the reviewer
- [ ] Privacy: no Aadhaar/PAN/mobile in prompts or logs; consent timestamp captured on the entrepreneur record

## 5. Rotating keys / adding an industry later
- Rotate: create a new key in Anthropic console → update the Vercel env var → redeploy → revoke the old key.
- New industry: edit `02_supabase/gen_seed.py`, run it, apply the new `002_seed_sectors.sql` (idempotent).
