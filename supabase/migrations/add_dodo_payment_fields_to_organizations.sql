-- Dodo Payments: restore org billing columns to Dodo, add subscription status,
-- and add a webhook idempotency log.
--
-- The billing columns on `organizations` were originally created as dodo_* and
-- later renamed to lemon_squeezy_*. This migration renames them back (or creates
-- them if neither name exists) so the app is single-sourced on Dodo Payments.

DO $$
BEGIN
  -- customer id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations'
      AND column_name = 'lemon_squeezy_customer_id'
  ) THEN
    ALTER TABLE public.organizations RENAME COLUMN lemon_squeezy_customer_id TO dodo_customer_id;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations'
      AND column_name = 'dodo_customer_id'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN dodo_customer_id TEXT;
  END IF;

  -- subscription id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations'
      AND column_name = 'lemon_squeezy_subscription_id'
  ) THEN
    ALTER TABLE public.organizations RENAME COLUMN lemon_squeezy_subscription_id TO dodo_subscription_id;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations'
      AND column_name = 'dodo_subscription_id'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN dodo_subscription_id TEXT;
  END IF;
END $$;

-- Latest subscription lifecycle status from Dodo webhooks.
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT;

COMMENT ON COLUMN public.organizations.dodo_customer_id IS 'Dodo Payments customer id for this organization.';
COMMENT ON COLUMN public.organizations.dodo_subscription_id IS 'Dodo Payments active subscription id for this organization.';
COMMENT ON COLUMN public.organizations.subscription_status IS 'Latest Dodo subscription status: active, on_hold, cancelled, expired, failed.';

-- Lookups by subscription id (used when a webhook arrives without metadata).
CREATE INDEX IF NOT EXISTS idx_organizations_dodo_subscription_id
  ON public.organizations (dodo_subscription_id);

-- Idempotency log: Standard Webhooks `webhook-id` is unique per delivered event.
-- A row here means the event was already fully processed.
CREATE TABLE IF NOT EXISTS public.dodo_webhook_events (
  webhook_id TEXT PRIMARY KEY,
  event_type TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Only the service role (used by the webhook edge function) touches this table.
-- RLS is enabled with no policies, so anon/authenticated clients get nothing.
ALTER TABLE public.dodo_webhook_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.dodo_webhook_events IS 'Processed Dodo webhook ids for idempotent webhook handling. Written only by the service role.';
