// Food-cost variance engine — pure, deterministic arithmetic. No I/O, no LLM.
//
// Variance is, per inventory item, the gap between what was actually consumed and
// what the recipes say should have been consumed, priced into dollars:
//
//   actual usage      = beginning count + purchases − ending count
//   theoretical usage = Σ over sold menu items: qty_sold × (ingredient_qty / recipe_yield)
//   variance units    = actual usage − theoretical usage
//   unit price        = weighted-avg cost paid at receipt for the period's purchases,
//                       falling back to the item's canonical unit_cost when there were
//                       no priced purchases
//   variance $        = variance units × unit price
//   hero number       = Σ variance $ across items WITHOUT a setup error
//
// Phase 1 constraint: every item has ONE canonical usage unit, and recipes, counts,
// and purchases must all express the item in that unit. We never auto-convert; a
// recipe ingredient whose unit differs from the item's usage unit (or an item with
// no usage unit) is flagged as a setup error and excluded from the hero number.

export interface VarianceItem {
  id: string;
  name: string;
  /** Canonical usage unit id. `unitCost` is the cost per this unit. */
  usageUnitId?: string | null;
  /** Cost per usage unit; used as the pricing fallback when no priced purchases exist. */
  unitCost: number;
}

export interface VarianceRecipeIngredient {
  inventoryItemId?: string | null;
  quantity: number;
  /** Unit the ingredient quantity is expressed in. Must equal the item's `usageUnitId`. */
  unitId?: string | null;
}

export interface VarianceRecipe {
  id: string;
  /** Sellable units this recipe yields. Missing / 0 / non-positive is treated as 1. */
  outputQuantity?: number | null;
  ingredients: VarianceRecipeIngredient[];
}

export interface VarianceSale {
  recipeId: string;
  qtySold: number;
}

export interface VarianceCount {
  inventoryItemId: string;
  beginningQty: number;
  endingQty: number;
}

export interface VariancePurchaseLine {
  inventoryItemId: string;
  quantity: number;
  /** Actual per-unit cost paid at receipt. Null/undefined => excluded from the weighted average. */
  unitCostAtReceipt?: number | null;
}

export interface VarianceInput {
  items: VarianceItem[];
  recipes: VarianceRecipe[];
  /** Sales already resolved to a recipe (menu item) via POS-name mapping. */
  sales: VarianceSale[];
  counts: VarianceCount[];
  /** Purchase lines already scoped to the period's location and date window. */
  purchases: VariancePurchaseLine[];
}

export type PriceSource = 'receipt' | 'fallback';

export interface VarianceLine {
  itemId: string;
  itemName: string;
  beginningQty: number;
  purchasesQty: number;
  endingQty: number;
  actualUsage: number;
  theoreticalUsage: number;
  varianceUnits: number;
  unitPrice: number;
  priceSource: PriceSource;
  varianceDollars: number;
  /** null when theoretical usage is 0 (division guarded). */
  variancePercent: number | null;
  /** True when this item has a setup error and is excluded from the hero number. */
  hasSetupError: boolean;
}

export interface VarianceSetupError {
  itemId: string;
  itemName: string;
  reason: string;
}

export interface VarianceResult {
  /** One row per item with any activity (sold-through usage, a count, or a purchase). */
  lines: VarianceLine[];
  /** Sum of varianceDollars across items WITHOUT a setup error. */
  heroNumber: number;
  setupErrors: VarianceSetupError[];
}

/**
 * Treat a missing, zero, negative, or non-finite recipe yield as 1 so it never
 * reaches the divisor and never flips the sign of theoretical usage.
 */
export function safeOutputQuantity(outputQuantity?: number | null): number {
  return Number.isFinite(outputQuantity) && (outputQuantity as number) > 0
    ? (outputQuantity as number)
    : 1;
}

