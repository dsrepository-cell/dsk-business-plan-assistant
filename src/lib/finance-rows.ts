/**
 * Products, expenses and assets as she types them (strings) → validated rows to save, and → engine inputs.
 * No imports beyond the engine types and number parsing, so the same rules run live in the browser and,
 * authoritatively, in the server action. Error keys are `rows.<index>.<field>` (index in the submitted list).
 */
import type { AssetItem, ExpenseItem, Frequency, Product } from './engine';
import { liveNumber, parseNumber } from './numbers';

export const MAX_ROWS = 50;
const MAX_AMOUNT = 1_000_000_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CUSTOM_HEAD = '__custom';
export const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];
const isFrequency = (v: unknown): v is Frequency => FREQUENCIES.some((f) => f.value === v);

type Errors = Record<string, string>;
const text = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max + 1) : '');
const blank = (...vals: unknown[]) => vals.every((v) => text(v, 10_000) === '');
const cleanId = (v: unknown) => (typeof v === 'string' && UUID.test(v) ? v : null);

/** Validate one money/quantity field. Blank → `fallback`. */
function amount(
  raw: unknown,
  key: string,
  errors: Errors,
  opts: { label: string; fallback?: number | null; mustBePositive?: boolean },
): number | null {
  const v = parseNumber(raw);
  if (v === null) return opts.fallback ?? null;
  if (Number.isNaN(v)) errors[key] = `${opts.label}: enter a number.`;
  else if (v < 0) errors[key] = `${opts.label} can't be negative.`;
  else if (opts.mustBePositive && v === 0) errors[key] = `${opts.label} must be more than 0.`;
  else if (v > MAX_AMOUNT) errors[key] = `${opts.label} looks too large.`;
  else return v;
  return null;
}

/* ------------------------------ Products ------------------------------ */
export type ProductDraft = {
  key: string; id: string | null; name: string; unit: string;
  qty: string; price: string; direct: string; other: string; capacity: string;
};
export type ProductSave = {
  id: string | null; name: string; unit: string | null; qty_per_month: number; selling_price: number;
  direct_cost_per_unit: number; other_cost_per_unit: number; max_capacity_per_month: number | null;
};
export type ProductRow = {
  id: string; name: string; unit: string | null; qty_per_month: number; selling_price: number;
  direct_cost_per_unit: number; other_cost_per_unit: number; max_capacity_per_month: number | null;
};

const s = (v: number | null | undefined) => (v == null ? '' : String(v));
export const blankProduct = (key: string): ProductDraft => ({ key, id: null, name: '', unit: '', qty: '', price: '', direct: '', other: '', capacity: '' });
export const productDraft = (r: ProductRow): ProductDraft => ({
  key: r.id, id: r.id, name: r.name, unit: r.unit ?? '', qty: s(r.qty_per_month), price: s(r.selling_price),
  direct: s(r.direct_cost_per_unit), other: s(r.other_cost_per_unit), capacity: s(r.max_capacity_per_month),
});

export function parseProducts(raw: unknown, requireOne: boolean): { rows: ProductSave[]; errors: Errors } {
  const list = Array.isArray(raw) ? raw.slice(0, MAX_ROWS) : [];
  const errors: Errors = {};
  const rows: ProductSave[] = [];
  list.forEach((d: Partial<ProductDraft>, i) => {
    if (blank(d.name, d.unit, d.qty, d.price, d.direct, d.other, d.capacity)) return; // empty card: ignore
    const k = (f: string) => `rows.${i}.${f}`;
    const name = text(d.name);
    if (!name) errors[k('name')] = 'Enter the product name.';
    else if (name.length > 120) errors[k('name')] = 'Keep the name under 120 characters.';
    const unit = text(d.unit, 30);
    if (unit.length > 30) errors[k('unit')] = 'Keep the unit short.';
    const row: ProductSave = {
      id: cleanId(d.id),
      name,
      unit: unit || null,
      qty_per_month: amount(d.qty, k('qty'), errors, { label: 'Quantity', fallback: 0 }) ?? 0,
      selling_price: amount(d.price, k('price'), errors, { label: 'Selling price', fallback: 0 }) ?? 0,
      direct_cost_per_unit: amount(d.direct, k('direct'), errors, { label: 'Direct cost', fallback: 0 }) ?? 0,
      other_cost_per_unit: amount(d.other, k('other'), errors, { label: 'Other cost', fallback: 0 }) ?? 0,
      max_capacity_per_month: amount(d.capacity, k('capacity'), errors, { label: 'Capacity', mustBePositive: true }),
    };
    rows.push(row);
  });
  if (requireOne && !rows.some((r) => r.qty_per_month > 0 && r.selling_price > 0) && !Object.keys(errors).length)
    errors.rows = 'Add at least one product with a quantity and a selling price.';
  return { rows, errors };
}

