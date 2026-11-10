import { describe, it, expect } from 'vitest';
import { cleanPincodeInput, escapeLike, isPincode, mergeSearch, singleDistrict, type PlaceHit } from './location';

const hit = (id: number, districtId: number): PlaceHit => ({
  id, name: `P${id}`, pincode: '504273', districtId, district: `D${districtId}`, stateId: 1, state: 'Telangana',
});

describe('pincode', () => {
  it('accepts 6 digits not starting with 0', () => {
    expect(isPincode('500001')).toBe(true);
    expect(isPincode('050001')).toBe(false);
    expect(isPincode('50001')).toBe(false);
    expect(isPincode('5000011')).toBe(false);
  });
  it('strips non-digits and caps at 6', () => {
    expect(cleanPincodeInput('5 0 0-001x9')).toBe('500001');
  });
});

describe('search helpers', () => {
  it('escapes LIKE wildcards', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });
  it('fills district only when all hits share one (504273 spans two districts)', () => {
    expect(singleDistrict([hit(1, 10), hit(2, 10)])).toEqual({ stateId: 1, districtId: 10 });
    expect(singleDistrict([hit(1, 10), hit(2, 11)])).toBeNull();
    expect(singleDistrict([])).toBeNull();
  });
  it('puts prefix matches first, de-duplicates, caps at the limit', () => {
    const r = mergeSearch([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }, { id: 4 }], 3);
    expect(r.map((x) => x.id)).toEqual([1, 2, 3]);
  });
});
