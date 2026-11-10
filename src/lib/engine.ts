/**
 * DSK Financial Engine — deterministic, pure, no I/O, no AI.
 * Every rupee figure in a Business Plan/DPR must come from here.
 *
 * Ported from the prototype with three deliberate fixes:
 *  1. Weekly = 52/12 (not 4.33).
 *  2. Loan repayment is split into INTEREST (a P&L cost) and PRINCIPAL (cash outflow, not a cost).
 *     The prototype deducted the full EMI from profit, which understated net profit.
 *  3. Moratorium is modelled as interest-only months inside the tenure.
 */

export type Frequency = 'monthly' | 'weekly' | 'quarterly' | 'yearly';

export interface Product {
  id: string;
  name: string;
  unit?: string;
  qtyPerMonth: number;
  sellingPrice: number;
  directCostPerUnit: number;
  otherCostPerUnit: number;
  maxCapacityPerMonth?: number | null;
}

export interface ExpenseItem {
  id: string;
  head: string;
  amount: number;
  frequency: Frequency;
}

export interface LoanInput {
  totalProjectCost: number;
  ownContribution: number;
  requestedAmount?: number | null;
  tenureMonths: number;
  annualRatePct: number;
  moratoriumMonths: number;
  existingMonthlyEmi: number;
}

export interface Assumptions {
  y1: number; // % revenue growth
  y2: number;
  y3: number;
}

export interface Flag {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
}

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const round2 = (v: number) => Math.round(v * 100) / 100;

/* ---------- Expenses ---------- */
export function toMonthly(amount: number, freq: Frequency): number {
  const a = n(amount);
  switch (freq) {
    case 'weekly': return (a * 52) / 12;
    case 'quarterly': return a / 3;
    case 'yearly': return a / 12;
    default: return a;
  }
}

export function summarizeExpenses(items: ExpenseItem[]) {
  const rows = items.map((e) => {
    const monthly = toMonthly(e.amount, e.frequency);
    return { ...e, monthly: round2(monthly), annual: round2(monthly * 12) };
  });
  const monthly = rows.reduce((s, r) => s + r.monthly, 0);
  return { rows, monthly: round2(monthly), annual: round2(monthly * 12) };
}

/* ---------- Product costing (single source of truth for revenue) ---------- */
export function costProduct(p: Product) {
  const qty = n(p.qtyPerMonth);
  const price = n(p.sellingPrice);
  const costPerUnit = n(p.directCostPerUnit) + n(p.otherCostPerUnit);
  const revenue = qty * price;
  const cost = qty * costPerUnit;
  const grossProfit = revenue - cost;
  return {
    ...p,
    totalCostPerUnit: round2(costPerUnit),
    revenue: round2(revenue),
    cost: round2(cost),
    grossProfit: round2(grossProfit),
    grossMarginPct: revenue > 0 ? round2((grossProfit / revenue) * 100) : 0,
  };
}

export function summarizeProducts(products: Product[]) {
  const rows = products.map(costProduct);
  const totalQty = rows.reduce((s, r) => s + n(r.qtyPerMonth), 0);
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const directCost = rows.reduce((s, r) => s + r.cost, 0);
  const grossProfit = revenue - directCost;
  return {
    rows,
    totalQty,
    revenue: round2(revenue),
    directCost: round2(directCost),
    grossProfit: round2(grossProfit),
    // weighted by revenue, which is what total GP / total revenue gives
    grossMarginPct: revenue > 0 ? round2((grossProfit / revenue) * 100) : 0,
  };
}

/* ---------- Loan ---------- */
export function loanRequired(totalProjectCost: number, ownContribution: number): number {
  return Math.max(n(totalProjectCost) - n(ownContribution), 0);
}

export interface AmortRow {
  month: number;
  year: number;
  opening: number;
  interest: number;
  principal: number;
  payment: number;
  closing: number;
}

/**
 * tenureMonths INCLUDES the moratorium. During moratorium: interest-only.
 * After: level EMI over (tenure - moratorium) months.
 */
