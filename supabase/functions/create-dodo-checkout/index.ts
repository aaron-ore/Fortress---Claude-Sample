import { createClient } from "npm:@supabase/supabase-js";
import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import DodoPayments from "npm:dodopayments";

// Creates a Dodo Payments hosted checkout session for a subscription plan and
// returns its checkout_url. The Dodo secret key never leaves the server.
//
// Required function secrets:
//   DODO_API_KEY               - Dodo Payments secret API key
//   DODO_ENVIRONMENT           - 'live_mode' (default) or 'test_mode'
//   DODO_PRODUCT_ID_STANDARD_MONTHLY
//   DODO_PRODUCT_ID_STANDARD_ANNUAL
//   DODO_PRODUCT_ID_PRO_MONTHLY
//   DODO_PRODUCT_ID_PRO_ANNUAL
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (provided by Supabase)
//
// Optional:
//   DODO_FIRST_MONTH_DISCOUNT_CODE - a Dodo discount code (configured in the Dodo
//     dashboard to reduce the FIRST billing cycle to $1). Auto-applied for
//     first-time subscribers only (orgs without an existing Dodo customer id).
//     If unset, customers are simply charged the normal price.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

// plan id + billing cycle -> configured Dodo product id
const resolveProductId = (planId: string, cycle: "monthly" | "annual"): string | null => {
  const key = `DODO_PRODUCT_ID_${planId.toUpperCase()}_${cycle.toUpperCase()}`;
  const value = Deno.env.get(key);
  return value && value.trim() !== "" ? value.trim() : null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const { planId, billingCycle, returnUrl } = await req.json().catch(() => ({}));
    if (!planId || typeof planId !== "string") {
      return json({ error: "planId is required." }, 400);
    }
    const cycle: "monthly" | "annual" = billingCycle === "annually" || billingCycle === "annual" ? "annual" : "monthly";

    // --- Authenticate the caller and resolve their organization ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized: missing Authorization header." }, 401);
    const token = authHeader.split(" ")[1];

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized: invalid session." }, 401);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, role, organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return json({ error: "No organization found for this user." }, 400);
    }
    if (!["admin", "inventory_manager"].includes(profile.role)) {
      return json({ error: "Forbidden: only admins or managers can manage billing." }, 403);
    }

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id, name, dodo_customer_id")
      .eq("id", profile.organization_id)
      .single();

    // --- Map the plan to a Dodo product ---
    const productId = resolveProductId(planId, cycle);
    if (!productId) {
      return json({ error: `No Dodo product configured for plan "${planId}" (${cycle}).` }, 400);
    }

    // --- Create the checkout session ---
    const client = new DodoPayments({
      bearerToken: Deno.env.get("DODO_API_KEY") ?? "",
      environment: (Deno.env.get("DODO_ENVIRONMENT") ?? "live_mode") as "live_mode" | "test_mode",
    });

    // Reuse the existing Dodo customer if we have one; otherwise pass new-customer details.
    const isNewSubscriber = !org?.dodo_customer_id;
    const customer = isNewSubscriber
      ? { email: profile.email, name: profile.full_name || org?.name || profile.email }
      : { customer_id: org.dodo_customer_id };

    // First-month $1 promo: only for first-time subscribers, only if configured.
    const firstMonthDiscount = Deno.env.get("DODO_FIRST_MONTH_DISCOUNT_CODE")?.trim();
    const discountCode = isNewSubscriber && firstMonthDiscount ? firstMonthDiscount : undefined;

    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer,
      return_url: returnUrl || undefined,
      ...(discountCode ? { discount_code: discountCode } : {}),
      // Echoed back on every webhook so we can reconcile without a lookup.
      metadata: {
        organization_id: String(profile.organization_id),
        user_id: String(profile.id),
        plan_id: planId,
        billing_cycle: cycle,
      },
    });

    return json({ checkout_url: session.checkout_url, session_id: session.session_id }, 200);
  } catch (error: any) {
    console.error("create-dodo-checkout error:", error?.message || error);
    return json({ error: error?.message ?? "Failed to create checkout session." }, 400);
  }
});
