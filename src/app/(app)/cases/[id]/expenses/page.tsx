import { notFound } from 'next/navigation';
import { StepHeader } from '@/components/step-header';
import { loadCaseFinance } from '@/lib/case-finance';
import { expenseDraft } from '@/lib/finance-rows';
import { saveExpenses } from './actions';
import { ExpensesForm } from './expenses-form';

export const metadata = { title: 'Monthly expenses · DSK Business Plan Assistant' };

export default async function ExpensesStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await loadCaseFinance(id);
  if (!f) notFound();

  return (
    <div>
      <StepHeader
        step="expenses"
        title="Monthly business expenses"
        subtitle="Add every regular cost — pick a suggested head or add your own, at any frequency."
        sector={f.biz.sectors}
        name={f.biz.entrepreneurs?.full_name ?? null}
      />
      <ExpensesForm
        action={saveExpenses.bind(null, f.biz.id)}
        initial={f.rows.expenses.map(expenseDraft)}
        heads={f.heads}
        products={f.engine.products}
        loan={f.engine.loan}
        statedMonthlyTurnover={f.engine.statedMonthlyTurnover}
      />
    </div>
  );
}