export function amortize(principal: number, annualRatePct: number, tenureMonths: number, moratoriumMonths: number) {
  const P = n(principal);
  const T = Math.max(Math.floor(n(tenureMonths)), 0);
  const M = Math.min(Math.max(Math.floor(n(moratoriumMonths)), 0), T);
  const r = n(annualRatePct) / 12 / 100;
  const repayMonths = T - M;
  let emi = 0;
  if (P > 0 && repayMonths > 0) {
    emi = r > 0 ? (P * r * Math.pow(1 + r, repayMonths)) / (Math.pow(1 + r, repayMonths) - 1) : P / repayMonths;
  }
  const rows: AmortRow[] = [];
  let bal = P;
  for (let m = 1; m <= T; m++) {
    const interest = bal * r;
    let principalPaid = 0;
    let payment = interest;
    if (m > M) {
      principalPaid = Math.min(emi - interest, bal);
      payment = emi;
    }
    const closing = bal - principalPaid;
    rows.push({
      month: m, year: Math.ceil(m / 12), opening: round2(bal),
      interest: round2(interest), principal: round2(principalPaid), payment: round2(payment), closing: round2(closing),
    });
    bal = closing;
  }
  return { emi: round2(emi), rows };
}

export function yearlyDebtService(rows: AmortRow[], year: number) {
  const ys = rows.filter((r) => r.year === year);
  return {
    interest: round2(ys.reduce((s, r) => s + r.interest, 0)),
    principal: round2(ys.reduce((s, r) => s + r.principal, 0)),
    total: round2(ys.reduce((s, r) => s + r.payment, 0)),
  };
}

/* ---------- Growth assumptions (transparent, rule-based) ---------- */
export const GOAL_KEYS = [
  'increase_production', 'add_new_products', 'buy_new_equipment', 'expand_to_new_markets',
  'hire_more_people', 'open_another_outlet', 'sell_online',
] as const;
export type Goal = (typeof GOAL_KEYS)[number];

export function suggestGrowth(opts: { isExisting: boolean; goals: Goal[]; seasonal?: boolean }) {
  const has = (g: Goal) => opts.goals.includes(g);
  const reasons: string[] = [];
  const base = opts.isExisting ? 8 : 15;
  reasons.push(
    opts.isExisting
      ? 'Existing business: base growth of 8% a year.'
      : 'New business: 15% in Year 1 because it ramps up from a low base.',
  );
  let y1 = base, y2 = Math.max(base - 3, 3), y3 = Math.max(base - 5, 2);
  if (has('buy_new_equipment')) { y1 += 5; reasons.push('+5% in Year 1: new equipment planned.'); }
  if (has('increase_production')) { y1 += 2; reasons.push('+2% in Year 1: she wants to increase production.'); }
  if (has('add_new_products')) { y1 += 4; y2 += 2; reasons.push('+4% in Year 1 and +2% in Year 2: new products planned.'); }
  if (has('expand_to_new_markets')) { y2 += 4; y3 += 2; reasons.push('+4% in Year 2 and +2% in Year 3: new markets planned.'); }
  if (has('sell_online')) { y2 += 3; reasons.push('+3% in Year 2: online selling planned.'); }
  if (has('open_another_outlet')) { y2 += 4; y3 += 3; reasons.push('+4% in Year 2 and +3% in Year 3: another outlet planned.'); }
  if (has('hire_more_people')) { y3 += 2; reasons.push('+2% in Year 3: more staff means more capacity.'); }
  if (opts.seasonal) reasons.push('Demand is seasonal: growth is applied to the annual total, not month by month.');
  const clamp = (v: number) => Math.max(2, Math.min(v, 35));
  return { y1: clamp(y1), y2: clamp(y2), y3: clamp(y3), reasons };
}

