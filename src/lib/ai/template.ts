/**
 * "Standard wording": a complete narrative written by fixed rules from the plan context — no AI, no cost, no data
 * leaves the system. Used when AI is switched off, and as the fallback if the AI call fails. It quotes numbers
 * exactly as the engine produced them (rounded rupees / given percentages) and never derives new ones.
 */
import type { Narrative } from './prompts';
import type { PlanContext } from './context';

const rs = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;
const pct = (v: number) => `${Math.round(v)}%`;
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const clean = (s: string | null | undefined) => (s ?? '').trim().replace(/\s+/g, ' ').replace(/[.]+$/, '');

export function templateNarrative(c: PlanContext): Narrative {
  const who = clean(c.entrepreneur.name) || 'The entrepreneur';
  const place = [c.location.village, c.location.district, c.location.state].filter(Boolean).join(', ') || 'her area';
  const sector = c.business.sector.toLowerCase();
  const isNew = c.business.stage === 'new';
  const bizName = clean(c.business.name);
  const products = c.products.filter((p) => p.revenuePerMonth > 0);
  const productNames = products.map((p) => p.name);
  const y1 = c.projection[0];
  const y3 = c.projection[2];
  const m = c.marketing;
  const fp = c.futurePlan;
  const items = c.projectCost.items.map((a) => a.name);
  const current = m?.currentChannels ?? [];
  const proposed = m?.proposedChannels ?? [];
  const newChannels = proposed.filter((x) => !current.includes(x));
  const answers = Object.entries(c.business.sectorAnswers).map(
    ([q, a]) => `${q.replace(/\?$/, '')}: ${Array.isArray(a) ? a.join(', ') : a}`,
  );
  const dscr = y1?.dscr;

  const executiveSummary = [
    `${who} ${isNew ? 'plans to start' : 'runs'} a ${sector} business${bizName ? ` called ${bizName}` : ''} in ${place}.`,
    products.length
      ? `Based on her product costing, monthly revenue is ${rs(c.productTotals.revenuePerMonth)} with a monthly operating profit of ${rs(c.monthlyOperatingProfit)}.`
      : 'Product revenue has not yet been established.',
    `The total project cost is ${rs(c.loan.totalProjectCost)}, of which she contributes ${rs(c.loan.ownContribution)}; the loan required is ${rs(c.loan.required)}, repayable over ${c.loan.tenureMonths} months.`,
    dscr != null ? `The indicative Year 1 debt service coverage ratio is ${dscr.toFixed(2)}.` : '',
  ].filter(Boolean).join(' ');

  const businessOverview = [
    `${isNew ? 'This is a new business.' : 'This is an existing business.'} Sector: ${c.business.sector}.`,
    productNames.length ? `Products and services: ${list(productNames)}.` : '',
    answers.length ? `Details given: ${answers.join('; ')}.` : '',
  ].filter(Boolean).join(' ');

  const marketAnalysis = [
    `The business serves customers in and around ${place}.`,
    m?.targetCustomers ? `Target customers: ${clean(m.targetCustomers)}.` : '',
    current.length ? `She currently sells through ${list(current.map((x) => x.toLowerCase()))}.` : '',
    'No independent market survey was carried out; this section reflects what she reported.',
  ].filter(Boolean).join(' ');

  const marketingPlan = [
    current.length ? `Current channels: ${list(current)}.` : 'Current sales channels were not recorded.',
    newChannels.length ? `She plans to add ${list(newChannels)}.` : '',
    m?.pricingStrategy ? `Pricing approach: ${m.pricingStrategy.toLowerCase()}.` : '',
    m?.competitiveAdvantage ? `Her advantage over nearby competitors: ${clean(m.competitiveAdvantage)}.` : '',
  ].filter(Boolean).join(' ');

  const capacity = products.filter((p) => p.maxCapacityPerMonth);
  const operationsPlan = [
    products.length
      ? `Planned monthly output: ${products.map((p) => `${p.name} ${p.qtyPerMonth}${p.unit ? ` ${p.unit}` : ''}`).join('; ')}.`
      : '',
    capacity.length ? `Stated capacity: ${capacity.map((p) => `${p.name} up to ${p.maxCapacityPerMonth} a month`).join('; ')}.` : '',
    `Monthly running costs are ${rs(c.expenseTotals.monthly)}${c.expenseTotals.heads.length ? `, mainly ${list(c.expenseTotals.heads.slice(0, 3).map((e) => e.head.toLowerCase()))}` : ''}.`,
  ].filter(Boolean).join(' ') || 'Operations follow the product and expense details recorded for this case.';

  const procurementPlan = [
    items.length ? `The loan will be used to buy ${list(items)}.` : '',
    c.projectCost.otherSetupCost > 0 ? `One-time setup costs of ${rs(c.projectCost.otherSetupCost)} are included.` : '',
    'Raw materials are bought as needed and are already counted in the direct cost of each product.',
    items.length ? 'Quotations for the listed items should be attached for the lender.' : '',
  ].filter(Boolean).join(' ');

  const hires = fp?.goals.includes('Hire more people');
  const employmentGeneration = `The business provides self-employment for ${who}.${hires ? ' She plans to hire more people as the business grows.' : ''}`;

  const strengths: string[] = [];
  if (!isNew) strengths.push('An established business — because she already runs it and reported current sales.');
  if (c.productTotals.grossMarginPct >= 20) strengths.push(`Healthy gross margin of ${pct(c.productTotals.grossMarginPct)} — because of her product costing.`);
  if (dscr != null && dscr >= 1.25) strengths.push(`Repayment capacity of ${dscr.toFixed(2)} in Year 1 — because operating profit covers the loan repayments.`);
  if (m?.competitiveAdvantage) strengths.push(`${clean(m.competitiveAdvantage)} — because she named it as her advantage.`);
  if (!strengths.length) strengths.push(`Her own contribution of ${rs(c.loan.ownContribution)} — because it shows commitment to the business.`);

  const weaknesses: string[] = [];
  if (isNew) weaknesses.push('No trading history yet — because this is a new business.');
  if (products.length === 1) weaknesses.push('Depends on a single product — because only one product is planned.');
  if (!current.length) weaknesses.push('Sales channels are not yet established — because none were recorded.');
  if (!weaknesses.length) weaknesses.push('Small scale of operation — because it is a micro-enterprise.');

  const opportunities: string[] = [];
  if (newChannels.length) opportunities.push(`New sales channels: ${list(newChannels)} — because she plans to sell there.`);
  (fp?.goals ?? []).slice(0, 3).forEach((g) => opportunities.push(`${g} — because it is part of her future plan.`));
  if (!opportunities.length) opportunities.push('Growth in local demand — because of the approved growth assumptions.');

  const threats: string[] = ['Competition from other local sellers — because the business sells in a local market.'];
  if (c.validationFlags.length) threats.push(`Points flagged for review: ${c.validationFlags[0]} — because the system checks found it.`);
  threats.push('Changes in raw material prices — because they affect the direct cost of each product.');

  const futureGrowthPlan = {
    shortTerm: clean(fp?.loanGoal) ? `${clean(fp?.loanGoal)}.` : `Use the loan of ${rs(c.loan.required)} as planned and stabilise sales.`,
    year1: y1 ? `Revenue is planned to grow by ${pct(y1.growthPct)} (approved) to ${rs(y1.revenue)} for the year.` : '',
    year2: c.projection[1] ? `Revenue is planned to grow by ${pct(c.projection[1].growthPct)} (approved) to ${rs(c.projection[1].revenue)}.` : '',
    year3: y3 ? `Revenue is planned to grow by ${pct(y3.growthPct)} (approved) to ${rs(y3.revenue)}.${clean(fp?.threeYearVision) ? ` Her aim: ${clean(fp?.threeYearVision)}.` : ''}` : '',
    expansionRequirements: fp?.goals.length ? `Her plans: ${list(fp.goals.map((g) => g.toLowerCase()))}. These will need further investment beyond this loan.` : 'No expansion beyond this project is planned yet.',
  };

  const risksAndMitigation = [
    ...c.validationFlags.slice(0, 4).map((f) => ({ risk: f, mitigation: 'Reviewed with her by the DSK operator before submission.' })),
    { risk: 'Sales fall below plan.', mitigation: 'Keep monthly sales records and review prices and channels with the DSK operator.' },
    { risk: 'Loan repayments are missed.', mitigation: `Repay from operating profit${c.loan.moratoriumMonths ? `; the first ${c.loan.moratoriumMonths} months are interest-only` : ''}, and keep a small cash reserve.` },
  ].slice(0, 8);

  const implementationTimeline = [
    { period: 'Month 1', activity: `Loan sanction${items.length ? ` and purchase of ${list(items)}` : ''}.` },
    { period: 'Month 1', activity: 'Set up and start or expand production and sales.' },
    ...(c.loan.moratoriumMonths
      ? [{ period: 'After the moratorium', activity: `EMI repayments of ${rs(c.loan.emi)} a month begin.` }]
      : [{ period: 'From Month 1', activity: `EMI repayments of ${rs(c.loan.emi)} a month.` }]),
    { period: 'Every month', activity: 'Record sales and expenses; review progress with the DSK operator.' },
  ];

  const conclusion = `${who} requests a loan of ${rs(c.loan.required)} for her ${sector} business in ${place}, with her own contribution of ${rs(c.loan.ownContribution)} towards a total project cost of ${rs(c.loan.totalProjectCost)}. All figures in this plan are calculated from the information she provided and the growth assumptions approved by the DSK operator.`;

  return {
    executiveSummary,
    businessOverview,
    marketAnalysis,
    marketingPlan,
    operationsPlan,
    procurementPlan,
    employmentGeneration,
    swot: { strengths: strengths.slice(0, 5), weaknesses: weaknesses.slice(0, 5), opportunities: opportunities.slice(0, 5), threats: threats.slice(0, 5) },
    futureGrowthPlan,
    risksAndMitigation,
    implementationTimeline,
    conclusion,
  };
}
