/** Number parsing shared by server actions and live (client) screens. No imports, so it stays tiny. */

/** "" → null; "1,200" / "₹ 1200" → 1200; anything else that isn't a number → NaN (reported as an error). */
export function parseNumber(v: unknown): number | null {
  const s = (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '').replace(/[₹,\s]/g, '');
  if (s === '') return null;
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : Number.NaN;
}

/** For live totals only: anything unusable counts as 0. Saving still validates properly. */
export const liveNumber = (v: unknown): number => {
  const x = parseNumber(v);
  return x !== null && Number.isFinite(x) && x >= 0 ? x : 0;
};
