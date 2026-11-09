import { notFound } from 'next/navigation';
import { StepHeader } from '@/components/step-header';
import { createClient } from '@/lib/supabase/server';
import { toQuestion, type Answers } from '@/lib/sector-questions';
import { saveDetails } from './actions';
import { DetailsForm } from './details-form';

export const metadata = { title: 'Industry details · DSK Business Plan Assistant' };

export default async function DetailsStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: biz } = await supabase
    .from('businesses')
    .select('id, sector_id, stage, sector_answers, sectors(name, icon, tint), entrepreneurs(full_name)')
    .eq('id', id)
    .maybeSingle();
  if (!biz) notFound();

  const { data: rows } = await supabase
    .from('sector_questions')
    .select('key, label, icon, type, options, placeholder, required, stage, show_if, sort_order')
    .eq('sector_id', biz.sector_id)
    .order('sort_order');

  const answers = (biz.sector_answers && typeof biz.sector_answers === 'object' && !Array.isArray(biz.sector_answers)
    ? biz.sector_answers
    : {}) as Answers;

  return (
    <div>
      <StepHeader
        step="details"
        title={`${biz.sectors?.name ?? 'Industry'} — a few more details`}
        subtitle="These help shape the market analysis and risk sections of the plan."
        sector={biz.sectors}
        name={biz.entrepreneurs?.full_name ?? null}
      />
      <DetailsForm action={saveDetails.bind(null, biz.id)} questions={(rows ?? []).map(toQuestion)} stage={biz.stage} answers={answers} />
    </div>
  );
}
