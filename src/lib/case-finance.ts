import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { summarizeAssets, type LoanInput } from '@/lib/engine';
import {
  rowsToEngineAssets, rowsToEngineExpenses, rowsToEngineProducts,
  type AssetRow, type ExpenseHead, type ExpenseRow, type ProductRow,
} from '@/lib/finance-rows';

export type LoanRow = {
  other_setup_cost: number; own_contribution: number; requested_amount: number | null; tenure_months: number;
  interest_rate_pct: number; moratorium_months: number; existing_monthly_emi: number;
};
/** Same defaults as the loan_requests table, for a case whose row doesn't exist yet. */
export const LOAN_DEFAULTS: LoanRow = {
  other_setup_cost: 0, own_contribution: 0, requested_amount: null, tenure_months: 36,
  interest_rate_pct: 11.5, moratorium_months: 2, existing_monthly_emi: 0,
};

/**
 * Everything the money screens need for one case, read once, RLS-scoped. Each list is stored in exactly one
 * table; every total shown anywhere is recomputed from these rows by the engine.
 */
export async function loadCaseFinance(businessId: string) {
  const supabase = await createClient();
  const { data: biz } = await supabase
    .from('businesses')
    .select('id, sector_id, stage, stated_monthly_turnover, sectors(name, icon, tint, default_unit), entrepreneurs(full_name)')
    .eq('id', businessId)
    .maybeSingle();
  if (!biz) return null;

  const [products, expenses, assets, loan, heads] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, unit, qty_per_month, selling_price, direct_cost_per_unit, other_cost_per_unit, max_capacity_per_month')
      .eq('business_id', businessId)
      .order('sort_order'),
    supabase.from('expenses').select('id, head_id, custom_head, amount, frequency').eq('business_id', businessId).order('id'),
    supabase.from('assets').select('id, name, qty, unit_cost').eq('business_id', businessId).eq('is_proposed', true).order('id'),
    supabase
      .from('loan_requests')
      .select('other_setup_cost, own_contribution, requested_amount, tenure_months, interest_rate_pct, moratorium_months, existing_monthly_emi')
      .eq('business_id', businessId)
      .maybeSingle(),
    // Operating heads only: raw materials are costed per product, and the existing EMI is asked once (business step).
    supabase
      .from('expense_heads')
      .select('id, name, sector_id, sort_order')
      .eq('class', 'operating')
      .or(`sector_id.is.null,sector_id.eq.${biz.sector_id}`),
  ]);

  const headList: ExpenseHead[] = (heads.data ?? [])
    .sort((a, b) => Number(a.sector_id === null) - Number(b.sector_id === null) || a.sort_order - b.sort_order)
    .map((h) => ({ id: h.id, name: h.name }));
  const productRows = (products.data ?? []) as ProductRow[];
  const expenseRows = (expenses.data ?? []) as ExpenseRow[];
  const assetRows = (assets.data ?? []) as AssetRow[];
  const loanRow: LoanRow = loan.data ?? LOAN_DEFAULTS;

  const projectCost = summarizeAssets(rowsToEngineAssets(assetRows), Number(loanRow.other_setup_cost));
  const loanInput: LoanInput = {
    totalProjectCost: projectCost.totalProjectCost,
    ownContribution: Number(loanRow.own_contribution),
    requestedAmount: loanRow.requested_amount == null ? null : Number(loanRow.requested_amount),
    tenureMonths: Number(loanRow.tenure_months),
    annualRatePct: Number(loanRow.interest_rate_pct),
    moratoriumMonths: Number(loanRow.moratorium_months),
    existingMonthlyEmi: Number(loanRow.existing_monthly_emi),
  };

  return {
    biz,
    heads: headList,
    rows: { products: productRows, expenses: expenseRows, assets: assetRows, loan: loanRow },
    engine: {
      products: rowsToEngineProducts(productRows),
      expenses: rowsToEngineExpenses(expenseRows, headList),
      assets: rowsToEngineAssets(assetRows),
      loan: loanInput,
      statedMonthlyTurnover: biz.stated_monthly_turnover == null ? null : Number(biz.stated_monthly_turnover),
    },
  };
}
export type CaseFinance = NonNullable<Awaited<ReturnType<typeof loadCaseFinance>>>;
