'use client';

import { useMemo, useState } from 'react';
import { Banknote, Calendar, Percent } from 'lucide-react';
import { Field, inputClass } from '@/components/field';
import { FlagNotes, SummaryCard } from '@/components/money';
import { ErrorFor, StepForm, StepNav, useStep, type StepState } from '@/components/step-form';
import { previewAtBaseline, type ExpenseItem, type LoanInput, type Product } from '@/lib/engine';
import { liveNumber, parseNumber } from '@/lib/numbers';
import { cn, formatINR } from '@/lib/utils';

const LOAN_FLAGS = new Set(['LOW_DSCR', 'LOAN_MISMATCH', 'NO_ASSET_LIST']);

function NumInput(props: React.InputHTMLAttributes<HTMLInputElement> & { name: string }) {
  const { errors } = useStep();
  return (
    <input
      {...props}
      inputMode="decimal"
      aria-invalid={Boolean(errors[props.name])}
      className={cn(inputClass, props.className, errors[props.name] && 'border-destructive')}
    />
  );
}

type Terms = { tenure: string; rate: string; moratorium: string; requested: string };

/** Prototype step 9: "Loan terms", with EMI and repayment coverage worked out live by the engine. */
export function LoanForm({
  action,
  initial,
  products,
  expenses,
  loan,
  assetCount,
  statedMonthlyTurnover,
}: {
  action: (p: StepState, fd: FormData) => Promise<StepState>;
  initial: Terms;
  products: Product[];
  expenses: ExpenseItem[];
  loan: LoanInput;
  assetCount: number;
  statedMonthlyTurnover: number | null;
}) {
  const [t, setT] = useState<Terms>(initial);
  const on = (k: keyof Terms) => (e: React.ChangeEvent<HTMLInputElement>) => setT((s) => ({ ...s, [k]: e.target.value }));

  const snap = useMemo(() => {
    const tenure = Math.floor(liveNumber(t.tenure));
    const requested = parseNumber(t.requested);
    return previewAtBaseline({
      products,
      expenses,
      statedMonthlyTurnover,
      fixedAssetCount: assetCount,
      loan: {
        ...loan,
        tenureMonths: tenure,
        annualRatePct: liveNumber(t.rate),
        moratoriumMonths: Math.min(Math.floor(liveNumber(t.moratorium)), Math.max(tenure - 1, 0)),
        requestedAmount: requested !== null && Number.isFinite(requested) && requested > 0 ? requested : null,
      },
    });
  }, [t, products, expenses, loan, assetCount, statedMonthlyTurnover]);

  const dscr = snap.dscrYear1;
  const dscrClass = dscr === null ? 'text-muted-foreground' : dscr >= 1.25 ? 'text-primary' : dscr >= 1 ? 'text-warning' : 'text-destructive';
  const flags = snap.flags.filter((f) => LOAN_FLAGS.has(f.code));

  return (
    <StepForm action={action}>
      <Field icon={Calendar} label="Preferred tenure (months)" hint="Including any moratorium months." htmlFor="tenure_months">
        <NumInput id="tenure_months" name="tenure_months" value={t.tenure} onChange={on('tenure')} className="max-w-[140px]" />
        <ErrorFor name="tenure_months" />
      </Field>
      <Field icon={Percent} label="Interest rate (% per year)" htmlFor="interest_rate_pct">
        <NumInput id="interest_rate_pct" name="interest_rate_pct" value={t.rate} onChange={on('rate')} className="max-w-[140px]" />
        <ErrorFor name="interest_rate_pct" />
      </Field>
      <Field icon={Calendar} label="Moratorium (months)" hint="Months at the start when she pays interest only." htmlFor="moratorium_months">
        <NumInput id="moratorium_months" name="moratorium_months" value={t.moratorium} onChange={on('moratorium')} className="max-w-[140px]" />
        <ErrorFor name="moratorium_months" />
      </Field>
      <Field
        icon={Banknote}
        label="Loan amount requested by entrepreneur, if different (₹)"
        hint="Optional — leave blank to use the calculated figure."
        htmlFor="requested_amount"
      >
        <NumInput id="requested_amount" name="requested_amount" value={t.requested} onChange={on('requested')} className="max-w-[200px]" />
        <ErrorFor name="requested_amount" />
      </Field>

      <SummaryCard
        rows={[
          ['Loan required (calculated)', formatINR(snap.loan.required)],
          [`Own contribution (${snap.loan.ownContributionPct.toFixed(0)}% of project)`, formatINR(snap.loan.ownContribution)],
          ['Monthly EMI (calculated)', formatINR(snap.loan.emi)],
          ...(loan.existingMonthlyEmi > 0
            ? ([['Existing loan EMI (entered earlier)', formatINR(loan.existingMonthlyEmi)]] as [string, string][])
            : []),
          ['Monthly operating profit', formatINR(snap.monthlyOperatingProfit)],
          [
            'Indicative repayment coverage (DSCR)',
            <span key="d" className={cn('font-semibold', dscrClass)}>
              {dscr === null ? '—' : `${dscr.toFixed(2)}×`}
            </span>,
          ],
        ]}
      />
      <p className="-mt-2 mb-4 text-xs text-muted-foreground">
        DSCR is indicative: Year 1 at today&apos;s sales level, before any growth, counting moratorium months as
        interest-only. Most lenders look for 1.25× or more.
      </p>
      <FlagNotes flags={flags} />
      <StepNav />
    </StepForm>
  );
}
