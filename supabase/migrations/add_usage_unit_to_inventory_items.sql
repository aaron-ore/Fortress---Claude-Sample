-- Variance Finder (Phase 1): canonical usage unit per inventory item.
-- Each item is counted, purchased, and consumed in recipes in ONE canonical unit.
-- inventory_items.unit_cost is interpreted as the cost per this usage unit.
-- We do NOT auto-convert units in Phase 1; mismatches are surfaced as setup errors.

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS usage_unit_id UUID REFERENCES public.units_of_measure(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.inventory_items.usage_unit_id IS
  'Canonical usage unit for variance math. unit_cost is the cost per this unit. Recipes, counts, and purchases must express this item in this unit (no auto-conversion in Phase 1).';
