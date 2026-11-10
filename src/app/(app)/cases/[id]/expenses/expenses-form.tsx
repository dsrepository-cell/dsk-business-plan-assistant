'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AddRowButton, FlagNotes, MiniField, MiniInput, SummaryCard, miniInputClass, newKey } from '@/components/money';
import { ErrorFor, StepForm, StepNav, useStep, type StepState } from '@/components/step-form';
import { previewAtBaseline, type Frequency, type LoanInput, type Product } from '@/lib/engine';
import {
  CUSTOM_HEAD, FREQUENCIES, MAX_ROWS, blankExpense, draftsToEngineExpenses,
  type ExpenseDraft, type ExpenseHead,
} from '@/lib/finance-rows';
import { formatINR } from '@/lib/utils';

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & { errorKey: string }) {
  const { errors } = useStep();
  const { errorKey, ...rest } = props;
  return <select {...rest} aria-invalid={Boolean(errors[errorKey])} className={miniInputClass} />;
}

/** Prototype step 7: "Monthly business expenses". */
export function ExpensesForm({
  action,
  initial,
  heads,
  products,
  loan,
  statedMonthlyTurnover,
}: {
  action: (p: StepState, fd: FormData) => Promise<StepState>;
  initial: ExpenseDraft[];
  heads: ExpenseHead[];
  products: Product[];
  loan: LoanInput;
  statedMonthlyTurnover: number | null;
}) {
  const [rows, setRows] = useState<ExpenseDraft[]>(initial);
  const set = (key: string, field: keyof ExpenseDraft, value: string) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const engineExpenses = useMemo(() => draftsToEngineExpenses(rows, heads), [rows, heads]);
  const snap = useMemo(
    () => previewAtBaseline({ products, expenses: engineExpenses, loan, statedMonthlyTurnover }),
    [products, engineExpenses, loan, statedMonthlyTurnover],
  );
  const flags = snap.flags.filter((f) => f.code === 'TURNOVER_MISMATCH' || (f.code === 'NO_EXPENSES' && rows.length === 0));

  return (
    <StepForm action={action}>
      <input type="hidden" name="rows" value={JSON.stringify(rows)} />
      {rows.map((e, i) => {
        const id = (f: string) => `e-${e.key}-${f}`;
        return (
          <fieldset key={e.key} className="mb-3 rounded-lg border p-4">
            <legend className="sr-only">Expense {i + 1}</legend>
            <div className="grid grid-cols-[1.4fr_1fr] gap-2 sm:grid-cols-3">
              <div className="col-span-2 sm:col-span-1">
                <MiniField label="Expense head" htmlFor={id('head')}>
                  <Select id={id('head')} errorKey={`rows.${i}.head`} value={e.head} onChange={(ev) => set(e.key, 'head', ev.target.value)}>
                    <option value="">Select…</option>
                    {heads.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                    <option value={CUSTOM_HEAD}>Other (type it)</option>
                  </Select>
                  {e.head === CUSTOM_HEAD && (
                    <MiniInput
                      errorKey={`rows.${i}.custom`}
                      aria-label="Expense name"
                      className="mt-1"
                      value={e.custom}
                      onChange={(ev) => set(e.key, 'custom', ev.target.value)}
                      placeholder="Type expense name"
                      autoComplete="off"
                    />
                  )}
                </MiniField>
              </div>
              <MiniField label="Amount (₹)" htmlFor={id('amount')}>
                <MiniInput id={id('amount')} errorKey={`rows.${i}.amount`} inputMode="decimal" value={e.amount} onChange={(ev) => set(e.key, 'amount', ev.target.value)} />
              </MiniField>
              <MiniField label="Frequency" htmlFor={id('freq')}>
                <Select id={id('freq')} errorKey={`rows.${i}.frequency`} value={e.frequency} onChange={(ev) => set(e.key, 'frequency', ev.target.value as Frequency)}>
                  {FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </MiniField>
            </div>
            {['head', 'custom', 'amount', 'frequency'].map((f) => (
              <ErrorFor key={f} name={`rows.${i}.${f}`} />
            ))}
            <button
              type="button"
              onClick={() => setRows((list) => list.filter((r) => r.key !== e.key))}
              className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs text-destructive"
            >
              <Trash2 className="size-3.5" /> Remove
            </button>
          </fieldset>
        );
      })}

      <AddRowButton onClick={() => setRows((list) => [...list, blankExpense(newKey())])} disabled={rows.length >= MAX_ROWS}>
        <Plus className="size-4" /> Add expense
      </AddRowButton>
      <p className="-mt-3 mb-5 text-xs text-muted-foreground">
        Raw materials and stock are already counted in the product costs, and her existing loan EMI was entered
        earlier — don&apos;t add them again here.
      </p>

      <SummaryCard
        rows={[
          ['Total monthly expenses (calculated)', formatINR(snap.expenses.monthly)],
          ['Monthly operating profit (calculated)', formatINR(snap.monthlyOperatingProfit)],
        ]}
      />
      <FlagNotes flags={flags} />
      <StepNav />
    </StepForm>
  );
}
