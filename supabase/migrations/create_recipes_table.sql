-- Recipes (Bill of Materials) for restaurant and manufacturing use cases
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  -- The inventory item this recipe produces (e.g. a finished menu item or sub-assembly)
  output_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  output_quantity NUMERIC(10, 4) NOT NULL DEFAULT 1,
  output_unit_id UUID REFERENCES public.units_of_measure(id) ON DELETE SET NULL,
  -- Location this recipe belongs to (optional — null means org-wide)
  location_id UUID REFERENCES public.inventory_folders(id) ON DELETE SET NULL,
  -- Restaurant-specific fields
  serving_size TEXT,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (organization_id, name)
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recipes in their organization"
  ON public.recipes FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins and managers can manage recipes"
  ON public.recipes FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager')
  );

COMMENT ON TABLE public.recipes IS 'Recipes / Bills of Materials linking output items to their ingredient inventory items';
