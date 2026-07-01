-- Warehouse serialized units: one row per physical device (e.g. a payment
-- terminal) whose serial number doubles as its barcode. This is the backbone
-- for per-unit lifecycle status, allocation, demo tracking, and serial audit.
-- inventory_items remains the product/model catalog; each unit references one.
-- Idempotent; safe to re-run.

CREATE TABLE IF NOT EXISTS public.inventory_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID, -- who created the unit (intake operator)
  product_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  serial_number TEXT NOT NULL,
  -- Lifecycle status. Kept as TEXT + CHECK (not a PG enum) so adding a value
  -- later is a one-line constraint change, matching how the app sends strings.
  unit_status TEXT NOT NULL DEFAULT 'available'
    CHECK (unit_status IN ('available','allocated','shipped','deployed','demo','returned','defective')),
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL, -- supplier
  folder_id UUID REFERENCES public.inventory_folders(id) ON DELETE SET NULL, -- location
  merchant_id UUID, -- set during allocation (Phase 2); no FK yet, merchants table TBD
  received_date DATE NOT NULL DEFAULT current_date,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- A serial is unique within an organization, case-insensitively (scanners and
-- humans are inconsistent about case). Cross-org duplicates are fine.
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_units_org_serial
  ON public.inventory_units (organization_id, lower(serial_number));

CREATE INDEX IF NOT EXISTS idx_inventory_units_org ON public.inventory_units(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_units_product ON public.inventory_units(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_units_status ON public.inventory_units(unit_status);
CREATE INDEX IF NOT EXISTS idx_inventory_units_merchant ON public.inventory_units(merchant_id);

-- Keep updated_at fresh on every write.
CREATE OR REPLACE FUNCTION public.set_inventory_units_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_units_updated_at ON public.inventory_units;
CREATE TRIGGER trg_inventory_units_updated_at
  BEFORE UPDATE ON public.inventory_units
  FOR EACH ROW EXECUTE FUNCTION public.set_inventory_units_updated_at();

ALTER TABLE public.inventory_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view inventory_units" ON public.inventory_units;
CREATE POLICY "view inventory_units" ON public.inventory_units FOR SELECT
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "manage inventory_units" ON public.inventory_units;
CREATE POLICY "manage inventory_units" ON public.inventory_units FOR ALL
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','inventory_manager'))
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','inventory_manager'));

NOTIFY pgrst, 'reload schema';
