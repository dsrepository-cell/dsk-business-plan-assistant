import 'server-only';
import { buildPlanContext } from '@/lib/ai/context';
import type { loadReadiness } from '@/lib/case-readiness';
import { toGoals } from '@/lib/plans';
import type { Answers } from '@/lib/sector-questions';
import { createClient } from '@/lib/supabase/server';

type Loaded = NonNullable<Awaited<ReturnType<typeof loadReadiness>>>;

/** Everything descriptive the narrative needs, read RLS-scoped and assembled into the frozen plan context. */
export async function loadPlanContext(businessId: string, r: Loaded) {
  const supabase = await createClient();
  const f = r.finance;
  const [{ data: biz }, { data: qs }, { data: growth }] = await Promise.all([
    supabase
      .from('businesses')
      .select(
        'business_name, sector_answers, entrepreneurs(full_name, education, social_category, household_members, loc_places(name, pincode, loc_taluks(loc_districts(name, loc_states(name))))), future_plans(goals, loan_goal, three_year_vision), marketing_plans(target_customers, current_channels, proposed_channels, pricing_strategy, competitive_advantage)',
      )
      .eq('id', businessId)
      .single(),
    supabase.from('sector_questions').select('key, label, sort_order').eq('sector_id', f.biz.sector_id).order('sort_order'),
    supabase.from('growth_assumptions').select('year, suggested_pct, approved_pct, suggested_reasons').eq('business_id', businessId).order('year'),
  ]);
  if (!biz) throw new Error('case not found');

  const e = biz.entrepreneurs;
  const place = e?.loc_places;
  const answers = (biz.sector_answers && typeof biz.sector_answers === 'object' && !Array.isArray(biz.sector_answers)
    ? biz.sector_answers
    : {}) as Answers;
  const sectorAnswers: Record<string, string | number | string[]> = {};
  for (const q of qs ?? []) if (answers[q.key] !== undefined && answers[q.key] !== '') sectorAnswers[q.label] = answers[q.key];

  return buildPlanContext({
    snapshot: r.readiness.snapshot,
    entrepreneur: {
      name: e?.full_name ?? null,
      education: e?.education ?? null,
      socialCategory: e?.social_category ?? null,
      householdMembers: e?.household_members ?? null,
    },
    location: {
      village: place?.name ?? null,
      district: place?.loc_taluks?.loc_districts?.name ?? null,
      state: place?.loc_taluks?.loc_districts?.loc_states?.name ?? null,
      pincode: place?.pincode ?? null,
    },
    business: { sectorName: f.biz.sectors?.name ?? 'Business', stage: f.biz.stage, name: biz.business_name },
    sectorAnswers,
    assets: r.readiness.projectCost.rows.map((a) => ({ name: a.name, cost: a.total })), // engine totals
    otherSetupCost: Number(f.rows.loan.other_setup_cost),
    growth: (growth ?? []).map((g) => ({
      year: g.year,
      suggestedPct: Number(g.suggested_pct),
      approvedPct: Number(g.approved_pct),
      reasons: Array.isArray(g.suggested_reasons) ? g.suggested_reasons.map(String) : [],
    })),
    futurePlan: biz.future_plans
      ? { goals: toGoals(biz.future_plans.goals), loanGoal: biz.future_plans.loan_goal, threeYearVision: biz.future_plans.three_year_vision }
      : null,
    marketing: biz.marketing_plans
      ? {
          targetCustomers: biz.marketing_plans.target_customers,
          currentChannels: biz.marketing_plans.current_channels ?? [],
          proposedChannels: biz.marketing_plans.proposed_channels ?? [],
          pricingStrategy: biz.marketing_plans.pricing_strategy,
          competitiveAdvantage: biz.marketing_plans.competitive_advantage,
        }
      : null,
  });
}
