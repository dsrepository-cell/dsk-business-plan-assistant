# DSK LOAN → AI Business Plan/DPR Engine
## Feasibility & Product-Design Assessment

**Source file:** `DSK LOAN` (Google Sheet, owner: siddhant.borkar@accesslivelihoods.org)
**Location:** lives inside a Drive folder already named **"DSK AI Loan Facilitation System"** — this appears to be a named initiative someone on your team has already started scoping, not a blank slate.
**Also found:** `DSK LOAN 2.xlsx` (older, June 2026, same core content) — treated as a superseded draft of the file above.

---

## 0. Headline finding, before anything else

This file is **not** a simple data-collection form. It's actually **five layers of work stacked in one spreadsheet**, at very different levels of maturity:

1. A blank "core + industry-specific" intake template (62 core fields + 32 food-processing fields)
2. A **fully filled real case study** — one entrepreneur (a papad-maker in Bidar, Karnataka) with ~130 fields completed end-to-end
3. A **structured, modular questionnaire design** (Modules 1–11, ~90 questions, each already tagged with Field_Type / Mandatory / Conditional_Logic / Asked_To / **Prototype Yes-No**)
4. **Twelve sector-specific questionnaires** (Dairy, Poultry, Goatery, Fisheries, Tailoring, Grocery, Food Processing, Catering, Mobile Repair/CSC, Agarbatti/Handicrafts, Vegetable Vending, Beauty Parlour), each broken into Infrastructure / Business Capacity / Operations / Market & Sales / Loan Requirement
5. A **document-usage mapping** tagging individual fields to `BusinessPlan | DPR | LoanPackage | Readiness`

In other words: someone has already done a first pass at almost everything you asked me to design in sections 3, 4, 6 and 9 of your brief. My job below is to **validate it against real data (the filled case study), stress-test it, find the gaps and bugs, and tell you honestly what's usable versus what needs rework** — rather than redesigning from zero.

---

## 1. Excel Structure — What's Actually In There

