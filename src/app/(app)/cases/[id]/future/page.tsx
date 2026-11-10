import { notFound } from 'next/navigation';
import { StepHeader } from '@/components/step-header';
import { createClient } from '@/lib/supabase/server';
import { toGoals } from '@/lib/plans';
import { saveFuturePlan } from './actions';
import { FutureForm } from './future-form';

export const metadata = { title: 'Future plan · DSK Business Plan Assistant' };

export default async function FutureStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: biz } = await supabase
    .from('businesses')
    .select('id, sectors(name, icon, tint), entrepreneurs(full_name), future_plans(goals, loan_goal, three_year_vision)')
    .eq('id', id)
    .maybeSingle();
  if (!biz) notFound();
  const fp = biz.future_plans;

  return (
    <div>
      <StepHeader step="future" title="Future plan" sector={biz.sectors} name={biz.entrepreneurs?.full_name ?? null} />
      <FutureForm
        action={saveFuturePlan.bind(null, biz.id)}
        values={{ goals: toGoals(fp?.goals), loan_goal: fp?.loan_goal ?? null, three_year_vision: fp?.three_year_vision ?? null }}
      />
    </div>
  );
}
