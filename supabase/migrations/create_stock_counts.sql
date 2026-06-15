-- Simplified Food Cost: dated stock-count snapshots that auto-chain.
-- Replaces the period + beginning/ending model in the UI. Usage between two
-- consecutive counts = previous count + purchases (in the window) - this count.
-- Idempotent; safe to re-run.

CREATE TABLE IF NOT EXISTS public.stock_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  location_id UUID REFERENCES public.inventory_folders(id) ON DELETE SET NULL,
  count_date DATE NOT NULL DEFAULT current_date,
  note TEXT,
  -- Total food sales for the window ending at this count (owner types one number
  -- from their POS/register summary). Enables food cost % with no item mapping.
  sales_total NUMERIC(12,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
-- Safe if the table already existed without the column.
ALTER TABLE public.stock_counts ADD COLUMN IF NOT EXISTS sales_total NUMERIC(12,2);

CREATE TABLE IF NOT EXISTS public.stock_count_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_count_id UUID NOT NULL REFERENCES public.stock_counts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC(12,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_counts_org ON public.stock_counts(organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_lines_count ON public.stock_count_lines(stock_count_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_lines_org ON public.stock_count_lines(organization_id);

ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_count_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view stock_counts" ON public.stock_counts;
CREATE POLICY "view stock_counts" ON public.stock_counts FOR SELECT
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "manage stock_counts" ON public.stock_counts;
CREATE POLICY "manage stock_counts" ON public.stock_counts FOR ALL
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','inventory_manager'))
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','inventory_manager'));

DROP POLICY IF EXISTS "view stock_count_lines" ON public.stock_count_lines;
CREATE POLICY "view stock_count_lines" ON public.stock_count_lines FOR SELECT
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "manage stock_count_lines" ON public.stock_count_lines;
CREATE POLICY "manage stock_count_lines" ON public.stock_count_lines FOR ALL
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','inventory_manager'))
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','inventory_manager'));

NOTIFY pgrst, 'reload schema';
