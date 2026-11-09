/**
 * Next.js App Router handler.  Place at:  app/api/plans/generate/route.ts
 *
 * Flow:  auth -> load case (RLS-scoped) -> require approved assumptions -> deterministic engine
 *        -> AI narrative (server-side only) -> numberGuard -> store frozen plan_versions row.
 *
 * Env (server only):  ANTHROPIC_API_KEY, AI_MODEL (default claude-sonnet-5-5)
 * Deps:               @anthropic-ai/sdk  @supabase/ssr  zod
 */
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server'; // standard @supabase/ssr server helper (cookie-based session)
import { buildSnapshot, type Product, type ExpenseItem } from '@/lib/engine'; // copy of 03_engine/engine.ts
import { SYSTEM_PROMPT, PROMPT_VERSION, buildUserPrompt, narrativeSchema, numberGuard } from '@/lib/ai/prompts';

export const maxDuration = 60;

const MODEL = process.env.AI_MODEL || 'claude-sonnet-5-5';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { businessId } = (await req.json()) as { businessId?: string };
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 });

  // RLS guarantees the operator can only load cases from their own DSK centre.
  const [biz, products, expenses, assets, loan, plan, mkt, growth] = await Promise.all([
    supabase.from('businesses').select('*, entrepreneurs(*, loc_places(name, pincode, loc_taluks(name, loc_districts(name, loc_states(name)))))').eq('id', businessId).single(),
    supabase.from('products').select('*').eq('business_id', businessId).order('sort_order'),
    supabase.from('expenses').select('*, expense_heads(name)').eq('business_id', businessId),
    supabase.from('assets').select('*').eq('business_id', businessId),
    supabase.from('loan_requests').select('*').eq('business_id', businessId).maybeSingle(),
    supabase.from('future_plans').select('*').eq('business_id', businessId).maybeSingle(),
    supabase.from('marketing_plans').select('*').eq('business_id', businessId).maybeSingle(),
    supabase.from('growth_assumptions').select('*').eq('business_id', businessId).order('year'),
  ]);
  if (biz.error || !biz.data) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  // Gate: all three years must be approved by the DSK operator.
  const g = growth.data ?? [];
  if (g.length !== 3 || g.some((r) => r.approved_pct === null)) {
    return NextResponse.json({ error: 'Growth assumptions must be approved for all 3 years first.' }, { status: 409 });
  }
  const assumptions = { y1: Number(g[0].approved_pct), y2: Number(g[1].approved_pct), y3: Number(g[2].approved_pct) };

  const eProducts: Product[] = (products.data ?? []).map((p) => ({
    id: p.id, name: p.name, unit: p.unit ?? undefined,
    qtyPerMonth: Number(p.qty_per_month), sellingPrice: Number(p.selling_price),
    directCostPerUnit: Number(p.direct_cost_per_unit), otherCostPerUnit: Number(p.other_cost_per_unit),
    maxCapacityPerMonth: p.max_capacity_per_month === null ? null : Number(p.max_capacity_per_month),
  }));
  const eExpenses: ExpenseItem[] = (expenses.data ?? []).map((e) => ({
    id: e.id, head: e.expense_heads?.name ?? e.custom_head ?? 'Other', amount: Number(e.amount), frequency: e.frequency,
  }));
  const proposedAssets = (assets.data ?? []).filter((a) => a.is_proposed);
  const assetCost = proposedAssets.reduce((s, a) => s + Number(a.qty) * Number(a.unit_cost), 0);
  const L = loan.data;
  const totalProjectCost = assetCost + Number(L?.other_setup_cost ?? 0);

  const snapshot = buildSnapshot({
    products: eProducts, expenses: eExpenses, assumptions,
    statedMonthlyTurnover: biz.data.stated_monthly_turnover ? Number(biz.data.stated_monthly_turnover) : null,
    fixedAssetCount: proposedAssets.length,
    loan: {
      totalProjectCost, ownContribution: Number(L?.own_contribution ?? 0),
      requestedAmount: L?.requested_amount ? Number(L.requested_amount) : null,
      tenureMonths: L?.tenure_months ?? 36, annualRatePct: Number(L?.interest_rate_pct ?? 11.5),
      moratoriumMonths: L?.moratorium_months ?? 0, existingMonthlyEmi: Number(L?.existing_monthly_emi ?? 0),
    },
  });

  // Blocking errors must be fixed by the operator before a plan is generated.
  const blockers = snapshot.flags.filter((f) => f.severity === 'error');
  if (blockers.length) return NextResponse.json({ error: 'Fix these first', blockers }, { status: 422 });

  const ent = biz.data.entrepreneurs;
  const place = ent?.loc_places;
  const context = {
    entrepreneur: { name: ent?.full_name, education: ent?.education, socialCategory: ent?.social_category, householdMembers: ent?.household_members },
    location: { village: place?.name, mandal: place?.loc_taluks?.name, district: place?.loc_taluks?.loc_districts?.name, state: place?.loc_taluks?.loc_districts?.loc_states?.name, pincode: place?.pincode },
    business: { sector: biz.data.sector_id, stage: biz.data.stage, name: biz.data.business_name, sectorAnswers: biz.data.sector_answers },
    products: snapshot.products.rows.map((p) => ({ name: p.name, unit: p.unit, qtyPerMonth: p.qtyPerMonth, sellingPrice: p.sellingPrice, revenuePerMonth: p.revenue, grossMarginPct: p.grossMarginPct, maxCapacityPerMonth: p.maxCapacityPerMonth })),
    expenseTotals: { monthly: snapshot.expenses.monthly, annual: snapshot.expenses.annual, heads: snapshot.expenses.rows.map((e) => ({ head: e.head, monthly: e.monthly })) },
    monthlyOperatingProfit: snapshot.monthlyOperatingProfit,
    loan: snapshot.loan,
    projection: snapshot.projection.map(({ year, growthPct, revenue, ebitda, netProfit, dscr }) => ({ year, growthPct, revenue, ebitda, netProfit, dscr })),
    growthReasons: g.map((r) => ({ year: r.year, suggestedPct: Number(r.suggested_pct), approvedPct: Number(r.approved_pct), reasons: r.suggested_reasons })),
    futurePlan: plan.data, marketing: mkt.data,
    validationFlags: snapshot.flags.map((f) => f.message),
  };

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  async function draft(extra?: string) {
    const msg = await anthropic.messages.create({
      model: MODEL, max_tokens: 4000, system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(context) + (extra ? `\n\n${extra}` : '') }],
    });
    const text = msg.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
    return narrativeSchema.parse(JSON.parse(text.replace(/```json|```/g, '').trim()));
  }

  let narrative;
  let warnings: string[] = [];
  try {
    narrative = await draft();
    let bad = numberGuard(narrative, context);
    if (bad.length) {
      narrative = await draft(`Your previous draft contained numbers not present in the input: ${bad.join(', ')}. Rewrite without them. Use only numbers from the input.`);
      bad = numberGuard(narrative, context);
    }
    warnings = bad;
  } catch (e) {
    return NextResponse.json({ error: 'AI generation failed', detail: String(e) }, { status: 502 });
  }

  const { data: last } = await supabase.from('plan_versions').select('version').eq('business_id', businessId).order('version', { ascending: false }).limit(1).maybeSingle();
  const version = (last?.version ?? 0) + 1;
  const { data: row, error } = await supabase.from('plan_versions').insert({
    business_id: businessId, version, status: 'generated', engine_snapshot: snapshot, narrative,
    narrative_warnings: warnings.map((w) => `Number "${w}" in the narrative is not in the verified data. Please check.`),
    model: MODEL, prompt_version: PROMPT_VERSION, created_by: auth.user.id,
  }).select('id, version').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // mark earlier versions superseded (approved ones stay approved)
  await supabase.from('plan_versions').update({ status: 'superseded' }).eq('business_id', businessId).neq('id', row.id).in('status', ['generated', 'edited']);

  return NextResponse.json({ planId: row.id, version: row.version, warnings, flags: snapshot.flags });
}
