import { createClient } from 'npm:@supabase/supabase-js';
import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
// Inlined corsHeaders definition to resolve module import error
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Full incoming request URL:', req.url);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let requestBody: any = {};
  const contentType = req.headers.get('content-type');
  const contentLength = req.headers.get('content-length');

  const isJsonContentType = contentType && contentType.includes('application/json');
  const isBodyEmpty = contentLength === '0' || contentLength === null || contentLength === undefined;

  if (isJsonContentType) {
    if (isBodyEmpty) {
      console.warn('Edge Function: Received Content-Type: application/json with empty/missing Content-Length. Treating body as empty JSON object.');
      requestBody = {};
    } else {
      try {
        requestBody = await req.json();
        console.log('Edge Function: Successfully parsed request body:', JSON.stringify(requestBody, null, 2));
      } catch (parseError: any) {
        console.error('Edge Function: JSON parse error:', parseError.message);
        return new Response(JSON.stringify({ error: `Failed to parse request data as JSON: ${parseError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
    }
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');
    const realmIdFromUrl = url.searchParams.get('realmId');

    console.log('QuickBooks OAuth Callback: All URL search parameters:', JSON.stringify(Object.fromEntries(url.searchParams.entries()), null, 2));

    let userIdFromState: string | null = null;
    let redirectToFrontend: string | null = null;
    let supabaseAccessTokenFromState: string | null = null; // NEW: Variable to hold Supabase access token from state
    const FALLBACK_CLIENT_APP_BASE_URL = 'https://app.fortressinventory.com'; // CORRECTED: Updated to user's domain

    if (state) {
      try {
        const decodedState = JSON.parse(atob(state));
        userIdFromState = decodedState.userId;
        redirectToFrontend = decodedState.redirectToFrontend;
        supabaseAccessTokenFromState = decodedState.supabaseAccessToken; // NEW: Extract Supabase access token
        console.log('QuickBooks OAuth Callback: Decoded state - userIdFromState:', userIdFromState, 'redirectToFrontend:', redirectToFrontend, 'supabaseAccessTokenFromState:', supabaseAccessTokenFromState ? 'present' : 'missing');
      } catch (e) {
        console.error('Shopify OAuth Callback: Error decoding state parameter:', e);
      }
    }
    const finalRedirectBase = redirectToFrontend || FALLBACK_CLIENT_APP_BASE_URL;

    if (error) {
      console.error('QuickBooks OAuth Error:', error, errorDescription);
      return Response.redirect(`${finalRedirectBase}/integrations?quickbooks_error=${encodeURIComponent(errorDescription || error)}`, 302);
    }

    if (!code || !userIdFromState || !supabaseAccessTokenFromState) { // MODIFIED: supabaseAccessTokenFromState is now required
      console.error('QuickBooks OAuth Callback: Missing authorization code, userIdFromState, or Supabase access token. Code:', code ? 'present' : 'missing', 'UserIdFromState:', userIdFromState ? 'present' : 'missing', 'SupabaseAccessTokenFromState:', supabaseAccessTokenFromState ? 'present' : 'missing');
      return Response.redirect(`${finalRedirectBase}/integrations?quickbooks_error=${encodeURIComponent('Missing authorization code, user ID, or authentication token.')}`, 302);
    }

    // CRITICAL: Ensure realmId is present from the URL. If not, it's a configuration issue.
    if (!realmIdFromUrl) {
      console.error('QuickBooks OAuth Callback: Realm ID is missing from the redirect URL. This is required for API calls.');
      return Response.redirect(`${finalRedirectBase}/integrations?quickbooks_error=${encodeURIComponent('QuickBooks company (realmId) not provided in callback. Please ensure you select a company during authorization and your Intuit app settings are correct.')}`, 302);
    }

    const QUICKBOOKS_CLIENT_ID = Deno.env.get('QUICKBOOKS_CLIENT_ID');
    const QUICKBOOKS_CLIENT_SECRET = Deno.env.get('QUICKBOOKS_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY'); // NEW: Get anon key

    if (!QUICKBOOKS_CLIENT_ID || !QUICKBOOKS_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      console.error('Missing Supabase or QuickBooks environment variables.');
      return Response.redirect(`${finalRedirectBase}/integrations?quickbooks_error=${encodeURIComponent('Server configuration error: Missing environment variables.')}`, 302);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // NEW: Verify the user's token using a client initialized with the anon key and the Supabase access token from state
    const supabaseClientForUserVerification = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${supabaseAccessTokenFromState}`, // NEW: Use Supabase access token from state
          },
        },
      }
    );

    console.log('QuickBooks OAuth Callback: Attempting to verify user with Supabase token from state.');
    const { data: { user: authenticatedUser }, error: authError } = await supabaseClientForUserVerification.auth.getUser();

    if (authError || !authenticatedUser || authenticatedUser.id !== userIdFromState) {
      console.error('QuickBooks OAuth Callback: Authenticated user ID mismatch with state userId or user not found.', authError?.message);
      return Response.redirect(`${finalRedirectBase}/integrations?quickbooks_error=${encodeURIComponent('Authentication mismatch or invalid state. Please try again.')}`, 302);
    }
    console.log('QuickBooks OAuth Callback: Authenticated user ID matched with state userId:', authenticatedUser.id);


    const redirectUri = `https://nojumocxivfjsbqnnkqe.supabase.co/functions/v1/quickbooks-oauth-callback`;
    console.log('Using redirectUri for token exchange:', redirectUri);

    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Basic ${btoa(`${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    const tokenResponseIntuitTid = tokenResponse.headers.get('intuit_tid');
    if (tokenResponseIntuitTid) {
      console.log(`QuickBooks OAuth Callback: Token exchange intuit_tid: ${tokenResponseIntuitTid}`);
    }

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Error exchanging QuickBooks code for tokens:', errorData);
      return Response.redirect(`${finalRedirectBase}/integrations?quickbooks_error=${encodeURIComponent(errorData.error_description || 'Failed to get QuickBooks tokens.')}`, 302);
    }

    const tokens = await tokenResponse.json();
    console.log('QuickBooks OAuth Callback: Full tokens object received:', JSON.stringify(tokens, null, 2));

    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;

    console.log('QuickBooks OAuth Callback: Final Realm ID to be stored:', realmIdFromUrl);

    const { data: updatedProfileData, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        quickbooks_access_token: accessToken,
        quickbooks_refresh_token: refreshToken,
        quickbooks_realm_id: realmIdFromUrl,
      })
      .eq('id', userIdFromState) // Use userIdFromState for the update
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user profile with QuickBooks tokens:', updateError);
      console.error('QuickBooks OAuth Callback: Profile update error details:', JSON.stringify(updateError, null, 2));
      return Response.redirect(`${finalRedirectBase}/integrations?quickbooks_error=${encodeURIComponent('Failed to save QuickBooks tokens.')}`, 302);
    }

    console.log('QuickBooks OAuth Callback: Profile updated successfully. Data returned:', JSON.stringify(updatedProfileData, null, 2));

    console.log('QuickBooks tokens and Realm ID successfully stored for user:', userIdFromState);
    return Response.redirect(`${finalRedirectBase}/integrations?quickbooks_success=true&realmId_present=${!!realmIdFromUrl}`, 302);
  } catch (error: any) {
    console.error('QuickBooks OAuth callback Edge Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});