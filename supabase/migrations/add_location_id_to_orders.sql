-- Variance Finder (Phase 1): attribute orders to a location.
-- Purchases for variance are DERIVED from orders where type='Purchase'; to scope
-- a variance period to a location we need to know which location an order belongs to.
-- Nullable + no backfill: existing orders stay NULL and are unaffected.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.inventory_folders(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.orders.location_id IS
  'Location (inventory_folders) this order belongs to. Used to attribute purchases to a variance period. Nullable for backward compatibility.';