| # | Block | What it is | Approx. size |
|---|-------|-----------|--------------|
| 1 | Open core question sheet | Blank template: 62 "core" questions (identity, household, existing business, financials, loan ask) + 32 Food Processing industry questions, side by side | 94 fields |
| 2 | Filled form | Same template, fully completed for **Shantamma Basappa Patil**, a food-processing (papad) entrepreneur in Bidar district, Karnataka — real numbers, real answers | ~130 filled cells |
| 3 | Modular questionnaire | Q001–Q123 + CQ092–CQ105, organized into 11 modules, each tagged Field_Type/Mandatory/Conditional/Asked_To/**Prototype (Y/N)** | ~90 rows |
| 4 | Generic profile sections (A–D) | Basic Personal Info → Identity & Social → Education & Skills → Occupation & Experience | ~25 fields |
| 5 | Household/Address/Assets/Banking sections | Address, Family, Household Income, Residential Assets, Land, Livestock, Business Assets, Vehicles, Banking, Existing Loans, Savings & Insurance | ~55 fields |
| 6 | Enterprise-type + 12 sector questionnaires | Dairy, Poultry, Goatery/Sheep, Fisheries, Tailoring, Grocery/Kirana, Food Processing, Catering/Tiffin, Mobile Repair/CSC, Agarbatti/Handicrafts, Vegetable Vending, Beauty Parlour — each in A. Infrastructure / B. Capacity / C. Operations / D. Market / E. Loan Requirement format | ~18–38 fields per sector |
| 7 | Master sector question bank (v1) | Same 12 sectors, flattened into ID-coded rows (SD001…, SP001…, FP001… etc.) | ~260 fields |
| 8 | Master sector question bank (v2 — near-duplicate) | A second pass over the same 12 sectors, similar but not identical IDs/field counts | ~230 fields |
| 9 | BusinessPlan/DPR/LoanPackage usage map | A narrower set of sector fields (5–6 per sector) tagged to which output document they feed | ~65 fields |

**Read on this:** blocks 7 and 8 are two revisions of the same idea that were never reconciled — same `SD001`, `SP001` etc. IDs are reused across both sheets to mean **different things**. That's flagged in Section 11 (Data Quality) — it will silently corrupt any direct import unless cleaned up first.

---

## 2. Field Mapping

A full field-by-field table across ~230 unique fields (many sector-specific ones repeat the same shape — "monthly X cost", "loan required for X activity" — across 12 sectors) would run to several hundred rows with low added value. Below is a representative cross-section covering every category; I can generate the complete CSV mapping (all ~230 rows) as a build-stage deliverable once you approve the direction.

| Excel Field | Captures | Data Type | Required? | Ask Entrepreneur? | Can Be Calculated? | BP/DPR Section |
|---|---|---|---|---|---|---|
| Full name | Identity | Text | Yes | Yes | No | Entrepreneur Profile |
| Date of birth | Age (derive) | Date | Yes | Yes | Age = auto-calc | Entrepreneur Profile |
| Social category | Scheme eligibility | Dropdown | Yes | Yes | No | Entrepreneur Profile |
| Total family income | Household context | Number | Yes | Yes | No | Household Economic Context |
| Existing business enterprise? | Branch logic | Yes/No | Yes | Yes | No | Gate for Module 4 |
| Current turnover monthly | Revenue baseline | Number | Cond. | Yes | Cross-check vs. unit econ | Financials |
| Current monthly expenses | Cost baseline | Number | Cond. | Yes | Cross-check vs. itemized costs | Financials |
| Current monthly profit | — | Number | Cond. | **No — should be calculated, not asked** | **Yes = Revenue − Expenses** | Financials |
| Selling price per unit | Unit economics | Number | Yes | Yes | No | Revenue Projection |
| Production capacity/day | Unit economics | Number | Yes | Yes | No | Revenue Projection |
| Monthly raw material cost | COGS input | Number | Yes | Yes | No | Cost of Goods Sold |
| Total project cost | Investment ask | Number | Yes | **Should be calculated**, not asked | **Yes = Fixed capex + working capital margin** | Project Cost |
| Own contribution | Financing mix | Number | Yes | Yes | No | Means of Finance |
| Bank/FI loan required | Financing mix | Number | Yes | **Should be calculated** as residual | **Yes = Project cost − Own contribution** | Loan Requirement |
| Inventory/customer/supplier credit days | Working capital cycle | Number | No | Yes | Feeds WC formula | Working Capital |
| Existing EMI amount | Repayment capacity | Number | Cond. | Yes | Feeds DSCR | Existing Liabilities |
| Machinery cost breakup | Capex detail | Long text (unstructured!) | Yes | Yes | **Should be a structured table**, not free text | Fixed Investment |
| FSSAI/PAN/Aadhaar/GST available | Compliance readiness | Yes/No | Mixed | Yes | No | Documents Annexure |

**What this shows:** the file already correctly separates "ask the entrepreneur" fields from fields that are really outputs — but three fields (`Current monthly profit`, `Total project cost`, `Bank loan required`) are currently modeled as **manually-entered answers** when they should be **system-calculated outputs**. That's an easy, high-value fix (see Section 6).

---

## 3. Can This Become an Automated Business Plan Engine?

### **Answer: PARTIALLY today → YES for a defined MVP scope, once ~10–15 fields are added and a handful of bugs are fixed.**

**Why:**

I validated this against the one fully filled case study in the sheet rather than trusting the blank template alone, and the numbers hold together:

- Monthly expenses (₹11,000 raw material + ₹800 packaging + ₹400 electricity + ₹500 transport + ₹100 maintenance + ₹200 misc = **₹13,000**) match the stated "Current Monthly Expenses: ₹13,000" exactly.
- Revenue (₹22,000) − Expenses (₹13,000) = **₹9,000**, matching the stated "Current Monthly Profit: ₹9,000" exactly.

This means the *raw fields already collected are sufficient to reconstruct a correct P&L purely by arithmetic* — real evidence the deterministic engine is viable, not just a nice slide.

**But I also found a discrepancy that matters:** the case study's machinery + startup costs sum to ₹80,000 + ₹2,000 + ₹3,000 + ₹5,000 = **₹90,000**, while "Total Project Cost" is stated as **₹120,000** — an unexplained ₹30,000 gap (probably intended as working-capital margin, but never itemized). Right now a human fills this in without the system catching the mismatch. **This is itself the strongest argument for building the engine**: a rules-based validator would have caught this instantly; the manual process didn't.

### Quantifying the gap

| | Estimate |
|---|---|
| % of required raw information already collected somewhere in the sheet | **~80–85%** |
| % that needs new fields | **~15–20%**, concentrated in one area (see below) |
| % derivable/calculated by the system, not asked | Revenue, COGS, Gross/Net Profit, margins, Total Project Cost, Loan Required, EMI, DSCR, Break-even, Working Capital, 3–5 yr projections |
| % requiring AI-generated narrative | Executive Summary, Business Description, Market Analysis, Competitive Positioning, Marketing Strategy prose, Risk & Mitigation narrative, Conclusion |

**The single biggest gap:** *forward-looking fields.* A Business Plan is fundamentally a projection, not a snapshot — but only 2 of the 12 sectors (Dairy, Poultry) carry an "Expected increase in income/production after investment" field. Food Processing, Tailoring, Grocery, Beauty Parlour, Agarbatti, Catering and Mobile Repair have **no field for post-investment impact** at all. Without it, the system can produce a Year-1 (current-state) plan but not a credible 3–5 year growth projection — it would have to either ask a new question or apply a blanket assumed growth rate, which undermines the "no invented numbers" principle you set out.

Other missing pieces: competitor/market-positioning fields exist only in the free-text case study, not in the structured Module list; no GPS/geotag or photo-evidence field; no digital consent/signature field; no explicit seasonality field in the structured modules (present only in the filled example).

---

## 4. Reverse-Engineered Field-Level Questionnaire (Sample)

The existing Module design is already close to conversational in places and needs light rewording in others. Representative examples, spanning categories:

| # | Ideal Question (spoken to entrepreneur) | Why Required | Data Type | Example Answer | Calculation Triggered | BP Section |
|---|---|---|---|---|---|---|
| 1 | "What is your full name, as it appears on your Aadhaar?" | Identity, KYC | Text | Shantamma Basappa Patil | — | Cover Page / Profile |
| 2 | "Do you already run a business, or is this a new idea?" | Branches entire flow | Yes/No | Yes | Gates Module 4 vs. 5 | Section header |
| 3 | "What do you make or sell?" | Product definition | Text | Papad (Urad/Moong/Jeera dal) | — | Products/Services |
| 4 | "On average, how many [units] do you sell in a month?" | Revenue driver | Number | 180 kg | Qty × Price = Revenue | Revenue Projection |
| 5 | "What's the price for one [unit]?" | Revenue driver | Number | ₹35/250g packet | Qty × Price = Revenue | Revenue Projection |
| 6 | "Roughly how much do you spend on raw materials each month?" | COGS | Number | ₹11,000 | Feeds Gross Margin | Cost of Goods Sold |
| 7 | "Any other regular monthly costs — electricity, transport, rent, helpers?" | Opex | Number (repeated per category) | ₹400 / ₹500 / ₹0 / ₹0 | Sum → Total Opex | Operating Expenses |
| 8 | "What new equipment or stock do you need the loan for?" | Capex | **Structured table**, not free text: Item / Qty / Unit Cost | Motorized Dough Kneader × 1 × ₹45,000 | Sum → Fixed Investment | Investment Plan |
| 9 | "How much can you put in yourself?" | Financing mix | Number | ₹20,000 | Loan = Project Cost − This | Means of Finance |
| 10 | "If we approve this loan, how much extra do you expect to make each month?" | **New field — closes the projection gap** | Number or % | +₹3,000/month | Feeds Year 2+ projection | Revenue Projection |
| 11 | "Do you have any loan running right now — SHG, bank, or otherwise?" | Repayment capacity | Yes/No → drill-down | Yes, SHG ₹9,000 outstanding | Feeds DSCR | Existing Liabilities |
| 12 | "Do you have your PAN, Aadhaar, and bank passbook handy?" | Document readiness | Yes/No each | Aadhaar Yes, PAN No | Gates loan-package completeness | Documents Annexure |

The full ~90-question Module set already in the sheet, plus the ~20–30 sector-specific questions per enterprise type, follow this same reword-and-restructure pattern. I'd recommend doing this rewording pass sector-by-sector at build time with your field team's input on local phrasing (Kannada/Telugu/Hindi), since natural phrasing is something field staff will judge better than I can from a spreadsheet.

---

## 5. Minimum Viable Questionnaire (15–30 min)

Mapping the existing design onto your A–O structure, and marking what the sheet's own **Prototype = YES** flags already suggest as MVP-critical (I counted ~50 core fields flagged this way — a good instinct already baked into the file):

| Category | Source in sheet | Mandatory | Optional | Conditional |
|---|---|---|---|---|
| A. Entrepreneur Profile | Module 1 (Q001–Q015) | Name, gender, DOB, mobile, education, social category, father's/husband's name, occupation | Alternate mobile, email | — |
| B. Existing Business | Module 4 (Q042 gate) | Business name, activity description, current turnover/expenses | Nature of business, product list | **Entire block conditional on Q042 = Yes** |
| C. Business Idea (new) | Module 5–6 | Proposed activity, enterprise type, planned location | Site ownership | **Conditional on Q042 = No** |
| D. Products/Services | Sector question bank | Product category, products made | Product variants | Sector-specific set only |
| E. Customers & Market | Module 7 (Q069–Q071) | Main market/customer, selling area | Competitor names *(new — not in Modules today)* | — |
| F. Sales & Revenue | Filled-example pattern | Selling price/unit, monthly qty sold | Seasonality *(new)* | — |
| G. Raw Materials | Sector bank | Raw material source, monthly cost | — | Sector-specific |
| H. Operating Expenses | Filled-example pattern | Electricity, transport, packaging, labour | Misc/maintenance | — |
| I. Assets & Equipment | Household & Livelihood + Business Assets | Machinery items (structured table), land, livestock | Vehicle, house value | — |
| J. Existing Loans | CQ103–105 | Existing loan Yes/No, EMI, tenure | Purpose | **Conditional on Yes** |
| K. Proposed Loan | Module 8–9 (Q077–Q085) | Total project cost *(calc)*, loan tenure preferred | Moratorium, guarantor | — |
| L. Own Contribution | Module 8 (Q080) | Own contribution amount | — | — |
| M. Employment Generation | *(missing today)* | — | Workers to be hired post-loan | **Recommend adding — 1 field** |
| N. Growth Plans | *(missing today)* | — | Expected income increase | **Recommend adding — closes Section 3 gap** |
| O. Documents/Evidence | Module 11 (Q107–Q123) | PAN, Aadhaar, address proof, passbook | Machinery quotations, Udyam, FSSAI | Sector-conditional |

**Estimated field count for one entrepreneur:** ~50 core (Prototype=YES) + ~20–30 sector-specific ≈ **70–80 fields**. At a realistic conversational pace (mix of quick Yes/No/dropdown and a handful of longer answers), that lands in your 15–30 minute target — but only if categories M and N above are added and questions 8/9 (machinery cost, total project cost) are restructured as I describe in Section 2.

---

## 6. Business Plan Generation — Data Flow

```
Field Worker (DSK Operator/Sakhi)
   ↓  conversational app, local language, offline-capable
Structured Questionnaire (this analysis's field set)
   ↓
Structured JSON per entrepreneur
   ↓
Validation Layer  ← catches things like the ₹30,000 project-cost gap found above
   ↓
Financial Engine (deterministic — Section 7)
   ↓
AI Narrative Engine (prompted with the validated numbers, never asked to invent them)
   ↓
Assembled Business Plan / DPR (structured document object)
   ↓
PDF/DOCX render
   ↓
DSK Operator Review & Edit
   ↓
Approved → shareable with DSK / bank / financial institution
```

**Stage notes:**
- **Validation** is the stage this Excel is currently missing entirely — it's the reason the project-cost discrepancy went unnoticed. This should run immediately after questionnaire submission, before anything reaches the AI layer.
- **Financial Engine before AI Narrative** is critical to your "don't invent numbers" requirement: the AI should receive the computed P&L/loan terms as *context* to narrate, never as something it calculates itself.
- **DSK Operator Review** is a required human-in-the-loop stage, not optional — see Section 9.

---

## 7. Financial Modelling Engine — What Must Be Deterministic

| Calculation | Formula | Inputs (from questionnaire) |
|---|---|---|
| Monthly Revenue | Qty sold × Price/unit | F. Sales & Revenue |
| COGS | Raw material + packaging cost | G. Raw Materials |
| Gross Profit | Revenue − COGS | — |
| Total Opex | Sum of electricity, rent, transport, labour, maintenance, misc | H. Operating Expenses |
| Net Profit | Gross Profit − Opex | — |
| Gross/Net Margin | Ratios of above | — |
| Fixed Investment | Sum of structured machinery/equipment table | I. Assets |
| Working Capital Requirement | (Inventory days + Customer credit days − Supplier credit days) × daily COGS | I, existing fields already present |
| Total Project Cost | Fixed Investment + Working Capital margin + Startup costs | **Currently a manual entry — should become calculated** |
| Own Contribution % | Own contribution ÷ Total Project Cost | K, L |
| Loan Requirement | Total Project Cost − Own Contribution | **Currently a manual entry — should become calculated** |
| EMI | Standard amortization formula on Loan Amount, Rate, Tenure | K |
| DSCR (indicative) | Net cash accrual ÷ EMI | Net Profit, EMI |
| Break-even Point | Fixed costs ÷ (Price − Variable cost/unit) | Derived |
| 3–5 Yr Projection | Year 1 = current-state numbers; Year 2+ = Year 1 × (1 + growth input) | **Needs the new "expected increase" field from Section 5** |

**Worked example, using the filled case study, to prove this is buildable today:**

- Loan required: ₹100,000, at 11.5% p.a., 36-month tenure, 2-month moratorium (all already collected fields)
- EMI ≈ **₹3,300/month**
- Current monthly profit: ₹9,000
- Indicative coverage: ₹9,000 ÷ ₹3,300 ≈ **2.7×** — a healthy indicative repayment margin, computed entirely from fields already in the sheet, with zero AI involvement.

This is exactly the kind of check that should run automatically and flag low-DSCR cases for closer review, rather than being manually eyeballed by a DSK operator.

**AI-generated content vs. system-calculated numbers — kept strictly separate:**
- **AI never touches:** any ₹ figure, %, date, or ratio above.
- **AI only writes:** Executive Summary, Business/Product description prose, Market & Customer narrative, Competitive positioning narrative, Marketing strategy prose, Risk factors & mitigation narrative, Conclusion — all generated *from* the validated numbers and structured answers, never generating its own numbers.

---

## 8. Recommended Business Plan/DPR Output Structure

Your proposed 26-section structure is sound. Adjusted for what this Excel actually supports well vs. what needs new fields:

1. Executive Summary *(AI)*
2. Entrepreneur Profile *(direct from data)*
3. **Household Economic Context** *(new section — your data model is unusually strong here: family income, land, livestock, house value. Most standard DPR templates skip this; yours has it. Worth keeping as a differentiator for risk assessment.)*
4. Business Overview *(direct/AI)*
5. Products/Services *(direct)*
6. Market Analysis *(AI — but needs the new competitor field from Section 3)*
7. Target Customers *(direct)*
8. Competition *(AI — blocked until competitor field is added)*
9. Marketing & Sales Strategy *(AI)*
10. Operations Plan *(direct, sector-specific block)*
11. Procurement Plan *(direct)*
12. Human Resources *(direct — needs the new "employment generation" field)*
13. Project Cost *(calculated)*
14. Promoter/Own Contribution *(calculated)*
15. Loan Requirement *(calculated)*
16. Revenue Projections *(calculated — 3–5yr needs new growth-assumption field)*
17. Expense Projections *(calculated)*
18. Profit & Loss *(calculated)*
19. Cash Flow *(calculated)*
20. Break-even Analysis *(calculated)*
21. Repayment Capacity *(calculated)*
22. DSCR *(calculated)*
23. Risk Analysis *(AI, from structured seasonality/document-readiness answers)*
24. Mitigation Plan *(AI)*
25. Implementation Timeline *(AI, light — from loan purpose/tenure)*
26. Conclusion / Funding Requirement *(AI)*
27. **Documents Annexure** *(new — direct list of the Yes/No document-availability fields, since these already exist as structured data and are currently only implicit)*

---

## 9. AI Architecture Recommendation

- **Frontend:** Mobile-first PWA or lightweight native app for DSK operators; multilingual UI (Kannada/Telugu/Hindi/English at minimum, given the case study is Karnataka and your org's base is Andhra/Telangana); large-tap conversational form, not a dense grid; voice input for long-text fields (business description, competitor names) where typing is slow for field staff.
- **Backend:** REST/GraphQL API; relational DB (entrepreneur, household, business, financials, loan, documents as related tables — not one flat sheet, to avoid the exact duplication/ID-collision bugs found in this Excel); auth + role-based access (Sakhi/DSK operator vs. reviewer vs. admin); case/entrepreneur management with a **real unique case ID** (currently absent — the filled example has no linkage key back to its template row).
- **AI Layer:** LLM for narrative generation only (per Section 7's strict separation); prompt templates per output section; structured JSON output mode so narrative sections plug cleanly into the document template; a lightweight RAG layer only if you want to ground market-analysis narrative in sector-specific reference data (e.g., typical papad-making margins in Karnataka) — optional for MVP, valuable for v2.
- **Financial Engine:** Pure rules/code (no LLM) — the formulas in Section 7, plus a validation layer that would have caught the ₹30,000 project-cost gap.
- **Document Engine:** Template-driven PDF/DOCX generation from the assembled structured object; versioning per entrepreneur case so re-submissions are tracked.

---

## 10. AI vs. Rules vs. Human

| Function | AI | Rules/Code | Human |
|---|:-:|:-:|:-:|
| Collect information | | ✓ (form logic) | ✓ (field worker asks) |
| Calculate revenue/profit | | ✓ | |
| Generate market narrative | ✓ | | |
| Generate business description | ✓ | | |
| Loan amount calculation | | ✓ | |
| EMI | | ✓ | |
| DSCR | | ✓ | |
| Risk flagging (e.g., low DSCR, cost-total mismatch) | | ✓ | |
| Risk narrative (prose) | ✓ | | |
| Final approval | | | ✓ |

---

## 11. App Workflow

Your proposed flow is good; two additions given what I found:

```
DSK Login
 ↓
Dashboard
 ↓
Create New Entrepreneur  → generates a real unique Case ID (missing in current sheet)
 ↓
Basic Profile
 ↓
Business Assessment (existing vs. new — branches the flow)
 ↓
Dynamic Questionnaire (module + sector-specific)
 ↓
Financial Information
 ↓
Loan Requirement
 ↓
VALIDATION PASS  ← new stage: catches inconsistencies before they reach AI (e.g., cost totals not reconciling)
 ↓
Document Upload
 ↓
AI Narrative Generation
 ↓
Financial Engine Output (side-by-side with narrative for operator review)
 ↓
Business Plan Preview
 ↓
DSK Operator Review
 ↓
Edit / Approve
 ↓
Generate Final DPR
 ↓
Download / Share / Print
```

---

## 12. Data Quality Problems Found (and how the app should solve them)

| Problem Found | Where | Fix in App |
|---|---|---|
| 14 questions (household expenditure/land/asset/loan fields) literally duplicated — Sr. no. 35–48 repeated as 49–62 | Sheet 1 | De-duplicate in the schema; ask once |
| `COPY DATA` formula broken, resolves to `#REF!` | Sheet 2 | Replace with explicit field mapping in code, not spreadsheet formulas |
| Question_ID collisions — `SD001`, `SP001`, `FP001` etc. mean different questions across two different sector question-bank sheets | Sheets 7 & 8 | Single canonical question bank per sector at build time; retire the older revision |
| Total Project Cost doesn't reconcile with sum of itemized costs (₹120,000 vs. ₹90,000 itemized) | Filled example | System-calculate Total Project Cost from itemized components; never accept it as free entry |
| "Current monthly profit" and "Loan required" are manually entered when they're mathematically derivable from other answered fields | Sheets 1 & 2 | Remove as input questions; compute and display, flag if a field worker's independent estimate disagrees sharply with the calculated figure |
| Free-text machinery cost breakup (`"Motorized Dough Kneader (10kg): ₹45,000 \| Mechanical Papad Press: ₹25,000..."`) — not machine-parseable | Filled example | Structured repeating table: Item / Qty / Unit Cost |
| Mixed units in one cell (`"₹35 per 250g packet (₹140 per kg)"`) | Filled example | Separate fields: unit type, price/unit, standardized price/kg (calculated) |
| No unique entrepreneur/case ID | All sheets | Add as first field, auto-generated |
| No timestamp/version on when data was collected | All sheets | Add `created_at`/`updated_at` — important for loan-decision recency |
| Document-availability fields (PAN/GST/FSSAI) duplicated across "compliance readiness" and "documents" sections with slightly different phrasing | Modules 10 & 11 | Single canonical Yes/No field per document, referenced wherever needed |
| No post-investment projection field for 10 of 12 sectors | Sector banks | Add one field per sector (Section 3/5) |

---

## 13. Technology Stack Options

**Option A — Fast MVP**
- Frontend: Web PWA (React) or simple Flutter app
- Backend: FastAPI or Node/Express
- DB: Postgres (Supabase)
- AI/LLM: Claude API, direct prompt calls, no RAG
- Auth: Supabase Auth
- File storage: Supabase Storage
- PDF: Templated HTML → PDF (e.g., a headless render step)
- Hosting: Vercel + Supabase
- Complexity: Low — a few weeks for a working single-sector (Food Processing) prototype

**Option B — Production-Ready**
- Frontend: React Native or Flutter (proper offline sync for field use)
- Backend: FastAPI/Node with proper service layering (questionnaire service, validation service, financial engine, document service)
- DB: Postgres with a normalized schema (entrepreneur, household, business, sector-answers, financials, loan, documents as separate related tables)
- AI/LLM: Claude API with structured JSON output mode, prompt templates versioned per document section
- Auth: Proper RBAC (Sakhi / DSK operator / reviewer / admin roles)
- File storage: S3-compatible, with document versioning
- PDF: Dedicated document-generation service with template versioning
- Hosting: Cloud (AWS/GCP) with CI/CD
- Complexity: Medium — a couple of months for multi-sector coverage with offline field support

**Option C — Enterprise/Scalable**
- All of Option B, plus: multi-tenant architecture if this is meant to serve multiple DSK networks/lenders; audit logging for compliance; RAG layer grounding market narratives in sector benchmark data; analytics dashboard for portfolio-level risk (DSCR distribution, sector concentration); integration hooks for actual bank/NBFC loan-origination systems
- Complexity: High — multi-quarter build, needs dedicated engineering team

---

## 14. Final Feasibility Assessment

### **FEASIBILITY: HIGH — for a defined MVP scope (single sector first, e.g., Food Processing, where the filled case study already proves the math)**
### MEDIUM for full 12-sector automated coverage without further field-design work.

1. **Can be automated immediately:** Identity/profile/household intake, existing-business snapshot, P&L calculation, project cost/loan requirement/EMI/DSCR calculation, working capital calculation, document checklist tracking.
2. **Requires additional data:** Post-investment projection fields (10 of 12 sectors), competitor/market-positioning fields, unique case ID, timestamps, structured machinery-cost tables.
3. **Requires financial rules:** All of Section 7 — none of it should touch the LLM.
4. **Requires AI:** Executive Summary, Business Description, Market Analysis, Competitive Positioning, Marketing Strategy, Risk narrative, Conclusion — all narrative, all grounded in pre-computed numbers.
5. **Requires human review:** Final DSK operator sign-off before any document reaches a bank; spot-checks on AI narrative for factual drift; edge-case loan structuring (guarantors, collateral) is a judgment call, not a rule.
6. **Should NOT be automated:** Final loan approval/sanction decision; CIBIL/credit-bureau judgment calls; anything touching collateral valuation without a human visit.
7. **MVP should contain:** One sector (Food Processing — it's the one with a validated real example), the ~70–80 field MVQ from Section 5, the deterministic financial engine, 3–5 AI-generated narrative sections, PDF export, DSK operator review step.
8. **Phase 2:** Remaining 11 sectors, the missing projection fields, structured machinery-table input, offline field-sync.
9. **Phase 3:** RAG-grounded market narratives, portfolio-level risk dashboard, direct bank/NBFC integration.

---

*This is analysis only — no application code has been written. Once you've reviewed this, I'm ready to move to questionnaire finalization and app design per your original brief.*
