/** Pure helpers for the location picker (tested in location.test.ts). */

export const NOT_SPECIFIED_TALUK = 'Not specified';

export function isPincode(v: string): boolean {
  return /^[1-9]\d{5}$/.test(v);
}

/** Keep only digits, max 6 — what the pincode box accepts as she types. */
export function cleanPincodeInput(v: string): string {
  return v.replace(/\D/g, '').slice(0, 6);
}

/** Escape LIKE wildcards so a typed % or _ is matched literally. */
export function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (c) => '\\' + c);
}

export type PlaceHit = {
  id: number;
  name: string;
  pincode: string;
  districtId: number;
  district: string;
  stateId: number;
  state: string;
};

/** If every pincode hit is in one district, return it so state + district can be filled in for her. */
export function singleDistrict(hits: PlaceHit[]): { stateId: number; districtId: number } | null {
  if (hits.length === 0) return null;
  const d = new Set(hits.map((h) => h.districtId));
  return d.size === 1 ? { stateId: hits[0].stateId, districtId: hits[0].districtId } : null;
}

/** Prefix matches first, then "contains" matches; no duplicates; capped. */
export function mergeSearch<T extends { id: number }>(prefix: T[], contains: T[], limit = 50): T[] {
  const seen = new Set(prefix.map((p) => p.id));
  return [...prefix, ...contains.filter((c) => !seen.has(c.id))].slice(0, limit);
}
