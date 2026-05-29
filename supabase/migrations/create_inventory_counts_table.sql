-- Variance Finder (Phase 1): physical counts per item per period.
-- Two count_types per period: 'beginning' and 'ending'. counted_qty is ALWAYS
-- expressed in the inventory item's canonical usage unit (inventory_items.usage_unit_id).
CREATE TABLE IF NOT EXISTS public.inventory_counts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period_id UUID REFERENCES public.variance_periods(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.inventory_folders(id) ON DELETE CASCADE NOT NULL,
  count_type TEXT NOT NULL CHECK (count_type IN ('beginning', 'ending')),
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  counted_qty NUMERIC(12, 4) NOT NULL DEFAULT 0,
  counted_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (period_id, count_type, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_counts_period ON public.inventory_counts(period_id);

ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inventory counts in their organization"
  ON public.inventory_counts FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins and managers can manage inventory counts"
  ON public.inventory_counts FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager')
  );

COMMENT ON TABLE public.inventory_counts IS 'Beginning/ending physical counts per item per variance period, in the item canonical usage unit.';
