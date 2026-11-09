import { describe, it, expect } from 'vitest';
import {
  businessSchema, entrepreneurNextErrors, entrepreneurSchema, fieldErrors, normaliseMobile, parseNumber, readBusiness,
  readEntrepreneur,
} from './forms';

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  Object.entries(o).forEach(([k, v]) => f.append(k, v));
  return f;
};

describe('parsing helpers', () => {
  it('numbers: blank → null, rupee/commas ok, junk → NaN', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('₹ 12,500')).toBe(12500);
    expect(parseNumber('12.5')).toBe(12.5);
    expect(Number.isNaN(parseNumber('abc'))).toBe(true);
  });
  it('mobile: accepts +91 / 0 prefixes, rejects bad numbers', () => {
    expect(normaliseMobile('+91 98765 43210')).toBe('9876543210');
    expect(normaliseMobile('09876543210')).toBe('9876543210');
    expect(normaliseMobile('')).toBeNull();
    expect(normaliseMobile('12345')).toBe('INVALID');
    expect(normaliseMobile('5876543210')).toBe('INVALID');
  });
});

describe('entrepreneur step', () => {
  const ok = { full_name: 'Shantamma Basappa Patil', gender: 'Female', age_years: '38', mobile: '9876543210', consent: 'on', household_members: '5', earning_members: '2', dependents: '3' };
  it('valid input parses', () => {
    const r = entrepreneurSchema.safeParse(readEntrepreneur(fd(ok)));
    expect(r.success).toBe(true);
    if (r.success) expect(entrepreneurNextErrors(r.data, false)).toEqual({});
  });
  it('name and consent are required to continue, not to go back', () => {
    const r = entrepreneurSchema.parse(readEntrepreneur(fd({ age_years: '30' })));
    expect(entrepreneurNextErrors(r, false)).toEqual({ full_name: expect.any(String), consent: expect.any(String) });
    expect(entrepreneurNextErrors({ ...r, full_name: 'X' }, true)).toEqual({}); // consent given earlier
  });
  it('rejects under-18, bad mobile, earning > household', () => {
    const r = entrepreneurSchema.safeParse(readEntrepreneur(fd({ ...ok, age_years: '16', mobile: '123', earning_members: '9' })));
    expect(r.success).toBe(false);
    if (!r.success) expect(Object.keys(fieldErrors(r.error)).sort()).toEqual(['age_years', 'earning_members', 'mobile']);
  });
  it('rejects a choice that is not in the list', () => {
    expect(entrepreneurSchema.safeParse(readEntrepreneur(fd({ ...ok, education: 'PhD' }))).success).toBe(false);
  });
});

describe('business step', () => {
  it('parses an existing business', () => {
    const r = businessSchema.parse(readBusiness(fd({ stage: 'existing', business_name: 'Shanti Papad', stated_monthly_turnover: '22,000', existing_monthly_emi: '1500' })));
    expect(r).toEqual({ stage: 'existing', business_name: 'Shanti Papad', stated_monthly_turnover: 22000, existing_monthly_emi: 1500 });
  });
  it('rejects negative money and unknown stage', () => {
    expect(businessSchema.safeParse(readBusiness(fd({ stage: 'existing', existing_monthly_emi: '-5' }))).success).toBe(false);
    expect(businessSchema.safeParse(readBusiness(fd({ stage: 'maybe' }))).success).toBe(false);
  });
});
