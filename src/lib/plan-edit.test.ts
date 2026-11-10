import { describe, expect, it } from 'vitest';
import type { Narrative } from './ai/prompts';
import { formToNarrative, narrativeToForm } from './plan-edit';

const n: Narrative = {
  executiveSummary: 'Lakshmi runs a tailoring business in Kothapalli.',
  businessOverview: 'This is an existing business with two products.',
  marketAnalysis: 'Customers are women in nearby villages.',
  marketingPlan: 'She sells in the local market and plans WhatsApp.',
  operationsPlan: 'She stitches blouses on an electric machine.',
  procurementPlan: 'The loan buys an industrial sewing machine.',
  employmentGeneration: 'Self-employment for her.',
  swot: { strengths: ['Fast delivery — because she said so.'], weaknesses: ['Single product.'], opportunities: ['WhatsApp.'], threats: ['Competition.'] },
  futureGrowthPlan: { shortTerm: 'Buy the machine.', year1: 'Grow 13%.', year2: 'Grow 5%.', year3: 'Grow 3%.', expansionRequirements: 'None yet.' },
  risksAndMitigation: [{ risk: 'Low sales', mitigation: 'Track sales monthly' }, { risk: 'Missed EMI', mitigation: 'Keep a reserve' }],
  implementationTimeline: [{ period: 'Month 1', activity: 'Buy machine' }, { period: 'Every month', activity: 'Review' }],
  conclusion: 'She requests a loan of ₹60,000 for her business.',
};

describe('plan editing', () => {
  it('round-trips a narrative through the text boxes unchanged', () => {
    const f = narrativeToForm(n);
    expect(formToNarrative((k) => f[k]).narrative).toEqual(n);
  });

  it('reads one list item per line and "a | b" rows, ignoring blank lines', () => {
    const f: Record<string, string> = { ...narrativeToForm(n), 'swot.threats': 'Rain\n\n  Price rise  ', risks: 'Low sales | Track sales\nTheft|Lock the shop' };
    const out = formToNarrative((k) => f[k]).narrative!;
    expect(out.swot.threats).toEqual(['Rain', 'Price rise']);
    expect(out.risksAndMitigation).toEqual([
      { risk: 'Low sales', mitigation: 'Track sales' },
      { risk: 'Theft', mitigation: 'Lock the shop' },
    ]);
  });

  it('explains what is wrong instead of saving an incomplete plan', () => {
    const f: Record<string, string> = { ...narrativeToForm(n), 'swot.strengths': '', executiveSummary: 'Too short' };
    const r = formToNarrative((k) => f[k]);
    expect(r.narrative).toBeNull();
    expect(r.error).toBe('Please check “Executive summary”: it is empty or too short.');
  });
});
