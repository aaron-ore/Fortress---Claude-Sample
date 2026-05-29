import { describe, it, expect } from 'vitest';
import {
  computeVariance,
  safeOutputQuantity,
  type VarianceInput,
} from './varianceEngine';

describe('safeOutputQuantity', () => {
  it('passes a positive yield through unchanged', () => {
    expect(safeOutputQuantity(1)).toBe(1);
    expect(safeOutputQuantity(10)).toBe(10);
    expect(safeOutputQuantity(0.5)).toBe(0.5);
  });

  it('treats 0, null, undefined, negative, and non-finite yields as 1', () => {
    expect(safeOutputQuantity(0)).toBe(1);
    expect(safeOutputQuantity(null)).toBe(1);
    expect(safeOutputQuantity(undefined)).toBe(1);
    expect(safeOutputQuantity(-5)).toBe(1);
    expect(safeOutputQuantity(NaN)).toBe(1);
    expect(safeOutputQuantity(Infinity)).toBe(1);
  });
});

describe('computeVariance — worked example', () => {
  // Two items, both measured in kg.
  //
  //   tomato:  unit_cost $2.00/kg     cheese: unit_cost $8.00/kg
  //
  // Recipes:
  //   Pizza        (yield 1):  tomato 0.2 kg, cheese 0.15 kg
  //   Sauce batch  (yield 10): tomato 5 kg            (per serving => 0.5 kg)
  //
  // Sales: Pizza ×100, Sauce batch ×10
  //
  // Theoretical usage:
  //   tomato = 100×0.2/1 + 10×5/10 = 20 + 5 = 25 kg
  //   cheese = 100×0.15/1          = 15 kg
  //
  // Counts:
  //   tomato: begin 30, end 8     cheese: begin 25, end 4
  //
  // Purchases (in period):
  //   tomato: 10 @ $2.10 and 5 @ $2.30  => qty 15, wavg = 32.5/15 = $2.16667
  //   cheese: none                      => fallback to unit_cost $8.00
  //
  // Actual usage:
  //   tomato = 30 + 15 − 8 = 37   => variance +12 kg  => 12 × 32.5/15 = $26.00 (receipt)
  //   cheese = 25 +  0 − 4 = 21   => variance + 6 kg  =>  6 × 8.00     = $48.00 (fallback)
  //
  // Hero number = 26.00 + 48.00 = $74.00
  const input: VarianceInput = {
    items: [
      { id: 'tomato', name: 'Tomato', usageUnitId: 'kg', unitCost: 2.0 },
      { id: 'cheese', name: 'Cheese', usageUnitId: 'kg', unitCost: 8.0 },
    ],
    recipes: [
      {
        id: 'pizza',
        outputQuantity: 1,
        ingredients: [
          { inventoryItemId: 'tomato', quantity: 0.2, unitId: 'kg' },
          { inventoryItemId: 'cheese', quantity: 0.15, unitId: 'kg' },
        ],
      },
      {
        id: 'sauce',
        outputQuantity: 10,
        ingredients: [{ inventoryItemId: 'tomato', quantity: 5, unitId: 'kg' }],
      },
    ],
    sales: [
      { recipeId: 'pizza', qtySold: 100 },
      { recipeId: 'sauce', qtySold: 10 },
    ],
    counts: [
      { inventoryItemId: 'tomato', beginningQty: 30, endingQty: 8 },
      { inventoryItemId: 'cheese', beginningQty: 25, endingQty: 4 },
    ],
    purchases: [
      { inventoryItemId: 'tomato', quantity: 10, unitCostAtReceipt: 2.1 },
      { inventoryItemId: 'tomato', quantity: 5, unitCostAtReceipt: 2.3 },
      // cheese: no purchases
    ],
  };

  const result = computeVariance(input);
  const tomato = result.lines.find((l) => l.itemId === 'tomato')!;
  const cheese = result.lines.find((l) => l.itemId === 'cheese')!;

  it('computes theoretical usage with batch-yield division', () => {
    expect(tomato.theoreticalUsage).toBeCloseTo(25, 10);
    expect(cheese.theoreticalUsage).toBeCloseTo(15, 10);
  });

  it('computes actual usage = beginning + purchases − ending', () => {
    expect(tomato.purchasesQty).toBe(15);
    expect(tomato.actualUsage).toBeCloseTo(37, 10);
    expect(cheese.actualUsage).toBeCloseTo(21, 10);
  });

  it('prices variance at weighted-avg receipt cost, falling back to unit_cost', () => {
    expect(tomato.priceSource).toBe('receipt');
    expect(tomato.unitPrice).toBeCloseTo(32.5 / 15, 10);
    expect(cheese.priceSource).toBe('fallback');
    expect(cheese.unitPrice).toBeCloseTo(8.0, 10);
  });

  it('computes variance units, dollars, and percent per item', () => {
    expect(tomato.varianceUnits).toBeCloseTo(12, 10);
    expect(tomato.varianceDollars).toBeCloseTo(26.0, 10);
    expect(tomato.variancePercent).toBeCloseTo(12 / 25, 10);

    expect(cheese.varianceUnits).toBeCloseTo(6, 10);
    expect(cheese.varianceDollars).toBeCloseTo(48.0, 10);
    expect(cheese.variancePercent).toBeCloseTo(6 / 15, 10);
  });

  it('sums the hero number across clean items', () => {
    expect(result.heroNumber).toBeCloseTo(74.0, 10);
    expect(result.setupErrors).toHaveLength(0);
  });
});

