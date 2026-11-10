'use client';

import { useMemo, useState } from 'react';
import { FileText, PiggyBank, Plus, Trash2 } from 'lucide-react';
import { Field, inputClass } from '@/components/field';
import { AddRowButton, MiniInput, SummaryCard, newKey } from '@/components/money';
import { ErrorFor, StepForm, StepNav, useStep, type StepState } from '@/components/step-form';
import { loanRequired, summarizeAssets } from '@/lib/engine';
import { MAX_ROWS, blankAsset, draftsToEngineAssets, type AssetDraft } from '@/lib/finance-rows';
import { liveNumber } from '@/lib/numbers';
import { cn, formatINR } from '@/lib/utils';

function MoneyInput(props: React.InputHTMLAttributes<HTMLInputElement> & { name: string }) {
  const { errors } = useStep();
  return (
    <input
      {...props}
      inputMode="decimal"
      aria-invalid={Boolean(errors[props.name])}
      className={cn(inputClass, 'max-w-[200px]', errors[props.name] && 'border-destructive')}
    />
  );
}

/** Prototype step 8: "What does she need the loan for?" */
export function AssetsForm({
  action,
  initial,
  otherSetupCost,
  ownContribution,
}: {
  action: (p: StepState, fd: FormData) => Promise<StepState>;
  initial: AssetDraft[];
  otherSetupCost: number;
  ownContribution: number;
}) {
  const [rows, setRows] = useState<AssetDraft[]>(initial.length ? initial : [blankAsset(newKey())]);
  const [other, setOther] = useState(otherSetupCost ? String(otherSetupCost) : '');
  const [own, setOwn] = useState(ownContribution ? String(ownContribution) : '');
  const set = (key: string, field: keyof AssetDraft, value: string) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const cost = useMemo(() => summarizeAssets(draftsToEngineAssets(rows), liveNumber(other)), [rows, other]);
  const required = loanRequired(cost.totalProjectCost, liveNumber(own));

  return (
    <StepForm action={action}>
      <input type="hidden" name="rows" value={JSON.stringify(rows)} />
      <div className="mb-4">
        {rows.map((m, i) => (
          <div key={m.key} className="mb-2">
            <div className="flex items-center gap-2">
              <MiniInput
                errorKey={`rows.${i}.name`}
                aria-label={`Item ${i + 1}`}
                value={m.name}
                onChange={(e) => set(m.key, 'name', e.target.value)}
                placeholder={`Item ${i + 1} — e.g. Sewing machine`}
                autoComplete="off"
              />
              <MiniInput
                errorKey={`rows.${i}.cost`}
                aria-label={`Item ${i + 1} cost in rupees`}
                inputMode="decimal"
                value={m.cost}
                onChange={(e) => set(m.key, 'cost', e.target.value)}
                placeholder="₹ cost"
                className="max-w-[130px]"
              />
              <button
                type="button"
                aria-label={`Remove item ${i + 1}`}
                onClick={() => setRows((list) => list.filter((r) => r.key !== m.key))}
                className="shrink-0 rounded-lg p-2.5 text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <ErrorFor name={`rows.${i}.name`} />
            <ErrorFor name={`rows.${i}.cost`} />
          </div>
        ))}
        <AddRowButton onClick={() => setRows((list) => [...list, blankAsset(newKey())])} disabled={rows.length >= MAX_ROWS}>
          <Plus className="size-4" /> Add another item
        </AddRowButton>
      </div>

      <Field icon={FileText} label="Other one-time setup costs (₹)" hint="Registration, licence, branding, etc." htmlFor="other_setup_cost">
        <MoneyInput id="other_setup_cost" name="other_setup_cost" value={other} onChange={(e) => setOther(e.target.value)} />
        <ErrorFor name="other_setup_cost" />
      </Field>
      <Field icon={PiggyBank} label="How much can she contribute herself? (₹)" htmlFor="own_contribution">
        <MoneyInput id="own_contribution" name="own_contribution" value={own} onChange={(e) => setOwn(e.target.value)} />
        <ErrorFor name="own_contribution" />
      </Field>

      <SummaryCard
        rows={[
          ['Total project cost (calculated)', formatINR(cost.totalProjectCost)],
          ['Loan required (calculated)', formatINR(required)],
        ]}
      />
      <StepNav />
    </StepForm>
  );
}
