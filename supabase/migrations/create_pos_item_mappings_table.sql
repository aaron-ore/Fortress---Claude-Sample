-- Variance Finder (Phase 1): saved POS-name -> recipe (menu item) mappings.
-- Persisted so future imports auto-resolve. Matching uses deterministic fuzzy
-- string matching (Levenshtein) in the app — never an LLM.
CREATE TABLE IF NOT EXISTS public.pos_item_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pos_item_name TEXT NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  match_method TEXT NOT NULL DEFAULT 'manual' CHECK (match_method IN ('exact', 'fuzzy', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (organization_id, pos_item_name)
);

ALTER TABLE public.pos_item_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view POS mappings in their organization"
  ON public.pos_item_mappings FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins and managers can manage POS mappings"
  ON public.pos_item_mappings FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'inventory_manager')
  );

COMMENT ON TABLE public.pos_item_mappings IS 'Saved POS item name -> recipe mappings (one per org per name), used to resolve imported sales to menu items.';