/* ---------- 3-year projection ---------- */
export interface ProjectionRow {
  year: 1 | 2 | 3;
  growthPct: number;
  revenue: number;
  directCost: number;
  grossProfit: number;
  opex: number;
  ebitda: number;
  interest: number;
  netProfit: number;       // after interest only
  principalRepaid: number; // cash outflow, NOT an expense
  debtService: number;     // interest + principal + existing EMI
  cashAfterDebt: number;   // netProfit + (nothing added back; no depreciation modelled) - principal - existing EMI
  grossMarginPct: number;
  netMarginPct: number;
  expenseRatioPct: number;
  revenueGrowthPct: number;
  profitGrowthPct: number | null;
  dscr: number | null;
}

export function project3Years(args: {
  baselineMonthlyRevenue: number;
  grossMarginPct: number;
  baselineMonthlyOpex: number;
  assumptions: Assumptions;
  amortRows: AmortRow[];
  existingMonthlyEmi: number;
  opexGrowthCapPct?: number;
}): ProjectionRow[] {
  const cap = args.opexGrowthCapPct ?? 5;
  let prevRev = args.baselineMonthlyRevenue * 12;
  let prevOpex = args.baselineMonthlyOpex * 12;
  let prevNet: number | null = null;
  const out: ProjectionRow[] = [];
  ([1, 2, 3] as const).forEach((yr) => {
    const g = n(args.assumptions[`y${yr}` as 'y1']);
    const revenue = prevRev * (1 + g / 100);
    const directCost = revenue * (1 - args.grossMarginPct / 100);
    const grossProfit = revenue - directCost;
    const opex = prevOpex * (1 + Math.min(g, cap) / 100);
    const ebitda = grossProfit - opex;
    const ds = yearlyDebtService(args.amortRows, yr);
    const existing = n(args.existingMonthlyEmi) * 12;
    // Existing loan EMI is treated as a cash obligation; its interest split is unknown, so it is NOT deducted from profit.
    const netProfit = ebitda - ds.interest;
    const debtService = ds.total + existing;
    const cashAfterDebt = ebitda - debtService;
    out.push({
      year: yr, growthPct: g,
      revenue: round2(revenue), directCost: round2(directCost), grossProfit: round2(grossProfit),
      opex: round2(opex), ebitda: round2(ebitda), interest: ds.interest, netProfit: round2(netProfit),
      principalRepaid: ds.principal, debtService: round2(debtService), cashAfterDebt: round2(cashAfterDebt),
      grossMarginPct: round2(args.grossMarginPct),
      netMarginPct: revenue > 0 ? round2((netProfit / revenue) * 100) : 0,
      expenseRatioPct: revenue > 0 ? round2((opex / revenue) * 100) : 0,
      revenueGrowthPct: round2(g),
      profitGrowthPct: prevNet !== null && prevNet !== 0 ? round2(((netProfit - prevNet) / Math.abs(prevNet)) * 100) : null,
      dscr: debtService > 0 ? round2(ebitda / debtService) : null,
    });
    prevRev = revenue; prevOpex = opex; prevNet = netProfit;
  });
  return out;
}

/* ---------- Break-even (blended) ---------- */
export function breakEvenRevenueMonthly(monthlyFixedCosts: number, grossMarginPct: number): number | null {
  const gm = n(grossMarginPct) / 100;
  return gm > 0 ? round2(n(monthlyFixedCosts) / gm) : null;
}

