import { notFound } from 'next/navigation';
import { StepHeader } from '@/components/step-header';
import { loadCaseFinance } from '@/lib/case-finance';
import { createClient } from '@/lib/supabase/server';
import { currentSuggestion, growthState, toGoals } from '@/lib/plans';
import { saveGrowth } from './actions';
import { GrowthForm } from './growth-form';

export const metadata = { title: 'Growth assumptions · DSK Business Plan Assistant' };

export default async function GrowthStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await loadCaseFinance(id);
  if (!f) notFound();

  const supabase = await createClient();
  const [{ data: fp }, { data: rows }] = await Promise.all([
    supabase.from('future_plans').select('goals').eq('business_id', id).maybeSingle(),
    supabase.from('growth_assumptions').select('year, suggested_pct, approved_pct, approved_at').eq('business_id', id),
  ]);

  const suggestion = currentSuggestion(f.biz.stage, toGoals(fp?.goals));
  const state = growthState(rows ?? [], suggestion);

  return (
    <div>
      <StepHeader
        step="growth"
        title="3-year growth assumptions"
        subtitle="System-suggested, based on her answers so far — review and adjust before approving."
        sector={f.biz.sectors}
        name={f.biz.entrepreneurs?.full_name ?? null}
      />
      <GrowthForm
        action={saveGrowth.bind(null, f.biz.id)}
        suggestion={suggestion}
        initial={state.approved ?? { y1: suggestion.y1, y2: suggestion.y2, y3: suggestion.y3 }}
        approved={state.isApproved}
        stale={state.stale}
        approvedAt={state.approvedAt}
        products={f.engine.products}
        expenses={f.engine.expenses}
        loan={f.engine.loan}
        assetCount={f.engine.assets.length}
      />
    </div>
  );
}
