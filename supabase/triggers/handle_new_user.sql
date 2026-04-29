CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_organization_id UUID;
  v_company_code TEXT;
  v_full_name TEXT;
  v_user_role TEXT;
  v_org_name TEXT;
  v_email TEXT;
  v_plan TEXT; -- NEW: Declare v_plan
BEGIN
  -- Extract data from raw_user_meta_data, which is populated by OAuth providers
  v_company_code := new.raw_user_meta_data ->> 'company_code';
  v_full_name := COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'); -- 'name' for some OAuth providers
  v_email := COALESCE(new.raw_user_meta_data ->> 'email', new.email); -- 'email' for some OAuth providers
  v_user_role := COALESCE(new.raw_user_meta_data ->> 'role', 'viewer'); -- Default to 'viewer' if not specified
  v_plan := new.raw_user_meta_data ->> 'plan'; -- NEW: Extract plan from metadata

  -- If a company code is provided, try to find the organization
  IF v_company_code IS NOT NULL AND v_company_code != '' THEN
    SELECT id INTO v_organization_id FROM public.organizations WHERE unique_code = v_company_code LIMIT 1;

    IF v_organization_id IS NULL THEN
      RAISE EXCEPTION 'Invalid company code provided: %', v_company_code;
    END IF;
  ELSE
    -- No company code provided, create a new organization for this user
    v_org_name := COALESCE(v_full_name, v_email) || '''s Organization';
    INSERT INTO public.organizations (name, plan, unique_code, default_theme)
    VALUES (v_org_name, COALESCE(v_plan, 'free'), gen_random_uuid()::TEXT, 'tropical-indigo')
    RETURNING id INTO v_organization_id;

    -- For a newly created organization, the first user is always an admin
    v_user_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, full_name, organization_id, role, email, phone, address, has_onboarding_wizard_completed)
  VALUES (
    new.id,
    v_full_name,
    v_organization_id,
    v_user_role,
    v_email,
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'address',
    FALSE -- Set to FALSE for new users
  );
  RETURN new;
END;
$$;