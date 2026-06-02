-- =====================================================================
-- Fortress — consolidated schema sync (restaurant variance pivot)
--
-- Idempotent. Run once in the Supabase SQL Editor to bring a live database
-- in sync with what the app expects. Safe to re-run; every statement uses
-- IF NOT EXISTS / DROP POLICY IF EXISTS, so you do not need to track what is
-- already applied.
--
-- Assumes the uuid-ossp extension is enabled (existing tables use
-- uuid_generate_v4()). If needed: create extension if not exists "uuid-ossp";
-- =====================================================================

-- 0) Core restaurant tables: units_of_measure, recipes, recipe_ingredients.
--    These predate the variance pivot and have drifted on live databases
--    (older copies are missing columns the app now reads/writes, which makes
--    PostgREST return 400 on inserts/filters). We CREATE IF NOT EXISTS the full
--    shape AND additively ADD COLUMN IF NOT EXISTS every column, so a missing OR
--    partial table both end up correct. Created before sections 5–8, which FK to
--    recipes.

-- 0a) units_of_measure
CREATE TABLE IF NOT EXISTS public.units_of_measure (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'count' CHECK (category IN ('weight','volume','count','length','area')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
ALTER TABLE public.units_of_measure
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS abbreviation TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
-- unique (organization_id, name) used by default-unit seeding upsert
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'units_of_measure_org_name_key') THEN
    ALTER TABLE public.units_of_measure ADD CONSTRAINT units_of_measure_org_name_key UNIQUE (organization_id, name);
  END IF;
END $$;
ALTER TABLE public.units_of_measure ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view UOM in their organization" ON public.units_of_measure;
CREATE POLICY "Users can view UOM in their organization" ON public.units_of_measure
  FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Admins and managers can manage UOM" ON public.units_of_measure;
CREATE POLICY "Admins and managers can manage UOM" ON public.units_of_measure
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','inventory_manager'));

-- 0b) recipes
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS output_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS output_quantity NUMERIC(10,4) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS output_unit_id UUID REFERENCES public.units_of_measure(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.inventory_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS serving_size TEXT,
  ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS cook_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recipes_org_name_key') THEN
    ALTER TABLE public.recipes ADD CONSTRAINT recipes_org_name_key UNIQUE (organization_id, name);
  END IF;
END $$;
-- Legacy app-builder column: recipes.yield_quantity was NOT NULL with no default,
-- but the app writes output_quantity instead, so inserts failed with a null
-- violation. Relax it (it's a dead duplicate of output_quantity).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='recipes' AND column_name='yield_quantity') THEN
    ALTER TABLE public.recipes ALTER COLUMN yield_quantity DROP NOT NULL;
    ALTER TABLE public.recipes ALTER COLUMN yield_quantity SET DEFAULT 1;
  END IF;
END $$;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view recipes in their organization" ON public.recipes;
CREATE POLICY "Users can view recipes in their organization" ON public.recipes
  FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Admins and managers can manage recipes" ON public.recipes;
CREATE POLICY "Admins and managers can manage recipes" ON public.recipes
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','inventory_manager'));

-- 0c) recipe_ingredients
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  ingredient_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
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
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_org ON public.recipe_ingredients(organization_id);
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view recipe ingredients in their organization" ON public.recipe_ingredients;
CREATE POLICY "Users can view recipe ingredients in their organization" ON public.recipe_ingredients
  FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Admins and managers can manage recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Admins and managers can manage recipe ingredients" ON public.recipe_ingredients
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','inventory_manager'));

-- 1) inventory_folders: location type + metadata  (enables restaurant locations)
ALTER TABLE public.inventory_folders
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'warehouse'
    CHECK (type IN ('warehouse','restaurant','generic')),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS manager_name TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
UPDATE public.inventory_folders SET type = 'warehouse' WHERE type IS NULL OR type = '';

