-- Warehouse serialized units + Phase 2 partners/merchants.
--
-- inventory_units: one row per physical device (e.g. a payment terminal) whose
-- serial number doubles as its barcode. Backbone for per-unit lifecycle status,
-- allocation, demo tracking, and serial audit. inventory_items remains the
-- product/model catalog; each unit references one.
-- partners: ISOs / ISVs. merchants: end customers, each linked to a partner.
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
  -- Intended use / classification of the device, independent of its lifecycle
  -- status and physical folder: production stock vs proof-of-concept vs pending.
  intended_use TEXT NOT NULL DEFAULT 'production'
    CHECK (intended_use IN ('production','poc','pending')),
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
CREATE INDEX IF NOT EXISTS idx_inventory_units_intended_use ON public.inventory_units(intended_use);
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

-- ─── Phase 2: Partners (ISO / ISV) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  partner_type TEXT NOT NULL DEFAULT 'iso' CHECK (partner_type IN ('iso','isv')),
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partners_org ON public.partners(organization_id);

-- ─── Phase 2: Merchants (end customers, linked to a partner) ─────────────────
CREATE TABLE IF NOT EXISTS public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  shipping_address TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid','pending')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_merchants_org ON public.merchants(organization_id);
CREATE INDEX IF NOT EXISTS idx_merchants_partner ON public.merchants(partner_id);

-- Now that merchants exists, point units.merchant_id at it (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_units_merchant_id_fkey') THEN
    ALTER TABLE public.inventory_units
      ADD CONSTRAINT inventory_units_merchant_id_fkey
      FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Shared updated_at trigger for partners & merchants.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_partners_updated_at ON public.partners;
CREATE TRIGGER trg_partners_updated_at BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_merchants_updated_at ON public.merchants;
CREATE TRIGGER trg_merchants_updated_at BEFORE UPDATE ON public.merchants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view partners" ON public.partners;
CREATE POLICY "view partners" ON public.partners FOR SELECT
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "manage partners" ON public.partners;
CREATE POLICY "manage partners" ON public.partners FOR ALL
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','inventory_manager'))
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','inventory_manager'));

DROP POLICY IF EXISTS "view merchants" ON public.merchants;
CREATE POLICY "view merchants" ON public.merchants FOR SELECT
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "manage merchants" ON public.merchants;
CREATE POLICY "manage merchants" ON public.merchants FOR ALL
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','inventory_manager'))
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','inventory_manager'));

NOTIFY pgrst, 'reload schema';