describe('computeVariance — output_quantity guard (1, 0, null)', () => {
  const make = (outputQuantity: number | null): VarianceInput => ({
    items: [{ id: 'flour', name: 'Flour', usageUnitId: 'g', unitCost: 1 }],
    recipes: [
      {
        id: 'bread',
        outputQuantity,
        ingredients: [{ inventoryItemId: 'flour', quantity: 2, unitId: 'g' }],
      },
    ],
    sales: [{ recipeId: 'bread', qtySold: 3 }],
    counts: [],
    purchases: [],
  });

  it('output_quantity = 1: theoretical = qtySold × ingredient', () => {
    const r = computeVariance(make(1));
    expect(r.lines[0].theoreticalUsage).toBeCloseTo(6, 10); // 3 × 2 / 1
  });

  it('output_quantity = 0: divisor guarded to 1 (no Infinity/NaN)', () => {
    const r = computeVariance(make(0));
    expect(r.lines[0].theoreticalUsage).toBeCloseTo(6, 10); // 3 × 2 / 1
    expect(Number.isFinite(r.lines[0].theoreticalUsage)).toBe(true);
  });

  it('output_quantity = null: divisor guarded to 1', () => {
    const r = computeVariance(make(null));
    expect(r.lines[0].theoreticalUsage).toBeCloseTo(6, 10); // 3 × 2 / 1
  });
});

describe('computeVariance — guards and setup errors', () => {
  it('returns null variance% when theoretical usage is 0 (division guard)', () => {
    // Item has a purchase but is never sold through any recipe => theoretical 0.
    const r = computeVariance({
      items: [{ id: 'salt', name: 'Salt', usageUnitId: 'g', unitCost: 0.5 }],
      recipes: [],
      sales: [],
      counts: [{ inventoryItemId: 'salt', beginningQty: 100, endingQty: 90 }],
      purchases: [{ inventoryItemId: 'salt', quantity: 0, unitCostAtReceipt: null }],
    });
    const salt = r.lines.find((l) => l.itemId === 'salt')!;
    expect(salt.theoreticalUsage).toBe(0);
    expect(salt.variancePercent).toBeNull();
    expect(salt.actualUsage).toBe(10); // 100 + 0 − 90
  });

  it('flags a recipe-ingredient unit mismatch and excludes it from the hero number', () => {
    const r = computeVariance({
      // item usage unit is kg, but the recipe expresses it in g => mismatch
      items: [{ id: 'sugar', name: 'Sugar', usageUnitId: 'kg', unitCost: 3 }],
      recipes: [
        {
          id: 'cake',
          outputQuantity: 1,
          ingredients: [{ inventoryItemId: 'sugar', quantity: 200, unitId: 'g' }],
        },
      ],
      sales: [{ recipeId: 'cake', qtySold: 5 }],
      counts: [{ inventoryItemId: 'sugar', beginningQty: 10, endingQty: 2 }],
      purchases: [],
    });
    const sugar = r.lines.find((l) => l.itemId === 'sugar')!;
    expect(sugar.hasSetupError).toBe(true);
    expect(r.setupErrors).toHaveLength(1);
    expect(r.setupErrors[0].reason).toMatch(/unit/i);
    expect(r.heroNumber).toBe(0); // excluded
  });

  it('flags an item with no canonical usage unit', () => {
    const r = computeVariance({
      items: [{ id: 'oil', name: 'Oil', usageUnitId: null, unitCost: 4 }],
      recipes: [],
      sales: [],
      counts: [{ inventoryItemId: 'oil', beginningQty: 5, endingQty: 1 }],
      purchases: [],
    });
    const oil = r.lines.find((l) => l.itemId === 'oil')!;
    expect(oil.hasSetupError).toBe(true);
    expect(r.setupErrors[0].reason).toMatch(/usage unit/i);
    expect(r.heroNumber).toBe(0);
  });

  it('blends multiple receipt costs by quantity-weighted average', () => {
    const r = computeVariance({
      items: [{ id: 'beef', name: 'Beef', usageUnitId: 'kg', unitCost: 9 }],
      recipes: [],
      sales: [],
      counts: [{ inventoryItemId: 'beef', beginningQty: 0, endingQty: 0 }],
      purchases: [
        { inventoryItemId: 'beef', quantity: 8, unitCostAtReceipt: 10 },
        { inventoryItemId: 'beef', quantity: 2, unitCostAtReceipt: 15 },
      ],
    });
    const beef = r.lines.find((l) => l.itemId === 'beef')!;
    // (8×10 + 2×15) / 10 = 110/10 = 11.00, NOT the 9.00 fallback
    expect(beef.priceSource).toBe('receipt');
    expect(beef.unitPrice).toBeCloseTo(11.0, 10);
  });
});
