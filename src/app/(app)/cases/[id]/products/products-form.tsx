'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AddRowButton, FlagNotes, MiniField, MiniInput, SummaryCard, newKey } from '@/components/money';
import { ErrorFor, StepForm, StepNav, type StepState } from '@/components/step-form';
import { previewAtBaseline, type ExpenseItem, type LoanInput } from '@/lib/engine';
import { MAX_ROWS, blankProduct, draftsToEngineProducts, type ProductDraft } from '@/lib/finance-rows';
import { formatINR } from '@/lib/utils';

const PRODUCT_FLAGS = new Set(['ZERO_COST', 'HIGH_MARGIN', 'THIN_MARGIN', 'LOSS_MAKING']);

/** Prototype step 5: "Products & costing". Totals are recalculated by the engine on every keystroke. */
export function ProductsForm({
  action,
  initial,
  defaultUnit,
  expenses,
  loan,
}: {
  action: (p: StepState, fd: FormData) => Promise<StepState>;
  initial: ProductDraft[];
  defaultUnit: string | null;
  expenses: ExpenseItem[];
  loan: LoanInput;
}) {
  const [rows, setRows] = useState<ProductDraft[]>(initial.length ? initial : [blankProduct(newKey())]);
  const set = (key: string, field: keyof ProductDraft, value: string) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const engineProducts = useMemo(() => draftsToEngineProducts(rows), [rows]);
  const snap = useMemo(() => previewAtBaseline({ products: engineProducts, expenses, loan }), [engineProducts, expenses, loan]);
  const flags = snap.flags.filter((f) => PRODUCT_FLAGS.has(f.code));

  return (
    <StepForm action={action}>
      <input type="hidden" name="rows" value={JSON.stringify(rows)} />
      {rows.map((p, i) => {
        const c = snap.products.rows[i];
        const id = (f: string) => `p-${p.key}-${f}`;
        return (
          <fieldset key={p.key} className="mb-3 rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <legend className="text-sm font-medium">Product {i + 1}</legend>
              <button
                type="button"
                aria-label={`Remove product ${i + 1}`}
                disabled={rows.length === 1}
                onClick={() => setRows((list) => list.filter((r) => r.key !== p.key))}
                className="-m-2 p-2 text-destructive disabled:opacity-30"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MiniField label="Product name" htmlFor={id('name')}>
                <MiniInput id={id('name')} errorKey={`rows.${i}.name`} value={p.name} onChange={(e) => set(p.key, 'name', e.target.value)} autoComplete="off" />
              </MiniField>
              <MiniField label="Unit" htmlFor={id('unit')}>
                <MiniInput id={id('unit')} errorKey={`rows.${i}.unit`} value={p.unit} onChange={(e) => set(p.key, 'unit', e.target.value)} placeholder={defaultUnit ?? 'piece'} autoComplete="off" />
              </MiniField>
              <MiniField label="Qty / month" htmlFor={id('qty')}>
                <MiniInput id={id('qty')} errorKey={`rows.${i}.qty`} inputMode="decimal" value={p.qty} onChange={(e) => set(p.key, 'qty', e.target.value)} />
              </MiniField>
              <MiniField label="Selling price / unit (₹)" htmlFor={id('price')}>
                <MiniInput id={id('price')} errorKey={`rows.${i}.price`} inputMode="decimal" value={p.price} onChange={(e) => set(p.key, 'price', e.target.value)} />
              </MiniField>
              <MiniField label="Direct cost / unit (₹)" htmlFor={id('direct')}>
                <MiniInput id={id('direct')} errorKey={`rows.${i}.direct`} inputMode="decimal" value={p.direct} onChange={(e) => set(p.key, 'direct', e.target.value)} />
              </MiniField>
              <MiniField label="Other variable cost / unit (₹)" htmlFor={id('other')}>
                <MiniInput id={id('other')} errorKey={`rows.${i}.other`} inputMode="decimal" value={p.other} onChange={(e) => set(p.key, 'other', e.target.value)} />
              </MiniField>
              <MiniField label="Max production capacity / month (optional)" htmlFor={id('capacity')}>
                <MiniInput id={id('capacity')} errorKey={`rows.${i}.capacity`} inputMode="decimal" value={p.capacity} onChange={(e) => set(p.key, 'capacity', e.target.value)} />
              </MiniField>
            </div>
            {['name', 'unit', 'qty', 'price', 'direct', 'other', 'capacity'].map((f) => (
              <ErrorFor key={f} name={`rows.${i}.${f}`} />
            ))}
            {c && c.revenue > 0 && (
              <div className="mt-3 flex justify-between border-t pt-3 text-xs text-primary">
                <span>Revenue: {formatINR(c.revenue)}/mo</span>
                <span>Margin: {c.grossMarginPct.toFixed(0)}%</span>
              </div>
            )}
          </fieldset>
        );
      })}

      <AddRowButton onClick={() => setRows((list) => [...list, blankProduct(newKey())])} disabled={rows.length >= MAX_ROWS}>
        <Plus className="size-4" /> Add another product
      </AddRowButton>

      <SummaryCard
        rows={[
          ['Total monthly revenue (calculated)', formatINR(snap.products.revenue)],
          ['Total direct cost (calculated)', formatINR(snap.products.directCost)],
          ['Gross profit (calculated)', formatINR(snap.products.grossProfit)],
          ['Weighted average margin', `${snap.products.grossMarginPct.toFixed(0)}%`],
        ]}
      />
      <FlagNotes flags={flags} />
      <ErrorFor name="rows" />
      <StepNav />
    </StepForm>
  );
}
