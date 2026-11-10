import { notFound } from 'next/navigation';
import { StepHeader } from '@/components/step-header';
import { loadCaseFinance } from '@/lib/case-finance';
import { saveLoan } from './actions';
import { LoanForm } from './loan-form';

export const metadata = { title: 'Loan terms · DSK Business Plan Assistant' };

export default async function LoanStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await loadCaseFinance(id);
  if (!f) notFound();
  const l = f.rows.loan;

  return (
    <div>
      <StepHeader step="loan" title="Loan terms" sector={f.biz.sectors} name={f.biz.entrepreneurs?.full_name ?? null} />
      <LoanForm
        action={saveLoan.bind(null, f.biz.id)}
        initial={{
          tenure: String(l.tenure_months),
          rate: String(Number(l.interest_rate_pct)),
          moratorium: String(l.moratorium_months),
          requested: l.requested_amount == null ? '' : String(Number(l.requested_amount)),
        }}
        products={f.engine.products}
        expenses={f.engine.expenses}
        loan={f.engine.loan}
        assetCount={f.engine.assets.length}
        statedMonthlyTurnover={f.engine.statedMonthlyTurnover}
      />
    </div>
  );
}
