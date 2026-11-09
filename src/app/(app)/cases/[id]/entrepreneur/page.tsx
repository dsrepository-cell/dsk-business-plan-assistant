import { notFound } from 'next/navigation';
import { StepHeader } from '@/components/step-header';
import { createClient } from '@/lib/supabase/server';
import { saveEntrepreneur } from './actions';
import { EntrepreneurForm } from './entrepreneur-form';

export const metadata = { title: 'Entrepreneur · DSK Business Plan Assistant' };

export default async function EntrepreneurStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: biz } = await supabase
    .from('businesses')
    .select(
      'id, sectors(name, icon, tint), entrepreneurs(full_name, gender, age_years, mobile, education, social_category, household_members, earning_members, dependents, monthly_family_income, consent_given_at)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!biz?.entrepreneurs) notFound();

  return (
    <div>
      <StepHeader step="entrepreneur" title="Entrepreneur & household" sector={biz.sectors} name={biz.entrepreneurs.full_name} />
      <EntrepreneurForm action={saveEntrepreneur.bind(null, biz.id)} values={biz.entrepreneurs} />
    </div>
  );
}
