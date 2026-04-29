-- Add location type and metadata columns to inventory_folders
-- This evolves "folders" into proper named locations (warehouse or restaurant branches)

ALTER TABLE public.inventory_folders
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'warehouse'
    CHECK (type IN ('warehouse', 'restaurant', 'generic')),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS manager_name TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Existing folders default to 'warehouse' type (the original use case)
UPDATE public.inventory_folders SET type = 'warehouse' WHERE type IS NULL OR type = '';

COMMENT ON COLUMN public.inventory_folders.type IS 'Location type: warehouse, restaurant, or generic';
COMMENT ON COLUMN public.inventory_folders.address IS 'Physical address of this location';
COMMENT ON COLUMN public.inventory_folders.phone IS 'Contact phone number for this location';
COMMENT ON COLUMN public.inventory_folders.manager_name IS 'Name of the location manager';
COMMENT ON COLUMN public.inventory_folders.is_active IS 'Whether this location is currently active';