-- 2) units_of_measure: category used by the app's sort/filter (+ safe defaults
--    on legacy conversion columns so seeding units works)
ALTER TABLE public.units_of_measure
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'count'
    CHECK (category IN ('weight','volume','count','length','area'));
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='units_of_measure' AND column_name='base_unit_factor')
  THEN ALTER TABLE public.units_of_measure ALTER COLUMN base_unit_factor SET DEFAULT 1; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='units_of_measure' AND column_name='is_base_unit')
  THEN ALTER TABLE public.units_of_measure ALTER COLUMN is_base_unit SET DEFAULT false; END IF;
END $$;

-- 3) inventory_items.usage_unit_id  (unit_cost is the cost per this unit)
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS usage_unit_id UUID REFERENCES public.units_of_measure(id) ON DELETE SET NULL;

-- 4) orders.location_id  (attributes purchases to a location/period)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.inventory_folders(id) ON DELETE SET NULL;

-- 5) variance_periods
CREATE TABLE IF NOT EXISTS public.variance_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.inventory_folders(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CHECK (end_date >= start_date)
);
ALTER TABLE public.variance_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view variance periods in their organization" ON public.variance_periods;
CREATE POLICY "Users can view variance periods in their organization" ON public.variance_periods
  FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Admins and managers can manage variance periods" ON public.variance_periods;
CREATE POLICY "Admins and managers can manage variance periods" ON public.variance_periods
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','inventory_manager'));

-- 6) menu_item_sales
CREATE TABLE IF NOT EXISTS public.menu_item_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period_id UUID REFERENCES public.variance_periods(id) ON DELETE CASCADE NOT NULL,
  pos_item_name TEXT NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  qty_sold NUMERIC(12,4) NOT NULL DEFAULT 0,
  sale_date DATE NOT NULL,
  source_filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_menu_item_sales_period ON public.menu_item_sales(period_id);
ALTER TABLE public.menu_item_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view menu item sales in their organization" ON public.menu_item_sales;
CREATE POLICY "Users can view menu item sales in their organization" ON public.menu_item_sales
  FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Admins and managers can manage menu item sales" ON public.menu_item_sales;
CREATE POLICY "Admins and managers can manage menu item sales" ON public.menu_item_sales
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','inventory_manager'));

-- 7) pos_item_mappings
CREATE TABLE IF NOT EXISTS public.pos_item_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pos_item_name TEXT NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  match_method TEXT NOT NULL DEFAULT 'manual' CHECK (match_method IN ('exact','fuzzy','manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (organization_id, pos_item_name)
);
ALTER TABLE public.pos_item_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view POS mappings in their organization" ON public.pos_item_mappings;
CREATE POLICY "Users can view POS mappings in their organization" ON public.pos_item_mappings
  FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Admins and managers can manage POS mappings" ON public.pos_item_mappings;
CREATE POLICY "Admins and managers can manage POS mappings" ON public.pos_item_mappings
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','inventory_manager'));

-- 8) inventory_counts
CREATE TABLE IF NOT EXISTS public.inventory_counts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period_id UUID REFERENCES public.variance_periods(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.inventory_folders(id) ON DELETE CASCADE NOT NULL,
  count_type TEXT NOT NULL CHECK (count_type IN ('beginning','ending')),
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  counted_qty NUMERIC(12,4) NOT NULL DEFAULT 0,
  counted_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (period_id, count_type, inventory_item_id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_period ON public.inventory_counts(period_id);
ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view inventory counts in their organization" ON public.inventory_counts;
CREATE POLICY "Users can view inventory counts in their organization" ON public.inventory_counts
  FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Admins and managers can manage inventory counts" ON public.inventory_counts;
CREATE POLICY "Admins and managers can manage inventory counts" ON public.inventory_counts
  FOR ALL USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin','inventory_manager'));

-- Refresh the PostgREST schema cache so new tables/columns are visible immediately
NOTIFY pgrst, 'reload schema';
