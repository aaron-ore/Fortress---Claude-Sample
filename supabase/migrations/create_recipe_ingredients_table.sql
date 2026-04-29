-- Ingredients for each recipe (each row = one ingredient line)
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  -- Fallback name for ingredients not yet in inventory
  ingredient_name TEXT NOT NULL,
  quantity NUMERIC(10, 4) NOT NULL DEFAULT 0,
  unit_id UUID REFERENCES public.units_of_measure(id) ON DELETE SET NULL,
  unit_name TEXT, -- denormalized for display if unit_id is null
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recipe ingredients in their organization"
  ON public.recipe_ingredients FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins and managers can manage recipe ingredients"
  ON public.recipe_ingredients FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager')
  );

COMMENT ON TABLE public.recipe_ingredients IS 'Ingredient lines for each recipe, linked to inventory items';
