import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { buildPlanContext } from '../ai/context';
import { templateNarrative } from '../ai/template';
import { buildSnapshot } from '../engine';

vi.mock('server-only', () => ({}));

function sample(status: string) {
  const engine = buildSnapshot({
    products: [
      { id: 'a', name: 'Blouse stitching', unit: 'piece', qtyPerMonth: 120, sellingPrice: 350, directCostPerUnit: 140, otherCostPerUnit: 25, maxCapacityPerMonth: 200 },
      { id: 'b', name: 'పట్టు చీర అంచు', qtyPerMonth: 60, sellingPrice: 80, directCostPerUnit: 30, otherCostPerUnit: 0 },
    ],
    expenses: [
      { id: 'r', head: 'Rent', amount: 2500, frequency: 'monthly' },
      { id: 'e', head: 'Electricity', amount: 1800, frequency: 'quarterly' },
    ],
    loan: { totalProjectCost: 68500, ownContribution: 8500, tenureMonths: 36, annualRatePct: 11.5, moratoriumMonths: 2, existingMonthlyEmi: 0 },
    assumptions: { y1: 13, y2: 5, y3: 3 },
    fixedAssetCount: 2,
  });
  const context = buildPlanContext({
    snapshot: engine,
    entrepreneur: { name: 'లక్ష్మి దేవి', education: '10th pass', socialCategory: 'OBC', householdMembers: 5 },
    location: { village: 'कोठापल्ली', district: 'ರಂಗಾರೆಡ್ಡಿ', state: 'Telangana', pincode: '501505' },
    business: { sectorName: 'Tailoring', stage: 'existing', name: 'Lakshmi Tailors' },
    sectorAnswers: { 'Machine type': 'Electric' },
    assets: [{ name: 'Industrial sewing machine', cost: 60000 }, { name: 'Cutting table', cost: 6000 }],
    otherSetupCost: 2500,
    growth: [1, 2, 3].map((year, i) => ({ year, suggestedPct: [13, 5, 3][i], approvedPct: [13, 5, 3][i], reasons: [] })),
    futurePlan: { goals: ['buy_new_equipment'], loanGoal: 'Buy a machine', threeYearVision: null },
    marketing: { targetCustomers: 'Women nearby', currentChannels: ['Local market'], proposedChannels: ['WhatsApp'], pricingStrategy: 'Value for money', competitiveAdvantage: null },
  });
  return {
    version: 2, status, approvedAt: status === 'approved' ? '2026-11-10T10:00:00Z' : null, createdAt: '2026-11-10T09:00:00Z',
    writtenWith: 'standard-wording', engine, context, narrative: templateNarrative(context),
  };
}

const tools = (() => {
  try {
    execFileSync('pdftotext', ['-v'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

describe('DPR PDF', () => {
  it.runIf(tools)('has all 30 sections in order, real numbers, Indic fonts embedded, and DRAFT until approved', async () => {
    const { renderDpr } = await import('./dpr');
    // DPR_SAMPLE_DIR=/some/dir keeps the sample PDFs for a visual check.
    const dir = process.env.DPR_SAMPLE_DIR || mkdtempSync(path.join(tmpdir(), 'dpr-'));

    const draft = path.join(dir, 'draft.pdf');
    writeFileSync(draft, await renderDpr(sample('generated')));
    const text = execFileSync('pdftotext', ['-layout', draft, '-'], { encoding: 'utf8' });
    const fonts = execFileSync('pdffonts', [draft], { encoding: 'utf8' });

    const headings = [...text.matchAll(/^\s*(\d{1,2})\. [A-Z]/gm)].map((m) => Number(m[1]));
    expect(headings).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(text).toContain('DRAFT');
    expect(text).toContain('₹60,000'); // loan required, from the engine
    // Telugu name survives (a word without conjuncts: PDF text extraction reorders shaped conjunct glyphs,
    // although they display correctly — checked visually).
    expect(text).toContain('దేవి');
    expect(fonts).toMatch(/NotoSans-/);
    expect(fonts).toMatch(/NotoSansTelugu/);
    expect(text).toContain('कोठा'); // Hindi/Devanagari (Noto Sans itself covers Devanagari)
    expect(fonts).toMatch(/NotoSansKannada/);

    const final = path.join(dir, 'approved.pdf');
    writeFileSync(final, await renderDpr(sample('approved')));
    const ftext = execFileSync('pdftotext', [final, '-'], { encoding: 'utf8' });
    expect(ftext).not.toMatch(/\bDRAFT\b/);
    expect(ftext).toContain('Approved by DSK reviewer');
  }, 60_000);
});
