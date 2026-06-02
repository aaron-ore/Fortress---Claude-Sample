import { createClient } from "npm:@supabase/supabase-js";
import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import DodoPayments from "npm:dodopayments";

// Receives Dodo Payments webhooks (Standard Webhooks spec), verifies the
// signature, and updates the organization's plan / subscription status.
// This is the source of truth for entitlements — never the browser redirect.
//
// IMPORTANT: deploy with JWT verification DISABLED (Dodo does not send a Supabase
// JWT):  supabase functions deploy dodo-webhook --no-verify-jwt
//
// Required function secrets:
//   DODO_API_KEY        - Dodo secret API key
//   DODO_WEBHOOK_SECRET - the webhook signing secret from the Dodo dashboard
//   DODO_ENVIRONMENT    - 'live_mode' (default) or 'test_mode'
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (provided by Supabase)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, webhook-id, webhook-signature, webhook-timestamp",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  // Signature is computed over the RAW body — read text, never parse first.
  const rawBody = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
  };
  const webhookId = headers["webhook-id"];

  if (!webhookId) return new Response("Missing webhook-id", { status: 400, headers: corsHeaders });

  // --- Verify authenticity ---
  const client = new DodoPayments({
    bearerToken: Deno.env.get("DODO_API_KEY") ?? "",
    webhookKey: Deno.env.get("DODO_WEBHOOK_SECRET") ?? "",
    environment: (Deno.env.get("DODO_ENVIRONMENT") ?? "live_mode") as "live_mode" | "test_mode",
  });

  let event: any;
  try {
    event = await client.webhooks.unwrap(rawBody, { headers });
  } catch (err: any) {
    console.error("Dodo webhook signature verification failed:", err?.message || err);
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // --- Idempotency: claim this webhook id; a conflict means we already handled it ---
  const { error: claimError } = await supabaseAdmin
    .from("dodo_webhook_events")
    .insert({ webhook_id: webhookId, event_type: event?.type ?? null });

  if (claimError) {
    console.log(`Duplicate Dodo webhook ${webhookId} ignored.`);
    return new Response("ok (duplicate)", { status: 200, headers: corsHeaders });
  }

  try {
    const data = event?.data ?? {};
    const metadata = data.metadata ?? {};
    const subscriptionId: string | undefined = data.subscription_id;
    const customerId: string | undefined = data.customer?.customer_id ?? data.customer_id;
    const planId: string | undefined = metadata.plan_id;

    // Resolve the organization: prefer metadata, fall back to subscription id.
    let orgId: string | undefined = metadata.organization_id;
    if (!orgId && subscriptionId) {
      const { data: orgRow } = await supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("dodo_subscription_id", subscriptionId)
        .maybeSingle();
      orgId = orgRow?.id;
    }

    if (orgId) {
      const updates: Record<string, unknown> = {};

      switch (event?.type) {
        case "subscription.active":
        case "subscription.renewed":
          if (planId) updates.plan = planId;
          updates.subscription_status = "active";
          if (subscriptionId) updates.dodo_subscription_id = subscriptionId;
          if (customerId) updates.dodo_customer_id = customerId;
          break;

        case "subscription.on_hold":
          updates.subscription_status = "on_hold";
          break;

        case "subscription.cancelled":
        case "subscription.expired":
        case "subscription.failed":
          updates.subscription_status = event.type.split(".")[1];
          updates.plan = "free";
          break;

        default:
          // payment.succeeded / payment.failed and others: no entitlement change here.
          break;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from("organizations")
          .update(updates)
          .eq("id", orgId);
        if (updateError) throw updateError;
      }

      // Backfill org id onto the event log for traceability.
      await supabaseAdmin
        .from("dodo_webhook_events")
        .update({ organization_id: orgId })
        .eq("webhook_id", webhookId);
    } else {
      console.warn(`Dodo webhook ${event?.type} (${webhookId}) had no resolvable organization.`);
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("Dodo webhook processing error:", err?.message || err);
    // Release the idempotency claim so Dodo's retry can reprocess this event.
    await supabaseAdmin.from("dodo_webhook_events").delete().eq("webhook_id", webhookId);
    return new Response("processing error", { status: 500, headers: corsHeaders });
  }
});
