-- Per-location par levels: minimum stock a location should hold for each item
-- Used primarily for restaurant locations to trigger replenishment from warehouse
CREATE TABLE IF NOT EXISTS public.location_par_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.inventory_folders(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  par_level NUMERIC(10, 4) NOT NULL DEFAULT 0,
  unit_id UUID REFERENCES public.units_of_measure(id) ON DELETE SET NULL,
  unit_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (location_id, inventory_item_id)
);

ALTER TABLE public.location_par_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view par levels in their organization"
  ON public.location_par_levels FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins and managers can manage par levels"
  ON public.location_par_levels FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager')
  );

COMMENT ON TABLE public.location_par_levels IS 'Minimum stock levels per location per item, for replenishment triggers';
