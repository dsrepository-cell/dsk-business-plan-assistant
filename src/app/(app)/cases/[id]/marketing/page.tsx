import { notFound } from 'next/navigation';
import { StepHeader } from '@/components/step-header';
import { createClient } from '@/lib/supabase/server';
import { saveMarketing } from './actions';
import { MarketingForm } from './marketing-form';

export const metadata = { title: 'Marketing & sales · DSK Business Plan Assistant' };

export default async function MarketingStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: biz } = await supabase
    .from('businesses')
    .select(
      'id, sectors(name, icon, tint), entrepreneurs(full_name), marketing_plans(target_customers, current_channels, proposed_channels, pricing_strategy, competitive_advantage)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!biz) notFound();
  const m = biz.marketing_plans;

  return (
    <div>
      <StepHeader step="marketing" title="Marketing & sales" sector={biz.sectors} name={biz.entrepreneurs?.full_name ?? null} />
      <MarketingForm
        action={saveMarketing.bind(null, biz.id)}
        values={{
          target_customers: m?.target_customers ?? null,
          current_channels: m?.current_channels ?? [],
          proposed_channels: m?.proposed_channels ?? [],
          pricing_strategy: m?.pricing_strategy ?? null,
          competitive_advantage: m?.competitive_advantage ?? null,
        }}
      />
    </div>
  );
}
