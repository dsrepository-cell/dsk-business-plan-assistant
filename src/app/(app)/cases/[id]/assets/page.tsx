import { notFound } from 'next/navigation';
import { StepHeader } from '@/components/step-header';
import { loadCaseFinance } from '@/lib/case-finance';
import { assetDraft } from '@/lib/finance-rows';
import { saveAssets } from './actions';
import { AssetsForm } from './assets-form';

export const metadata = { title: 'Loan purpose · DSK Business Plan Assistant' };

export default async function AssetsStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await loadCaseFinance(id);
  if (!f) notFound();

  return (
    <div>
      <StepHeader
        step="assets"
        title="What does she need the loan for?"
        subtitle="Machinery, equipment or stock — add one row per item."
        sector={f.biz.sectors}
        name={f.biz.entrepreneurs?.full_name ?? null}
      />
      <AssetsForm
        action={saveAssets.bind(null, f.biz.id)}
        initial={f.rows.assets.map(assetDraft)}
        otherSetupCost={Number(f.rows.loan.other_setup_cost)}
        ownContribution={Number(f.rows.loan.own_contribution)}
      />
    </div>
  );
}