/** Live (lenient) and saved rows → engine products. */
export const draftsToEngineProducts = (ds: ProductDraft[]): Product[] =>
  ds.map((d) => ({
    id: d.key, name: d.name.trim(), unit: d.unit, qtyPerMonth: liveNumber(d.qty), sellingPrice: liveNumber(d.price),
    directCostPerUnit: liveNumber(d.direct), otherCostPerUnit: liveNumber(d.other),
    maxCapacityPerMonth: liveNumber(d.capacity) || null,
  }));
export const rowsToEngineProducts = (rs: ProductRow[]): Product[] =>
  rs.map((r) => ({
    id: r.id, name: r.name, unit: r.unit ?? undefined, qtyPerMonth: Number(r.qty_per_month), sellingPrice: Number(r.selling_price),
    directCostPerUnit: Number(r.direct_cost_per_unit), otherCostPerUnit: Number(r.other_cost_per_unit),
    maxCapacityPerMonth: r.max_capacity_per_month == null ? null : Number(r.max_capacity_per_month),
  }));

/* ------------------------------ Expenses ------------------------------ */
export type ExpenseHead = { id: string; name: string };
export type ExpenseDraft = { key: string; id: string | null; head: string; custom: string; amount: string; frequency: Frequency };
export type ExpenseSave = { id: string | null; head_id: string | null; custom_head: string | null; amount: number; frequency: Frequency };
export type ExpenseRow = { id: string; head_id: string | null; custom_head: string | null; amount: number; frequency: Frequency };

export const blankExpense = (key: string): ExpenseDraft => ({ key, id: null, head: '', custom: '', amount: '', frequency: 'monthly' });
export const expenseDraft = (r: ExpenseRow): ExpenseDraft => ({
  key: r.id, id: r.id, head: r.head_id ?? CUSTOM_HEAD, custom: r.custom_head ?? '', amount: s(r.amount), frequency: r.frequency,
});

/** `heads` = the heads this screen offers; a head id outside it is rejected (tampered or not allowed). */
export function parseExpenses(raw: unknown, heads: ExpenseHead[]): { rows: ExpenseSave[]; errors: Errors } {
  const list = Array.isArray(raw) ? raw.slice(0, MAX_ROWS) : [];
  const allowed = new Set(heads.map((h) => h.id));
  const errors: Errors = {};
  const rows: ExpenseSave[] = [];
  list.forEach((d: Partial<ExpenseDraft>, i) => {
    const head = text(d.head, 64);
    if (!head && blank(d.custom, d.amount)) return;
    const k = (f: string) => `rows.${i}.${f}`;
    let head_id: string | null = null;
    let custom_head: string | null = null;
    if (head === CUSTOM_HEAD) {
      custom_head = text(d.custom);
      if (!custom_head) errors[k('custom')] = 'Type the expense name.';
      else if (custom_head.length > 120) errors[k('custom')] = 'Keep the name under 120 characters.';
    } else if (allowed.has(head)) head_id = head;
    else errors[k('head')] = 'Choose an expense head.';
    const amt = amount(d.amount, k('amount'), errors, { label: 'Amount' });
    if (amt === null && !errors[k('amount')]) errors[k('amount')] = 'Enter the amount.';
    if (!isFrequency(d.frequency)) errors[k('frequency')] = 'Choose how often.';
    rows.push({ id: cleanId(d.id), head_id, custom_head, amount: amt ?? 0, frequency: isFrequency(d.frequency) ? d.frequency : 'monthly' });
  });
  return { rows, errors };
}