/* ---------- Validation ---------- */
export function validate(args: {
  products: Product[];
  expenses: ExpenseItem[];
  loan: LoanInput;
  assumptions: Assumptions;
  projection: ProjectionRow[];
  statedMonthlyTurnover?: number | null;
  loanRequiredCalc: number;
  fixedAssetCount?: number;
}): Flag[] {
  const f: Flag[] = [];
  const costed = args.products.map(costProduct);

  if (costed.length === 0 || costed.every((p) => p.revenue === 0)) {
    f.push({ severity: 'error', code: 'NO_REVENUE', message: 'No products with quantity and price. Revenue cannot be calculated.' });
  }
  costed.forEach((p) => {
    const label = p.name || 'A product';
    if (p.sellingPrice > 0 && p.directCostPerUnit === 0 && p.otherCostPerUnit === 0)
      f.push({ severity: 'warning', code: 'ZERO_COST', message: `"${label}" has no cost entered. Margin will look like 100%.` });
    else if (p.revenue > 0 && p.grossMarginPct > 80)
      f.push({ severity: 'warning', code: 'HIGH_MARGIN', message: `"${label}" shows a very high margin (${p.grossMarginPct.toFixed(0)}%). Check the cost figures.` });
    if (p.revenue > 0 && p.grossMarginPct < 5)
      f.push({ severity: 'warning', code: 'THIN_MARGIN', message: `"${label}" shows a very thin margin (${p.grossMarginPct.toFixed(0)}%). Check that all direct costs are captured.` });
    if (p.sellingPrice > 0 && p.totalCostPerUnit > p.sellingPrice)
      f.push({ severity: 'error', code: 'LOSS_MAKING', message: `"${label}" costs more to make than it sells for.` });
    if (p.maxCapacityPerMonth && p.maxCapacityPerMonth > 0) {
      [1, 2, 3].forEach((yr, i) => {
        const factor = [1, 2, 3].slice(0, yr).reduce((acc, k) => acc * (1 + n(args.assumptions[`y${k}` as 'y1']) / 100), 1);
        const q = p.qtyPerMonth * factor;
        if (i === 2 && q > p.maxCapacityPerMonth!)
          f.push({ severity: 'warning', code: 'CAPACITY_EXCEEDED', message: `Projected Year 3 sales of "${label}" (about ${Math.round(q)}/month) exceed stated capacity (${p.maxCapacityPerMonth}/month). Review capacity or growth assumptions.` });
      });
    }
  });
  (['y1', 'y2', 'y3'] as const).forEach((k, i) => {
    if (n(args.assumptions[k]) > 40)
      f.push({ severity: 'warning', code: 'HIGH_GROWTH', message: `Year ${i + 1} growth of ${args.assumptions[k]}% is unusually high. Confirm it is realistic.` });
  });
  if (args.expenses.length === 0)
    f.push({ severity: 'warning', code: 'NO_EXPENSES', message: 'No operating expenses captured. Profit is likely overstated.' });
  if (args.loan.requestedAmount && args.loanRequiredCalc > 0) {
    const diff = Math.abs(args.loan.requestedAmount - args.loanRequiredCalc) / args.loanRequiredCalc;
    if (diff > 0.1)
      f.push({ severity: 'warning', code: 'LOAN_MISMATCH', message: `Requested loan (${Math.round(args.loan.requestedAmount)}) differs from the calculated requirement (${Math.round(args.loanRequiredCalc)}) by more than 10%.` });
  }
  if (args.loan.totalProjectCost > 0 && !args.fixedAssetCount)
    f.push({ severity: 'info', code: 'NO_ASSET_LIST', message: 'Project cost has no itemised equipment list. Banks usually ask for quotations.' });
  const y1 = args.projection[0];
  if (y1) {
    if (y1.dscr !== null && y1.dscr < 1.25)
      f.push({ severity: y1.dscr < 1 ? 'error' : 'warning', code: 'LOW_DSCR', message: `Year 1 repayment coverage is ${y1.dscr.toFixed(2)}x. Most lenders look for 1.25x or more. Consider a longer tenure, a smaller loan or more own contribution.` });
  }
  args.projection.forEach((r) => {
    if (r.cashAfterDebt < 0)
      f.push({ severity: 'error', code: 'NEGATIVE_CASH', message: `Year ${r.year}: cash after loan repayments is negative.` });
    if (r.netProfit < 0)
      f.push({ severity: 'warning', code: 'NEGATIVE_PROFIT', message: `Year ${r.year}: projected net profit is negative.` });
  });
  if (args.statedMonthlyTurnover && args.statedMonthlyTurnover > 0) {
    const calc = costed.reduce((s, p) => s + p.revenue, 0);
    const diff = Math.abs(calc - args.statedMonthlyTurnover) / args.statedMonthlyTurnover;
    if (diff > 0.15)
      f.push({ severity: 'warning', code: 'TURNOVER_MISMATCH', message: `Her stated monthly turnover differs from the product-level total by ${(diff * 100).toFixed(0)}%. Double-check with her.` });
  }
  return f;
}

