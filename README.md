# DSK Business Plan Assistant

Mobile-first web app for Access Livelihoods. A Digital Seva Kendra (DSK) operator sits with a woman entrepreneur, answers simple icon-led questions together with her, and gets a financially validated, loan-ready Business Plan / DPR (PDF) for DSK review.

> Status: **Phase 0 (scaffold)**. See `kit/01_MASTER_PROMPT.md` for the full phase plan.

## Stack

Next.js 15 (App Router, TypeScript) · Tailwind v4 + shadcn/ui · lucide-react · Supabase (Postgres, Auth, Storage, RLS) · zod · vitest · Playwright · Vercel.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in values; never commit them
npm run dev                  # http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm test` | Unit tests (financial engine + AI number guard) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Production build |

## Layout

```
src/lib/engine.ts        Deterministic financial engine. Every rupee figure comes from here. No AI.
src/lib/ai/prompts.ts    System prompt, narrative schema, numberGuard (rejects invented numbers).
src/components/ui/       shadcn/ui components (vendored source).
kit/                     Build kit: schema, seed, prototype, reference docs. Read-only reference;
                         excluded from lint, typecheck and tests. The app's own copies live in src/.
```

## Rules that don't bend

1. **No AI-invented numbers.** Money, %, EMI, DSCR and projections come from `engine.ts`; the LLM writes prose only and `numberGuard()` checks it.
2. **One source of truth.** Products, expenses, assets, loan and location are stored once; revenue/margin/EMI are computed, never entered.
3. **Secrets stay server-side.** `ANTHROPIC_API_KEY` and the Supabase service-role key are never `NEXT_PUBLIC_`.
4. **RLS on every table.** Operators see only their centre's cases; only reviewer/admin can approve.
5. **No Aadhaar / PAN / mobile numbers in prompts or logs.**

## Known limitations

- DSCR is **indicative**: EBITDA ÷ debt service, no tax or depreciation.
- Location data is post-office based: "village" means post-office area; "Mandal" is the directory's taluk field.
- Growth assumptions are rule-based defaults approved by the operator, not forecasts.

## Notes for contributors

- shadcn/ui: `components.json` is configured (new-york style, lucide icons). Add components with `npx shadcn@latest add <name>`.
- `postcss` is pinned via `overrides` to a patched release (Next 15 bundles an older one).
