import { describe, expect, it } from 'vitest';
import {
  CUSTOM_HEAD, draftsToEngineExpenses, draftsToEngineProducts, parseAssets, parseExpenses, parseProducts, readRowsJson,
} from './finance-rows';
import { liveNumber, parseNumber } from './numbers';

const ID = '3f1c2b9e-4a5d-4e6f-8a7b-9c0d1e2f3a4b';
const HEAD = { id: '11111111-2222-4333-8444-555555555555', name: 'Rent' };

describe('numbers', () => {
  it('parses rupee input and flags junk', () => {
    expect(parseNumber('₹ 1,200')).toBe(1200);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('12abc')).toBeNaN();
    expect(liveNumber('-5')).toBe(0);
    expect(liveNumber('abc')).toBe(0);
    expect(liveNumber('2.5')).toBe(2.5);
  });
});

describe('products', () => {
  const card = { key: 'k', id: ID, name: 'Blouse', unit: 'piece', qty: '100', price: '400', direct: '180', other: '20', capacity: '' };

  it('turns a filled card into a row to save, keeping a valid id', () => {
    const { rows, errors } = parseProducts([card], true);
    expect(errors).toEqual({});
    expect(rows).toEqual([
      { id: ID, name: 'Blouse', unit: 'piece', qty_per_month: 100, selling_price: 400, direct_cost_per_unit: 180, other_cost_per_unit: 20, max_capacity_per_month: null },
    ]);
  });

  it('ignores empty cards and drops ids that are not UUIDs', () => {
    const { rows } = parseProducts([{ key: 'a', name: '', unit: '', qty: '', price: '', direct: '', other: '', capacity: '' }, { ...card, id: "1; drop table" }], false);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBeNull();
  });

  it('reports errors against the card index she sees', () => {
    const { errors } = parseProducts([{ ...card }, { ...card, name: '', price: '-1', capacity: '0' }], true);
    expect(errors['rows.1.name']).toMatch(/name/);
    expect(errors['rows.1.price']).toMatch(/negative/);
    expect(errors['rows.1.capacity']).toMatch(/more than 0/);
  });

  it('needs one product with quantity and price only to move forward', () => {
    const half = [{ ...card, qty: '', price: '' }];
    expect(parseProducts(half, true).errors.rows).toBeDefined();
    expect(parseProducts(half, false).errors).toEqual({});
  });

  it('live totals treat half-typed numbers as 0, never NaN', () => {
    const [p] = draftsToEngineProducts([{ ...card, qty: '1,0', price: 'x' }]);
    expect(p.qtyPerMonth).toBe(10);
    expect(p.sellingPrice).toBe(0);
  });
});

describe('expenses', () => {
  it('accepts an offered head or a typed custom head', () => {
    const { rows, errors } = parseExpenses(
      [
        { key: 'a', id: null, head: HEAD.id, custom: '', amount: '3000', frequency: 'monthly' },
        { key: 'b', id: null, head: CUSTOM_HEAD, custom: 'Tea for staff', amount: '200', frequency: 'weekly' },
      ],
      [HEAD],
    );
    expect(errors).toEqual({});
    expect(rows.map((r) => [r.head_id, r.custom_head, r.amount, r.frequency])).toEqual([
      [HEAD.id, null, 3000, 'monthly'],
      [null, 'Tea for staff', 200, 'weekly'],
    ]);
  });

  it('rejects a head that the screen did not offer (e.g. a raw-material head) and a missing amount', () => {
    const { errors } = parseExpenses(
      [{ key: 'a', id: null, head: '99999999-2222-4333-8444-555555555555', custom: '', amount: '', frequency: 'daily' }],
      [HEAD],
    );
    expect(Object.keys(errors).sort()).toEqual(['rows.0.amount', 'rows.0.frequency', 'rows.0.head']);
  });

  it('names custom heads for the engine', () => {
    const [e] = draftsToEngineExpenses([{ key: 'b', id: null, head: CUSTOM_HEAD, custom: ' Tea ', amount: '100', frequency: 'monthly' }], [HEAD]);
    expect(e.head).toBe('Tea');
  });
});

describe('assets', () => {
  it('needs a name and a cost for each item; blank rows are ignored', () => {
    const { rows, errors } = parseAssets([
      { key: 'a', id: null, name: 'Sewing machine', qty: '1', cost: '12,500' },
      { key: 'b', id: null, name: '', qty: '1', cost: '' },
      { key: 'c', id: null, name: 'Table', qty: '1', cost: '' },
    ]);
    expect(rows[0]).toEqual({ id: null, name: 'Sewing machine', qty: 1, unit_cost: 12500 });
    expect(errors).toEqual({ 'rows.2.cost': 'Enter the cost.' });
  });
});

describe('rows JSON', () => {
  it('never throws on bad input', () => {
    expect(readRowsJson('not json')).toEqual([]);
    expect(readRowsJson('{"a":1}')).toEqual([]);
    expect(readRowsJson(null)).toEqual([]);
    expect(readRowsJson('[1]')).toEqual([1]);
  });
});