/* ---------- One call that builds the whole snapshot ---------- */
export function buildSnapshot(input: {
  products: Product[];
  expenses: ExpenseItem[];
  loan: LoanInput;
  assumptions: Assumptions;
  statedMonthlyTurnover?: number | null;
  fixedAssetCount?: number;
}) {
  const products = summarizeProducts(input.products);
  const expenses = summarizeExpenses(input.expenses);
  const required = loanRequired(input.loan.totalProjectCost, input.loan.ownContribution);
  const amort = amortize(required, input.loan.annualRatePct, input.loan.tenureMonths, input.loan.moratoriumMonths);
  const projection = project3Years({
    baselineMonthlyRevenue: products.revenue,
    grossMarginPct: products.grossMarginPct,
    baselineMonthlyOpex: expenses.monthly,
    assumptions: input.assumptions,
    amortRows: amort.rows,
    existingMonthlyEmi: input.loan.existingMonthlyEmi,
  });
  const monthlyOperatingProfit = round2(products.grossProfit - expenses.monthly);
  const flags = validate({
    products: input.products, expenses: input.expenses, loan: input.loan, assumptions: input.assumptions,
    projection, statedMonthlyTurnover: input.statedMonthlyTurnover, loanRequiredCalc: required,
    fixedAssetCount: input.fixedAssetCount,
  });
  return {
    products, expenses,
    monthlyOperatingProfit,
    breakEvenRevenueMonthly: breakEvenRevenueMonthly(expenses.monthly, products.grossMarginPct),
    loan: {
      totalProjectCost: input.loan.totalProjectCost,
      ownContribution: input.loan.ownContribution,
      ownContributionPct: input.loan.totalProjectCost > 0 ? round2((input.loan.ownContribution / input.loan.totalProjectCost) * 100) : 0,
      required, emi: amort.emi, tenureMonths: input.loan.tenureMonths,
      annualRatePct: input.loan.annualRatePct, moratoriumMonths: input.loan.moratoriumMonths,
    },
    amortization: amort.rows,
    projection,
    flags,
  };
}

/* ---------- Phase 5 additions (live screens). Additive only: nothing above changed. ---------- */
export interface AssetItem {
  id: string;
  name: string;
  qty: number;
  unitCost: number;
}

/** Itemised project cost: equipment/stock to be bought + one-time setup costs. */
export function summarizeAssets(items: AssetItem[], otherSetupCost: number) {
  const rows = items.map((a) => ({ ...a, total: round2(n(a.qty) * n(a.unitCost)) }));
  const assetsTotal = round2(rows.reduce((s, r) => s + r.total, 0));
  const other = round2(Math.max(n(otherSetupCost), 0));
  return { rows, assetsTotal, otherSetupCost: other, totalProjectCost: round2(assetsTotal + other) };
}

/** 0% growth: what the screens before the growth step show, so nothing is assumed that hasn't been approved. */
export const NO_GROWTH: Assumptions = { y1: 0, y2: 0, y3: 0 };

/**
 * The live preview used while data is still being entered (products → loan screens): the full snapshot at
 * today's level (no growth), plus the two figures those screens show that the snapshot doesn't name directly.
 */
export function previewAtBaseline(input: Omit<Parameters<typeof buildSnapshot>[0], 'assumptions'>) {
  const s = buildSnapshot({ ...input, assumptions: NO_GROWTH });
  return {
    ...s,
    /** New EMI + existing EMI, per month, once the moratorium is over. */
    monthlyRepayment: round2(s.loan.emi + n(input.loan.existingMonthlyEmi)),
    /** Year-1 debt-service coverage at today's level (moratorium months are interest-only). */
    dscrYear1: s.projection[0]?.dscr ?? null,
  };
}
