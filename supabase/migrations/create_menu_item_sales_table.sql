-- Variance Finder (Phase 1): imported menu-item sales (one row per CSV line).
-- pos_item_name is the raw name from the POS export; recipe_id is resolved via
-- pos_item_mappings (nullable until mapped). qty_sold drives theoretical usage.
CREATE TABLE IF NOT EXISTS public.menu_item_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period_id UUID REFERENCES public.variance_periods(id) ON DELETE CASCADE NOT NULL,
  pos_item_name TEXT NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  qty_sold NUMERIC(12, 4) NOT NULL DEFAULT 0,
  sale_date DATE NOT NULL,
  source_filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_menu_item_sales_period ON public.menu_item_sales(period_id);

ALTER TABLE public.menu_item_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view menu item sales in their organization"
  ON public.menu_item_sales FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins and managers can manage menu item sales"
  ON public.menu_item_sales FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager')
  );

COMMENT ON TABLE public.menu_item_sales IS 'Imported menu-item sales rows ({pos_item_name, qty_sold, sale_date}) scoped to a variance period.';
