-- Variance Finder (Phase 1): a variance period anchors all four inputs
-- (purchases, counts, sales, recipes) to a single location + date range.
CREATE TABLE IF NOT EXISTS public.variance_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.inventory_folders(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CHECK (end_date >= start_date)
);

ALTER TABLE public.variance_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view variance periods in their organization"
  ON public.variance_periods FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins and managers can manage variance periods"
  ON public.variance_periods FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager')
  );

COMMENT ON TABLE public.variance_periods IS 'Food-cost variance periods: a location + date range that scopes sales, counts, and purchases.';
