-- Fix: recipe ingredients not saving.
-- The row is rejected at the database (recipes save with the same RLS, and the
-- app sends the insert correctly). This idempotent script removes every cause:
--   1) a column the app writes is missing,
--   2) a legacy NOT NULL column (e.g. user_id) the app does not populate,
--   3) a leftover/restrictive RLS policy (from an app-builder) that blocks INSERT,
--   4) the manage policy lacking an explicit WITH CHECK.

-- 1) Ensure every column the app writes exists.
ALTER TABLE public.recipe_ingredients
  ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ingredient_name TEXT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(10,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units_of_measure(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_name TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- 2) Drop NOT NULL on any legacy column the app does not set (e.g. user_id).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recipe_ingredients' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.recipe_ingredients ALTER COLUMN user_id DROP NOT NULL';
  END IF;
END $$;

-- 3) Remove EVERY existing policy on the table (clears any leftover restrictive
--    policy that could be silently blocking inserts).
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'recipe_ingredients'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.recipe_ingredients', pol.policyname);
  END LOOP;
END $$;

-- 4) Recreate clean, permissive policies with an explicit WITH CHECK.
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recipe ingredients in their organization"
  ON public.recipe_ingredients FOR SELECT
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins and managers can manage recipe ingredients"
  ON public.recipe_ingredients FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager')
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager')
  );

-- ── Diagnostic (run separately AFTER trying to create a recipe with ingredients) ──
-- Tells us definitively whether rows are being written:
--   SELECT id, recipe_id, ingredient_name, quantity, created_at
--   FROM public.recipe_ingredients ORDER BY created_at DESC LIMIT 10;
