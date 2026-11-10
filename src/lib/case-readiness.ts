import 'server-only';
import { loadCaseFinance } from '@/lib/case-finance';
import { currentSuggestion, growthState, toGoals } from '@/lib/plans';
import { assessReadiness } from '@/lib/readiness';
import { toQuestion, visibleQuestions, type Answers } from '@/lib/sector-questions';
import { createClient } from '@/lib/supabase/server';

/** Read everything the readiness check needs for one case (RLS-scoped) and run it. null = case not visible. */
export async function loadReadiness(businessId: string) {
  const f = await loadCaseFinance(businessId);
  if (!f) return null;

  const supabase = await createClient();
  const [{ data: biz }, { data: qs }, { data: growthRows }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, status, sector_answers, entrepreneurs(full_name, consent_given_at, place_id), future_plans(goals)')
      .eq('id', businessId)
      .maybeSingle(),
    supabase
      .from('sector_questions')
      .select('key, label, icon, type, options, placeholder, required, stage, show_if, sort_order')
      .eq('sector_id', f.biz.sector_id),
    supabase.from('growth_assumptions').select('year, suggested_pct, approved_pct, approved_at').eq('business_id', businessId),
  ]);
  if (!biz) return null;

  const answers = (biz.sector_answers && typeof biz.sector_answers === 'object' && !Array.isArray(biz.sector_answers)
    ? biz.sector_answers
    : {}) as Answers;
  const missingRequiredQuestions = visibleQuestions((qs ?? []).map(toQuestion), f.biz.stage, answers)
    .filter((q) => q.required && (answers[q.key] === undefined || answers[q.key] === ''))
    .map((q) => q.label);

  const suggestion = currentSuggestion(f.biz.stage, toGoals(biz.future_plans?.goals));
  const growth = growthState(growthRows ?? [], suggestion);

  const readiness = assessReadiness({
    entrepreneur: {
      fullName: biz.entrepreneurs?.full_name ?? null,
      consentGivenAt: biz.entrepreneurs?.consent_given_at ?? null,
      placeId: biz.entrepreneurs?.place_id ?? null,
    },
    stage: f.biz.stage,
    missingRequiredQuestions,
    products: f.engine.products,
    expenses: f.engine.expenses,
    assets: f.engine.assets,
    otherSetupCost: Number(f.rows.loan.other_setup_cost),
    loan: {
      ownContribution: f.engine.loan.ownContribution,
      requestedAmount: f.engine.loan.requestedAmount,
      tenureMonths: f.engine.loan.tenureMonths,
      annualRatePct: f.engine.loan.annualRatePct,
      moratoriumMonths: f.engine.loan.moratoriumMonths,
      existingMonthlyEmi: f.engine.loan.existingMonthlyEmi,
    },
    statedMonthlyTurnover: f.engine.statedMonthlyTurnover,
    growth: { approved: growth.approved, stale: growth.stale },
  });

  return { finance: f, status: biz.status, growth, readiness };
}