const headName = (heads: ExpenseHead[], id: string | null, custom: string | null) =>
  (id && heads.find((h) => h.id === id)?.name) || custom || 'Expense';
export const draftsToEngineExpenses = (ds: ExpenseDraft[], heads: ExpenseHead[]): ExpenseItem[] =>
  ds
    .filter((d) => d.head || d.amount.trim())
    .map((d) => ({
      id: d.key,
      head: d.head === CUSTOM_HEAD ? d.custom.trim() || 'Custom' : headName(heads, d.head, null),
      amount: liveNumber(d.amount),
      frequency: d.frequency,
    }));
export const rowsToEngineExpenses = (rs: ExpenseRow[], heads: ExpenseHead[]): ExpenseItem[] =>
  rs.map((r) => ({ id: r.id, head: headName(heads, r.head_id, r.custom_head), amount: Number(r.amount), frequency: r.frequency }));

/* ------------------------------ Assets ------------------------------ */
export type AssetDraft = { key: string; id: string | null; name: string; qty: string; cost: string };
export type AssetSave = { id: string | null; name: string; qty: number; unit_cost: number };
export type AssetRow = { id: string; name: string; qty: number; unit_cost: number };

export const blankAsset = (key: string): AssetDraft => ({ key, id: null, name: '', qty: '1', cost: '' });
export const assetDraft = (r: AssetRow): AssetDraft => ({ key: r.id, id: r.id, name: r.name, qty: s(r.qty), cost: s(r.unit_cost) });

export function parseAssets(raw: unknown): { rows: AssetSave[]; errors: Errors } {
  const list = Array.isArray(raw) ? raw.slice(0, MAX_ROWS) : [];
  const errors: Errors = {};
  const rows: AssetSave[] = [];
  list.forEach((d: Partial<AssetDraft>, i) => {
    if (blank(d.name, d.cost)) return;
    const k = (f: string) => `rows.${i}.${f}`;
    const name = text(d.name);
    if (!name) errors[k('name')] = 'Enter what the item is.';
    else if (name.length > 120) errors[k('name')] = 'Keep the name under 120 characters.';
    const cost = amount(d.cost, k('cost'), errors, { label: 'Cost' });
    if (cost === null && !errors[k('cost')]) errors[k('cost')] = 'Enter the cost.';
    const qty = amount(d.qty, k('cost'), errors, { label: 'Quantity', fallback: 1, mustBePositive: true });
    rows.push({ id: cleanId(d.id), name, qty: qty ?? 1, unit_cost: cost ?? 0 });
  });
  return { rows, errors };
}

export const draftsToEngineAssets = (ds: AssetDraft[]): AssetItem[] =>
  ds.filter((d) => d.name.trim() || d.cost.trim()).map((d) => ({ id: d.key, name: d.name.trim(), qty: liveNumber(d.qty) || 1, unitCost: liveNumber(d.cost) }));
export const rowsToEngineAssets = (rs: AssetRow[]): AssetItem[] =>
  rs.map((r) => ({ id: r.id, name: r.name, qty: Number(r.qty), unitCost: Number(r.unit_cost) }));

/** Parse the hidden `rows` JSON field. Bad JSON → empty list (the screen re-renders with what was stored). */
export function readRowsJson(v: FormDataEntryValue | null): unknown[] {
  if (typeof v !== 'string' || v.length > 200_000) return [];
  try {
    const x = JSON.parse(v);
    return Array.isArray(x) ? x : [];
  } catch {
    return [];
  }
}
