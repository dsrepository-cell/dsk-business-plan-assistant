import { notFound } from 'next/navigation';
import { StepHeader } from '@/components/step-header';
import { createClient } from '@/lib/supabase/server';
import { saveBusiness } from './actions';
import { BusinessForm } from './business-form';

export const metadata = { title: 'Existing business · DSK Business Plan Assistant' };

export default async function BusinessStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: biz } = await supabase
    .from('businesses')
    .select('id, stage, business_name, stated_monthly_turnover, sectors(name, icon, tint), entrepreneurs(full_name), loan_requests(existing_monthly_emi)')
    .eq('id', id)
    .maybeSingle();
  if (!biz) notFound();

  return (
    <div>
      <StepHeader step="business" title="Existing business" sector={biz.sectors} name={biz.entrepreneurs?.full_name ?? null} />
      <BusinessForm
        action={saveBusiness.bind(null, biz.id)}
        values={{
          stage: biz.stage,
          business_name: biz.business_name,
          stated_monthly_turnover: biz.stated_monthly_turnover,
          existing_monthly_emi: biz.loan_requests?.existing_monthly_emi ?? null,
        }}
      />
    </div>
  );
}
