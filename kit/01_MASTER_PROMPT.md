You are building **DSK Business Plan Assistant** for Access Livelihoods: a mobile-first web app (PWA) that a Digital Seva Kendra (DSK) operator uses while sitting with a woman entrepreneur. They answer simple, icon-led questions; the system turns the answers into a financially validated, loan-ready Business Plan / DPR (PDF) for DSK review and possible submission to a bank or NBFC.

I have already built a working prototype and prepared a kit. **Do not redesign. Port and productionise.** Read these first, in this order:

1. `kit/00_START_HERE.md`
2. `kit/reference/DSK_Business_Plan_Assistant.jsx` — the prototype (single-file React). UX, flow, wording and icons are the reference.
3. `kit/02_supabase/001_schema.sql` — the data model. Treat it as the source of truth.
4. `kit/03_engine/engine.ts` and `engine.test.ts` — the financial engine, already tested.
5. `kit/05_ai/prompts.ts` and `generate-plan.route.ts` — AI layer.
6. `kit/04_config/sectors.json` and `kit/02_supabase/gen_seed.py` — the 18 industries.
7. `kit/06_location/import_pincodes.py`
8. `kit/07_deploy/CHECKLIST.md`

## Non-negotiable rules

1. **No AI-invented numbers.** All money, percentages, EMI, DSCR, projections come from `engine.ts`. The LLM only writes prose from a frozen snapshot, and `numberGuard()` checks its output. Never let the model calculate.
2. **One source of truth.** Products, expenses, assets, loan and location are stored once and reused everywhere. Revenue/margin/EMI are computed, never stored as inputs. A user must never type the same thing twice.
3. **Secrets stay server-side.** `ANTHROPIC_API_KEY` and the Supabase service-role key never reach the browser. The AI call happens only in a Next.js route handler.
4. **RLS on every table.** Operators see only their DSK centre's cases. Only reviewer/admin can approve a plan. Test this with two different users before calling it done.
5. **DSK operator approves the growth assumptions** (suggested vs approved shown separately) before a plan can be generated. No plan is "final" without a reviewer approval.
6. **Personal data is sensitive.** Aadhaar/PAN and bank documents go in the private `documents` bucket only. Never put them in prompts, logs, or analytics. Do not send mobile number or ID numbers to the LLM.
7. **Ask me before anything that costs money, is hard to undo, or touches production**: creating a paid Supabase project, enabling a paid Vercel feature, deleting data, force-pushing, changing DNS, or deploying to the production domain. Show me the cost or the exact change and wait for a yes.
8. Small, reviewable commits. Work on a branch; open a PR per phase.

## Stack (decided — don't re-litigate)

Next.js 15 App Router + TypeScript, Tailwind + shadcn/ui, lucide-react icons, Supabase (Postgres, Auth, Storage, RLS), `@supabase/ssr`, zod, react-hook-form, TanStack Query, `next-intl` (en, te, hi, kn to start), `@react-pdf/renderer` for the DPR PDF, vitest, Playwright for the end-to-end scenarios, Vercel for hosting. AI model comes from env `AI_MODEL` (default `claude-sonnet-5-5`).

## Tool use in this account

- **GitHub**: create a private repo `dsk-business-plan-assistant`; push the scaffold; use branches + PRs.
- **Supabase**: create a project (confirm cost with me first), apply `001_schema.sql` then `002_seed_sectors.sql` as migrations, run `get_advisors` for security and fix every warning, generate TypeScript types.
- **Vercel**: create the project from the GitHub repo, set env vars from `kit/07_deploy/.env.example`, deploy a preview first. Production only after I say so.
- Never print secrets in chat.

## Build phases — stop and report after each, with proof

**Phase 0 — Scaffold.** Repo, Next.js, Tailwind, shadcn, lint, vitest. Copy `engine.ts` to `src/lib/engine.ts` and its test; `npm test` must pass.

**Phase 1 — Database.** Apply schema and seed. Create two DSK centres and three users (operator A, operator B in different centres, one reviewer) for testing. Prove RLS: A cannot read B's case; operator cannot approve a plan.

