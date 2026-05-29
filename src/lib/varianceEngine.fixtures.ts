import type { VarianceInput } from './varianceEngine';

// A realistic one-week, one-location restaurant period used by both the engine
// tests and the end-to-end demo. Three items in three different usage units:
//   Beef (kg), Wine (btl), Olive oil (L)
// Beef is received twice at different costs; wine once; olive oil not at all
// (so it prices off the item's canonical unit_cost fallback).
export const RESTAURANT_WEEK: VarianceInput = {
  items: [
    { id: 'beef', name: 'Beef tenderloin', usageUnitId: 'kg', unitCost: 12.0 },
    { id: 'wine', name: 'House red wine', usageUnitId: 'btl', unitCost: 9.0 },
    { id: 'oil', name: 'Extra-virgin olive oil', usageUnitId: 'L', unitCost: 7.0 },
  ],
  recipes: [
    {
      id: 'steak_frites',
      outputQuantity: 1,
      ingredients: [
        { inventoryItemId: 'beef', quantity: 0.3, unitId: 'kg' },
        { inventoryItemId: 'oil', quantity: 0.02, unitId: 'L' },
      ],
    },
    {
      // a batch that yields 4 servings
      id: 'beef_stew',
      outputQuantity: 4,
      ingredients: [
        { inventoryItemId: 'beef', quantity: 1.2, unitId: 'kg' },
        { inventoryItemId: 'oil', quantity: 0.05, unitId: 'L' },
        { inventoryItemId: 'wine', quantity: 0.5, unitId: 'btl' },
      ],
    },
    {
      // one bottle pours 5 glasses
      id: 'house_red_glass',
      outputQuantity: 5,
      ingredients: [{ inventoryItemId: 'wine', quantity: 1, unitId: 'btl' }],
    },
    {
      id: 'bruschetta',
      outputQuantity: 1,
      ingredients: [{ inventoryItemId: 'oil', quantity: 0.03, unitId: 'L' }],
    },
  ],
  sales: [
    { recipeId: 'steak_frites', qtySold: 120 },
    { recipeId: 'beef_stew', qtySold: 60 },
    { recipeId: 'house_red_glass', qtySold: 200 },
    { recipeId: 'bruschetta', qtySold: 80 },
  ],
  counts: [
    { inventoryItemId: 'beef', beginningQty: 20, endingQty: 8 },
    { inventoryItemId: 'wine', beginningQty: 60, endingQty: 25 },
    { inventoryItemId: 'oil', beginningQty: 15, endingQty: 9 },
  ],
  purchases: [
    { inventoryItemId: 'beef', quantity: 30, unitCostAtReceipt: 12.5 },
    { inventoryItemId: 'beef', quantity: 20, unitCostAtReceipt: 13.0 },
    { inventoryItemId: 'wine', quantity: 24, unitCostAtReceipt: 8.5 },
    // olive oil: no receipts this period
  ],
};
