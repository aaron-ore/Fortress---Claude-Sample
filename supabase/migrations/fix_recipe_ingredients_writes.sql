-- Fix: recipe ingredients not saving.
-- The app inserts into public.recipe_ingredients but the row can be rejected by
-- the database for one of three reasons depending on how the table was first
-- created (app-builder vs. our migration):
--   1) a column the app writes is missing,
--   2) a legacy NOT NULL column (e.g. user_id) the app does not populate,
--   3) the RLS "manage" policy has no explicit WITH CHECK for INSERT.
-- This migration is idempotent and addresses all three.

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

-- 2) Drop NOT NULL on any legacy columns the app does not set, so inserts
--    aren't rejected (e.g. a user_id column from an earlier schema).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recipe_ingredients' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.recipe_ingredients ALTER COLUMN user_id DROP NOT NULL';
  END IF;
END $$;

-- 3) RLS: explicit WITH CHECK so INSERT/UPDATE are permitted for admins/managers.
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view recipe ingredients in their organization" ON public.recipe_ingredients;
CREATE POLICY "Users can view recipe ingredients in their organization"
  ON public.recipe_ingredients FOR SELECT
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins and managers can manage recipe ingredients" ON public.recipe_ingredients;
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