**Phase 2 — Auth + dashboard.** Email/password or phone OTP via Supabase Auth. Dashboard lists the centre's cases with status. "New entrepreneur" button. Save-draft and resume (`businesses.current_step`).

**Phase 3 — Location.** Run `import_pincodes.py` with the data.gov.in pincode CSV (ask me for the file; do not invent data). Build a cascading, searchable State → District → Mandal/Taluk → Village picker with pincode lookup and reverse-fill. Store only `place_id`. Must be fast on mobile with ~150k rows (server-side search, debounce, limit 50).

**Phase 4 — Questionnaire flow.** Port the prototype steps as a config-driven wizard. Sector picker from `sectors` table with icons. Sector questions from `sector_questions`, filtered by `stage` (existing/new) and `show_if`. Numeric keypad for money fields, large tap targets, progress bar, back/next, autosave on each step. Every question has an icon (lucide name stored in DB).

**Phase 5 — Products → costing, Expenses, Assets, Loan.** Product cards write to `products`; the costing table is a view over the same rows. Expenses: sector-aware head list + custom head, frequency, monthly and annual shown live. Assets list feeds project cost. Loan screen shows EMI and DSCR live from `engine.ts`.

**Phase 6 — Future plan, Marketing, Growth assumptions.** Capture inputs. Compute `suggestGrowth()`, store in `growth_assumptions.suggested_*`; operator edits and approves into `approved_pct`. Show "System suggested" and "DSK operator approved" side by side.

**Phase 7 — Validation + review screen.** Run `buildSnapshot()`; show flags grouped by severity. `error` flags block generation; `warning` flags are shown on the review screen and in the final document.

**Phase 8 — AI generation.** Adapt `generate-plan.route.ts`. Persist to `plan_versions` with the frozen snapshot. Show `narrative_warnings` to the reviewer. Allow editing of narrative text (status → `edited`).

**Phase 9 — DPR PDF.** All 30 sections in the order listed in `kit/00_START_HERE.md`. Tables for product costing, expenses, 3-year projection, repayment schedule summary. Embed Noto fonts for Telugu, Hindi, Kannada so non-English text renders. Store the PDF in the `plans` bucket under `<business_id>/v<version>.pdf`. Reviewer approves → watermark "DRAFT" disappears.

**Phase 10 — Test and harden.** Playwright scenarios below. Fix every Supabase advisor warning. Lighthouse mobile ≥ 90 on the form screens. Write `README.md` for the repo.

**Phase 11 (later, only if I ask)** — offline-first sync (IndexedDB queue), voice input, document upload with OCR, bulk portfolio dashboard.

## Acceptance scenarios (automate with Playwright + engine unit tests)

1. Existing food-processing business, two products (the pickle example: 500 × ₹120, cost ₹70 → revenue ₹60,000, direct cost ₹35,000, gross profit ₹25,000, margin 41.67%).
2. New tailoring business (stage=new hides existing-business questions).
3. Retail / kirana with credit sales.
4. Service business (beauty parlour).
5. Multi-product business — totals and weighted margin correct.
6. Zero or missing revenue — clear error, no NaN, no PDF.
7. Large loan on small income — LOW_DSCR / NEGATIVE_CASH flags shown.
8. Seasonal business — flag shown, growth reasons mention seasonality.
For each: questions relevant, products flow into costing without re-entry, expenses captured, profit correct, 3-year projection logical, SWOT items each cite a data point, no duplicate entry, PDF reflects the data.

## What "done" means

- `npm test` green, Playwright scenarios green, no Supabase advisor warnings, RLS proven with two users.
- A deployed Vercel preview URL I can open on my phone.
- A short `HANDOVER.md`: how to add a new industry (insert rows or edit `gen_seed.py`), how to rotate keys, how to reload location data, known limitations.

## Known limitations I want you to keep visible (don't hide them)

- DSCR in the engine is indicative (EBITDA ÷ debt service, no tax or depreciation). Say so on the document.
- The location dataset is post-office based: "village" means post-office area, and "Mandal" is the directory's taluk field.
- Growth assumptions are rule-based defaults; they are not forecasts.

Start with Phase 0 now. Tell me what you're about to do in one or two sentences, then do it.