export function computeVariance(input: VarianceInput): VarianceResult {
  const { items, recipes, sales, counts, purchases } = input;

  const itemById = new Map(items.map((i) => [i.id, i]));
  const recipeById = new Map(recipes.map((r) => [r.id, r]));

  // qty sold per recipe (a recipe == a menu item)
  const soldByRecipe = new Map<string, number>();
  for (const s of sales) {
    soldByRecipe.set(s.recipeId, (soldByRecipe.get(s.recipeId) ?? 0) + s.qtySold);
  }

  // theoretical usage per item, plus the set of ingredient units seen per item
  // (for unit-mismatch detection)
  const theoreticalByItem = new Map<string, number>();
  const ingredientUnitsByItem = new Map<string, Set<string | null>>();
  for (const [recipeId, qtySold] of soldByRecipe) {
    const recipe = recipeById.get(recipeId);
    if (!recipe || qtySold === 0) continue;
    const yieldQty = safeOutputQuantity(recipe.outputQuantity);
    for (const ing of recipe.ingredients) {
      if (!ing.inventoryItemId) continue;
      const used = (ing.quantity * qtySold) / yieldQty;
      theoreticalByItem.set(
        ing.inventoryItemId,
        (theoreticalByItem.get(ing.inventoryItemId) ?? 0) + used,
      );
      if (!ingredientUnitsByItem.has(ing.inventoryItemId)) {
        ingredientUnitsByItem.set(ing.inventoryItemId, new Set());
      }
      ingredientUnitsByItem.get(ing.inventoryItemId)!.add(ing.unitId ?? null);
    }
  }

  // counts per item (rows are unique per period+type+item, so last value wins)
  const countByItem = new Map<string, { beginningQty: number; endingQty: number }>();
  for (const c of counts) {
    const prev = countByItem.get(c.inventoryItemId) ?? { beginningQty: 0, endingQty: 0 };
    countByItem.set(c.inventoryItemId, {
      beginningQty: c.beginningQty || prev.beginningQty,
      endingQty: c.endingQty || prev.endingQty,
    });
  }

  // purchases per item: total qty + weighted-average receipt cost
  const purchaseByItem = new Map<
    string,
    { qty: number; costWeightedSum: number; costedQty: number }
  >();
  for (const p of purchases) {
    const agg = purchaseByItem.get(p.inventoryItemId) ?? {
      qty: 0,
      costWeightedSum: 0,
      costedQty: 0,
    };
    agg.qty += p.quantity;
    if (p.unitCostAtReceipt != null && Number.isFinite(p.unitCostAtReceipt) && p.quantity > 0) {
      agg.costWeightedSum += p.unitCostAtReceipt * p.quantity;
      agg.costedQty += p.quantity;
    }
    purchaseByItem.set(p.inventoryItemId, agg);
  }

  // every item touched by usage, a count, or a purchase, in deterministic order
  const participating = new Set<string>([
    ...theoreticalByItem.keys(),
    ...countByItem.keys(),
    ...purchaseByItem.keys(),
  ]);
  const sortedIds = [...participating].sort();

  const lines: VarianceLine[] = [];
  const setupErrors: VarianceSetupError[] = [];
  let heroNumber = 0;

  for (const itemId of sortedIds) {
    const item = itemById.get(itemId);
    const itemName = item?.name ?? itemId;

    // ── setup-error detection (no auto-conversion) ──
    const reasons: string[] = [];
    if (!item) {
      reasons.push('Referenced inventory item not found in the item master.');
    } else if (item.usageUnitId == null) {
      reasons.push('Item has no canonical usage unit set.');
    } else {
      const usedUnits = ingredientUnitsByItem.get(itemId);
      if (usedUnits) {
        for (const u of usedUnits) {
          if (u !== item.usageUnitId) {
            reasons.push(
              'A recipe ingredient unit does not match the item canonical usage unit.',
            );
            break;
          }
        }
      }
    }
    const hasSetupError = reasons.length > 0;

    const theoreticalUsage = theoreticalByItem.get(itemId) ?? 0;
    const count = countByItem.get(itemId) ?? { beginningQty: 0, endingQty: 0 };
    const purchase = purchaseByItem.get(itemId) ?? { qty: 0, costWeightedSum: 0, costedQty: 0 };

    const purchasesQty = purchase.qty;
    const actualUsage = count.beginningQty + purchasesQty - count.endingQty;
    const varianceUnits = actualUsage - theoreticalUsage;

    let unitPrice: number;
    let priceSource: PriceSource;
    if (purchase.costedQty > 0) {
      unitPrice = purchase.costWeightedSum / purchase.costedQty;
      priceSource = 'receipt';
    } else {
      unitPrice = item?.unitCost ?? 0;
      priceSource = 'fallback';
    }

    const varianceDollars = varianceUnits * unitPrice;
    const variancePercent = theoreticalUsage !== 0 ? varianceUnits / theoreticalUsage : null;

    lines.push({
      itemId,
      itemName,
      beginningQty: count.beginningQty,
      purchasesQty,
      endingQty: count.endingQty,
      actualUsage,
      theoreticalUsage,
      varianceUnits,
      unitPrice,
      priceSource,
      varianceDollars,
      variancePercent,
      hasSetupError,
    });

    if (hasSetupError) {
      for (const reason of reasons) setupErrors.push({ itemId, itemName, reason });
    } else {
      heroNumber += varianceDollars;
    }
  }

  return { lines, heroNumber, setupErrors };
}
