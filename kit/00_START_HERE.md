# DSK Business Plan Assistant — Build Kit

Everything needed to build the production app in the Claude account that has GitHub, Supabase and Vercel connected.

## How to use (10 minutes)

1. Unzip. Attach the zip to a new chat in the other account (or commit the folder to a new GitHub repo as `/kit`).
2. Open `01_MASTER_PROMPT.md`, copy everything below the line, paste it as your first message.
3. Claude will work phase by phase and stop to ask before spending money or touching production.
4. You will need to supply one thing yourself: the **All India Pincode Directory CSV** from data.gov.in (free download) for the location pickers.

## What's in the kit

| Folder | What it is | Status |
|---|---|---|
| `01_MASTER_PROMPT.md` | The prompt that drives the whole build | Ready to paste |
| `02_supabase/001_schema.sql` | Full database: 25 tables, RLS, approval guard, storage buckets | Parses cleanly (26 tests also pass) |
| `02_supabase/002_seed_sectors.sql` | 18 industries, 75 questions with icons, 56 expense heads (common + by industry) | Generated |
| `02_supabase/gen_seed.py` | Edit this to add an industry, re-run to regenerate the SQL + JSON | Runs |
| `03_engine/engine.ts` + `engine.test.ts` | Deterministic financial engine and its tests | 26 tests pass |
| `04_config/sectors.json` | Same industry config as JSON (for the frontend / admin screen) | Generated |
| `05_ai/prompts.ts` | System prompt, JSON schema, number guard | Ready |
| `05_ai/generate-plan.route.ts` | Next.js route: engine → AI → guard → stored plan version | Needs wiring into the app |
| `06_location/import_pincodes.py` | Loads State → District → Taluk → Place + Pincode into Supabase | Needs the CSV |
| `07_deploy/CHECKLIST.md` + `.env.example` | GitHub / Supabase / Vercel go-live steps | Ready |
| `reference/` | The working prototype and the DSK LOAN feasibility assessment | Reference only |

## Architecture in one picture

```
Operator (mobile PWA)
   │  icon-led questionnaire, save draft each step
   ▼
Supabase Postgres  ── single source of truth (products, expenses, assets, loan, place_id)
   │
   ▼
engine.ts  ── deterministic: revenue, margins, expenses→monthly/annual, EMI, amortisation,
              3-year projection, DSCR, break-even, validation flags
   │  frozen snapshot (JSON)
   ▼
Next.js route ── Claude writes prose ONLY ── numberGuard rejects invented figures
   │
   ▼
plan_versions (snapshot + narrative + warnings)  ──►  reviewer approves  ──►  PDF (react-pdf)  ──►  DSK / bank
```

## The 30 sections of the DPR (in order)

1 Executive Summary · 2 Entrepreneur Profile · 3 Location · 4 Business Overview · 5 Industry / Sector · 6 Products & Services · 7 Product Portfolio · 8 Production / Service Capacity · 9 Market Analysis · 10 Target Customers · 11 Marketing Plan · 12 Operations Plan · 13 Procurement Plan · 14 Expense Structure · 15 Project Cost · 16 Promoter Contribution · 17 Loan Requirement · 18 Product Costing · 19 Revenue Projection (3 yrs) · 20 Expense Projection (3 yrs) · 21 Profit Projection (3 yrs) · 22 Cash Flow · 23 Break-even · 24 Repayment Capacity · 25 SWOT · 26 Future Growth Plan · 27 Risks & Mitigation · 28 Employment Generation · 29 Implementation Timeline · 30 Funding Requirement / Conclusion

Calculated by code: 13–24 (and the numbers inside 1, 30). Written by AI from verified data: 1, 4, 9, 11–13, 25–29, 30. Direct from data: 2, 3, 5–8, 10.

## Fixes made while porting the prototype (so you aren't surprised)

- The prototype deducted the **whole EMI** from profit. The engine now deducts **interest only**; principal repayment is a cash outflow, not an expense. Net profit is therefore higher than the prototype showed, and DSCR is computed on EBITDA ÷ (interest + principal).
- Weekly expenses use 52 ÷ 12 (4.333), not 4.33.
- Moratorium is modelled as interest-only months inside the tenure.
- The prototype called the Claude API from the browser. That only works inside a Claude artifact. In production the call is server-side so the key stays secret.

## Honest limits

- The location dataset is post-office based, not every census village. LGD village data is a later add-on.
- Growth assumptions are transparent rules, not forecasts. The operator approves them.
- DSCR is indicative (no tax or depreciation).
- Reviewer approval and bank acceptance are human steps. The app prepares the document; it does not approve loans.
- Telugu/Hindi/Kannada UI strings and PDF fonts need translation review by your field team.
