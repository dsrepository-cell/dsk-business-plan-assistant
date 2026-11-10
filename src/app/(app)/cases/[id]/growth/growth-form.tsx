'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { Field, inputClass } from '@/components/field';
import { FlagNotes } from '@/components/money';
import { ErrorFor, StepForm, StepNav, useStep, type StepState } from '@/components/step-form';
import { buildSnapshot, type Assumptions, type ExpenseItem, type LoanInput, type Product } from '@/lib/engine';
import { parseNumber } from '@/lib/numbers';
import { cn, formatINR } from '@/lib/utils';

const KEYS = ['y1', 'y2', 'y3'] as const;
const GROWTH_FLAGS = new Set(['HIGH_GROWTH', 'CAPACITY_EXCEEDED', 'NEGATIVE_CASH', 'NEGATIVE_PROFIT']);

function PctInput(props: React.InputHTMLAttributes<HTMLInputElement> & { name: string }) {
  const { errors } = useStep();
  return (
    <input
      {...props}
      inputMode="decimal"
      aria-invalid={Boolean(errors[props.name])}
      className={cn(inputClass, 'max-w-[140px]', errors[props.name] && 'border-destructive')}
    />
  );
}

function ApproveBox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { errors } = useStep();
  return (
    <div className="mb-6">
      <label className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-sm', errors.approve && 'border-destructive')}>
        <input type="checkbox" name="approve" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-5 accent-[#1f4b3f]" />
        <span>DSK operator has reviewed and approved these growth assumptions.</span>
      </label>
      <ErrorFor name="approve" />
    </div>
  );
}

/** Prototype step 12: "3-year growth assumptions" — suggested (system) and approved (operator) shown separately. */
export function GrowthForm({
  action,
  suggestion,
  initial,
  approved,
  stale,
  approvedAt,
  products,
  expenses,
  loan,
  assetCount,
}: {
  action: (p: StepState, fd: FormData) => Promise<StepState>;
  suggestion: Assumptions & { reasons: string[] };
  initial: Assumptions;
  approved: boolean;
  stale: boolean;
  approvedAt: string | null;
  products: Product[];
  expenses: ExpenseItem[];
  loan: LoanInput;
  assetCount: number;
}) {
  const [vals, setVals] = useState<Record<(typeof KEYS)[number], string>>({ y1: String(initial.y1), y2: String(initial.y2), y3: String(initial.y3) });
  const [ok, setOk] = useState(approved);

  const assumptions = useMemo<Assumptions>(() => {
    const pct = (s: string) => {
      const v = parseNumber(s.replace(/%$/, ''));
      return v !== null && Number.isFinite(v) ? Math.max(-50, Math.min(v, 100)) : 0;
    };
    return { y1: pct(vals.y1), y2: pct(vals.y2), y3: pct(vals.y3) };
  }, [vals]);
  const snap = useMemo(
    () => buildSnapshot({ products, expenses, loan, assumptions, fixedAssetCount: assetCount }),
    [products, expenses, loan, assumptions, assetCount],
  );
  const flags = snap.flags.filter((f) => GROWTH_FLAGS.has(f.code));

  return (
    <StepForm action={action}>
      {stale && (
        <div className="mb-4 flex gap-3 rounded-lg bg-warning-soft p-3.5 text-sm text-warning-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Her answers changed after these figures were approved, so the system suggestion is now {suggestion.y1}% / {suggestion.y2}% /{' '}
            {suggestion.y3}%. Please review and approve again.
          </span>
        </div>
      )}

      <div className="mb-4 rounded-lg border p-4">
        <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Why these numbers</div>
        <ul className="space-y-1 text-sm">
          {suggestion.reasons.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
      </div>

      {KEYS.map((k, i) => (
        <Field key={k} icon={TrendingUp} label={`Year ${i + 1} revenue growth (%)`} hint={`System suggested: ${suggestion[k]}%`} htmlFor={k}>
          <PctInput
            id={k}
            name={k}
            value={vals[k]}
            onChange={(e) => {
              setVals((v) => ({ ...v, [k]: e.target.value }));
              setOk(false); // a changed figure needs a fresh approval
            }}
          />
          <ErrorFor name={k} />
        </Field>
      ))}

      <div className="mb-4 rounded-lg bg-primary-soft p-4 text-sm text-primary">
        <div className="mb-2 font-medium">At these rates (calculated)</div>
        <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 tabular-nums">
          <span />
          <span className="text-right text-xs">Revenue</span>
          <span className="text-right text-xs">Net profit</span>
          {snap.projection.map((r) => (
            <div key={r.year} className="contents">
              <span>Year {r.year}</span>
              <span className="text-right">{formatINR(r.revenue)}</span>
              <span className="text-right">{formatINR(r.netProfit)}</span>
            </div>
          ))}
        </div>
      </div>
      <FlagNotes flags={flags} />

      <ApproveBox checked={ok} onChange={setOk} />
      {approved && approvedAt && ok && (
        <p className="-mt-4 mb-6 text-xs text-muted-foreground">
          Approved on {new Date(approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.
        </p>
      )}
      <StepNav />
    </StepForm>
  );
}
