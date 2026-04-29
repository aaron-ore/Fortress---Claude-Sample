"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plug, CheckCircle, RefreshCw, Loader2, MapPin, Link as LinkIcon, Trash2, Edit, Hourglass, ExternalLink } from "lucide-react";
import { useProfile } from "@/context/ProfileContext";
import { showError, showSuccess, showInfo } from "@/utils/toast"; // Added showInfo
import { supabase } from "@/lib/supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { useOnboarding } from "@/context/OnboardingContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Label } from "@/components/ui/label";
import { hasRequiredPlan } from "@/utils/planUtils";
import ShopifyStoreUrlDialog from "@/components/integrations/ShopifyStoreUrlDialog";
import { useAuth } from "@/context/AuthContext";

interface ShopifyLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  country: string;
  active: boolean;
}

interface ShopifyLocationMapping {
  id: string;
  organization_id: string;
  shopify_location_id: string;
  shopify_location_name: string;
  fortress_location_id: string;
  user_id: string;
  created_at: string;
}

const SHOPIFY_CLIENT_ID = "8496dff0a4396a6baeede4ce7f17902f";

const Integrations: React.FC = () => {
  const { profile, isLoadingProfile, fetchProfile } = useProfile();
  const { session } = useAuth();
  const { inventoryFolders, fetchInventoryFolders } = useOnboarding();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();

  const [quickbooksClientId, setQuickbooksClientId] = useState<string | null>(null);
  const [quickbooksEnvironment, setQuickbooksEnvironment] = useState<string | null>(null);
  const [isFetchingQuickbooksClientId, setIsFetchingQuickbooksClientId] = useState(true);
  const [isSyncingQuickBooks, setIsSyncingQuickBooks] = useState(false);
  const [isSyncingShopify, setIsSyncingShopify] = useState(false);

  const [shopifyLocations, setShopifyLocations] = useState<ShopifyLocation[]>([]);
  const [shopifyMappings, setShopifyMappings] = useState<ShopifyLocationMapping[]>([]);
  const [isFetchingShopifyLocations, setIsFetchingShopifyLocations] = useState(false);
  const [isFetchingShopifyMappings, setIsFetchingShopifyMappings] = useState(false);
  const [isSavingMapping, setIsSavingMapping] = useState(false);
  const [isDeletingMapping, setIsDeletingMapping] = useState(false);

  const [selectedShopifyLocationId, setSelectedShopifyLocationId] = useState<string | null>(null);
  const [selectedFortressFolderId, setSelectedFortressFolderId] = useState<string | null>(null);
  const [mappingToEdit, setMappingToEdit] = useState<ShopifyLocationMapping | null>(null);
  const [mappingToDelete, setMappingToDelete] = useState<ShopifyLocationMapping | null>(null);
  const [isConfirmDeleteMappingOpen, setIsConfirmDeleteMappingOpen] = useState(false);

  const [isShopifyStoreUrlDialogOpen, setIsShopifyStoreUrlDialogOpen] = useState(false);

  const qbCallbackProcessedRef = React.useRef(false);
  const shopifyCallbackProcessedRef = React.useRef(false);

  const shopifyLogoSrc = theme === 'dark' || theme === 'emerald' || theme === 'deep-forest'
    ? "/shopify_logo_white.png"
    : "/shopify_logo_black.png";

  const fetchQuickbooksClientId = useCallback(async () => {
    if (!profile?.id) {
      setIsFetchingQuickbooksClientId(false);
      return;
    }
    setIsFetchingQuickbooksClientId(true);
    try {
      const { data: sessionData, error: _sessionError } = await supabase.auth.getSession();
      if (_sessionError || !sessionData.session) {
        throw new Error("Authentication session expired. Please log in again.");
      }

      const { data, error } = await supabase.functions.invoke('get-quickbooks-client-id', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setQuickbooksClientId(data.clientId);
      setQuickbooksEnvironment(data.environment);
    } catch (error: any) {
      console.error("Error fetching QuickBooks Client ID:", error);
      showError(`Failed to load QuickBooks integration: ${error.message}`);
      setQuickbooksClientId(null);
      setQuickbooksEnvironment(null);
    } finally {
      setIsFetchingQuickbooksClientId(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const quickbooksSuccess = params.get('quickbooks_success');
    const quickbooksError = params.get('quickbooks_error');
    const shopifySuccess = params.get('shopify_success');
    const shopifyError = params.get('shopify_error');
    const lemonSqueezyCheckoutStatus = params.get('lemon_squeezy_checkout_status');

    if ((quickbooksSuccess || quickbooksError) && !qbCallbackProcessedRef.current) {
      if (quickbooksSuccess) {
        showSuccess("QuickBooks connected!");
      } else if (quickbooksError) {
        showError(`QuickBooks connection failed: ${quickbooksError}`);
      }
      qbCallbackProcessedRef.current = true;
      navigate('/integrations', { replace: true });
    }

    if ((shopifySuccess || shopifyError) && !shopifyCallbackProcessedRef.current) {
      if (shopifySuccess) {
        showSuccess("Shopify connected!");
      } else if (shopifyError) {
        showError(`Shopify connection failed: ${shopifyError}`);
      }
      shopifyCallbackProcessedRef.current = true;
      navigate(location.pathname, { replace: true });
    }

    if (lemonSqueezyCheckoutStatus) {
      if (lemonSqueezyCheckoutStatus === 'completed') {
        showSuccess("Lemon Squeezy checkout completed!");
      } else if (lemonSqueezyCheckoutStatus === 'cancelled') {
        showError("Lemon Squeezy checkout cancelled.");
      } else {
        showInfo(`Lemon Squeezy checkout status: ${lemonSqueezyCheckoutStatus}`);
      }
      const newSearchParams = new URLSearchParams(params);
      newSearchParams.delete('lemon_squeezy_checkout_status');
      newSearchParams.delete('organization_id');
      newSearchParams.delete('user_id');
      navigate({ search: newSearchParams.toString() }, { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

  useEffect(() => {
    if (!isLoadingProfile && profile?.organizationId) {
      fetchInventoryFolders();
      fetchShopifyLocationMappings();
      fetchQuickbooksClientId();
    }
  }, [isLoadingProfile, profile?.organizationId, fetchInventoryFolders, fetchQuickbooksClientId]);

  const canAccessQuickBooks = hasRequiredPlan(profile?.companyProfile?.plan, 'premium');
  const canAccessShopify = hasRequiredPlan(profile?.companyProfile?.plan, 'premium');

  const handleConnectQuickBooks = () => {
    if (!canAccessQuickBooks) {
      showError("QuickBooks integration is a Premium/Enterprise feature. Please upgrade your plan.");
      return;
    }
    if (!profile?.id) {
      showError("You must be logged in to connect to QuickBooks.");
      return;
    }
    if (!quickbooksClientId) {
      showError("QuickBooks Client ID is not available. Please try again in a moment.");
      return;
    }
    if (!session?.access_token) {
      showError("Your session has expired. Please log in again.");
      return;
    }

    const redirectUri = `https://nojumocxivfjsbqnnkqe.supabase.co/functions/v1/quickbooks-oauth-callback`;
    
    const scope = "com.intuit.quickbooks.accounting openid profile email address phone";
    const responseType = "code";
    
    const statePayload = {
      userId: profile.id,
      redirectToFrontend: window.location.origin,
      supabaseAccessToken: session.access_token,
    };
    const encodedState = btoa(JSON.stringify(statePayload));

    const authUrl = `https://appcenter.intuit.com/app/connect/oauth2?client_id=${quickbooksClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=${responseType}&state=${encodedState}`;
    
    window.location.href = authUrl;
  };

  const handleDisconnectQuickBooks = async () => {
    if (!profile?.quickbooksAccessToken) {
      showError("Not connected to QuickBooks.");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ quickbooks_access_token: null, quickbooks_refresh_token: null, quickbooks_realm_id: null })
        .eq('id', profile.id);
      
      if (updateError) throw updateError;

      await fetchProfile();
      showSuccess("Disconnected from QuickBooks.");
    } catch (error: any) {
      console.error("Error disconnecting QuickBooks:", error);
      showError(`Failed to disconnect from QuickBooks: ${error.message}`);
    }
  };

  const handleGoToQuickBooksAccount = () => {
    if (!quickbooksEnvironment) {
      showError("QuickBooks environment not loaded. Please try again.");
      return;
    }
    const qbHomepageUrl = quickbooksEnvironment === 'production'
      ? 'https://app.qbo.intuit.com/app/homepage'
      : 'https://sandbox.qbo.intuit.com/app/homepage';
    window.open(qbHomepageUrl, '_blank');
  };

  const handleSyncSalesOrders = async () => {
    if (!canAccessQuickBooks) {
      showError("QuickBooks integration is a Premium/Enterprise feature. Please upgrade your plan.");
      return;
    }
    if (!profile?.quickbooksAccessToken || !profile?.quickbooksRealmId) {
      showError("QuickBooks not fully connected.");
      return;
    }
    setIsSyncingQuickBooks(true);
    try {
      const { data: sessionData, error: _sessionError } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        showError("Login required to sync QuickBooks.");
        return;
      }

      const { data, error } = await supabase.functions.invoke('sync-sales-orders-to-quickbooks', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      showSuccess(data.message || "Sales orders synced!");
      console.log("QuickBooks Sync Results:", data.results);
      await fetchProfile();
    } catch (error: any) {
      console.error("Error syncing sales orders to QuickBooks:", error);
      showError(`Failed to sync sales orders: ${error.message}`);
    } finally {
      setIsSyncingQuickBooks(false);
    }
  };

  const isAdmin = profile?.role === 'admin';

  const initiateShopifyOAuth = async (shopifyStoreName: string) => {
    if (isLoadingProfile) {
      showError("Profile is still loading. Please wait a moment.");
      return;
    }
    if (!profile?.id) {
      showError("You must be logged in to connect to Shopify.");
      console.error("[Shopify OAuth] Profile ID missing.");
      return;
    }

    const { data: { session: supabaseSession } } = await supabase.auth.getSession();
    if (!supabaseSession) {
      showError("Your session has expired. Please log in again.");
      return;
    }

    const clientId = SHOPIFY_CLIENT_ID;

    if (!clientId) {
      showError("Shopify Client ID is not configured. Please contact support.");
      console.error("[Shopify OAuth] Shopify Client ID is missing.");
      return;
    }

    const redirectUri = `https://nojumocxivfjsbqnnkqe.supabase.co/functions/v1/shopify-oauth-callback`;
    
    const scopes = [
      "read_products",
      "write_products",
      "read_orders",
      "write_orders",
      "read_customers",
      "write_customers",
      "read_fulfillments",
      "write_fulfillments",
      "read_inventory",
      "write_inventory",
      "read_locations",
    ];
    const scope = scopes.join(',');
    
    const statePayload = {
      userId: profile.id,
      redirectToFrontend: window.location.origin,
      supabaseAccessToken: supabaseSession.access_token,
    };
    const encodedState = btoa(JSON.stringify(statePayload));

    const authUrl = `https://${shopifyStoreName}/admin/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodedState}`;
    
    console.log("[Shopify OAuth] Generated Shopify Auth URL:", authUrl);
    window.open(authUrl, '_blank');
  };

  const handleConnectShopify = () => {
    if (!canAccessShopify) {
      showError("Shopify integration is a Premium/Enterprise feature. Please upgrade your plan.");
      return;
    }
    setIsShopifyStoreUrlDialogOpen(true);
  };

  const handleDisconnectShopify = async () => {
    if (!profile?.organizationId || !profile?.companyProfile?.shopifyAccessToken) {
      showError("Not connected to Shopify.");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ shopify_access_token: null, shopify_refresh_token: null, shopify_store_name: null })
        .eq('id', profile.organizationId);
      
      if (updateError) throw updateError;

      await fetchProfile();
      showSuccess("Disconnected from Shopify.");
      setShopifyLocations([]);
      setShopifyMappings([]);
    } catch (error: any) {
      console.error("Error disconnecting Shopify:", error);
      showError(`Failed to disconnect from Shopify: ${error.message}`);
    }
  };

  const handleSyncShopifyProducts = async () => {
    if (!canAccessShopify) {
      showError("Shopify integration is a Premium/Enterprise feature. Please upgrade your plan.");
      return;
    }
    if (!profile?.companyProfile?.shopifyAccessToken || !profile?.companyProfile?.shopifyStoreName) {
      showError("Shopify not connected. Please connect your Shopify store first.");
      return;
      }
    setIsSyncingShopify(true);
    try {
      const { data: sessionData, error: _sessionError } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        showError("You must be logged in to sync with Shopify.");
        return;
      }

      const { data, error } = await supabase.functions.invoke('sync-shopify-data', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      showSuccess(data.message || "Shopify products synced!");
      console.log("Shopify Product Sync Results:", data.results);
      await fetchProfile();
    } catch (error: any) {
      console.error("Error syncing Shopify products:", error);
      showError(`Failed to sync Shopify products: ${error.message}`);
    } finally {
      setIsSyncingShopify(false);
    }
  };

  const fetchShopifyLocations = async () => {
    console.log("[Integrations] fetchShopifyLocations called.");
    console.log("[Integrations] Current profile.companyProfile.shopifyAccessToken:", profile?.companyProfile?.shopifyAccessToken ? "present" : "missing");
    console.log("[Integrations] Current profile.companyProfile.shopifyStoreName:", profile?.companyProfile?.shopifyStoreName ? "present" : "missing");

    if (isLoadingProfile) {
      showError("Profile is still loading. Please wait a moment.");
      setIsFetchingShopifyLocations(false);
      return;
    }
    if (!profile?.companyProfile?.shopifyAccessToken || !profile?.companyProfile?.shopifyStoreName) {
      showError("Shopify is not fully connected. Please ensure your store is connected and try again.");
      setIsFetchingShopifyLocations(false);
      return;
    }
    setIsFetchingShopifyLocations(true);
    try {
      const { data: sessionData, error: _sessionError } = await supabase.auth.getSession();
      if (!sessionData.session) {
        showError("You must be logged in to fetch Shopify locations.");
        setIsFetchingShopifyLocations(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('fetch-shopify-locations', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }
      if (data.error) {
        throw new Error(data.error);
      }

      setShopifyLocations(data.locations);
      showSuccess("Shopify locations fetched!");
    } catch (error: any) {
      console.error("Error fetching Shopify locations:", error);
      showError(`Failed to fetch Shopify locations: ${error.message}`);
    } finally {
      setIsFetchingShopifyLocations(false);
    }
  };

  const fetchShopifyLocationMappings = async () => {
    if (!profile?.organizationId) return;
    setIsFetchingShopifyMappings(true);
    try {
      const { data, error } = await supabase
        .from('shopify_location_mappings')
        .select('*')
        .eq('organization_id', profile.organizationId);

      if (error) throw error;
      setShopifyMappings(data);
    } catch (error: any) {
      console.error("Error fetching Shopify location mappings:", error);
      showError(`Failed to fetch Shopify location mappings: ${error.message}`);
    } finally {
      setIsFetchingShopifyMappings(false);
    }
  };

  const handleSaveLocationMapping = async () => {
    if (!profile?.organizationId || !profile?.id || !selectedShopifyLocationId || !selectedFortressFolderId) {
      showError("Select both a Shopify location and a Fortress folder.");
      return;
    }

    const shopifyLoc = shopifyLocations.find(loc => loc.id === selectedShopifyLocationId);
    if (!shopifyLoc) {
      showError("Selected Shopify location not found.");
      return;
    }

    setIsSavingMapping(true);
    try {
      const existingMapping = shopifyMappings.find(m => m.shopify_location_id === selectedShopifyLocationId);

      if (existingMapping) {
        const { error } = await supabase
          .from('shopify_location_mappings')
          .update({ fortress_location_id: selectedFortressFolderId })
          .eq('id', existingMapping.id)
          .eq('organization_id', profile.organizationId);
        if (error) throw error;
        showSuccess(`Mapping for ${shopifyLoc.name} updated!`);
      } else {
        const { error } = await supabase
          .from('shopify_location_mappings')
          .insert({
            organization_id: profile.organizationId,
            shopify_location_id: selectedShopifyLocationId,
            shopify_location_name: shopifyLoc.name,
            fortress_location_id: selectedFortressFolderId,
            user_id: profile.id,
          });
        if (error) throw error;
        showSuccess(`Mapping for ${shopifyLoc.name} created!`);
      }
      
      await fetchShopifyLocationMappings();
      setSelectedShopifyLocationId(null);
      setSelectedFortressFolderId(null);
      setMappingToEdit(null);
    } catch (error: any) {
      console.error("Error saving location mapping:", error);
      showError(`Failed to save mapping: ${error.message}`);
    } finally {
      setIsSavingMapping(false);
    }
  };

  const handleEditMappingClick = (mapping: ShopifyLocationMapping) => {
    setMappingToEdit(mapping);
    setSelectedShopifyLocationId(mapping.shopify_location_id);
    setSelectedFortressFolderId(mapping.fortress_location_id);
  };

  const handleDeleteMappingClick = (mapping: ShopifyLocationMapping) => {
    setMappingToDelete(mapping);
    setIsConfirmDeleteMappingOpen(true);
  };

  const confirmDeleteMapping = async () => {
    if (!mappingToDelete || !profile?.organizationId) return;
    setIsDeletingMapping(true);
    try {
      const { error } = await supabase
        .from('shopify_location_mappings')
        .delete()
        .eq('id', mappingToDelete.id)
        .eq('organization_id', profile.organizationId);
      if (error) throw error;
      showSuccess(`Mapping for ${mappingToDelete.shopify_location_name} deleted.`);
      await fetchShopifyLocationMappings();
    } catch (error: any) {
      console.error("Error deleting mapping:", error);
      showError(`Failed to delete mapping: ${error.message}`);
    } finally {
      setIsDeletingMapping(false);
      setIsConfirmDeleteMappingOpen(false);
      setMappingToDelete(null);
    }
  };

  const getFortressFolderDisplayName = (id: string) => {
    const folder = inventoryFolders.find(f => f.id === id);
    return folder ? (folder.name) : "Unknown Folder";
  };

  const isQuickBooksConnected = profile?.quickbooksAccessToken && profile?.quickbooksRefreshToken && profile?.quickbooksRealmId;
  const isShopifyConnected = profile?.companyProfile?.shopifyAccessToken && profile?.companyProfile?.shopifyStoreName;

  if (isLoadingProfile || isFetchingQuickbooksClientId) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading integrations...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <h1 className="text-3xl font-bold">Integrations</h1>
      <p className="text-muted-foreground">Connect Fortress with your favorite business tools for enhanced workflow.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border rounded-lg shadow-sm p-6">
          <CardHeader className="pb-4 flex flex-row items-center gap-4">
            <img src="/Intuit_QuickBooks_logo.png" alt="QuickBooks Logo" className="h-10 object-contain" />
            <CardTitle className="text-xl font-semibold">QuickBooks Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isQuickBooksConnected ? (
              <div className="flex flex-col gap-2">
                <p className="text-green-500 font-semibold">
                  <CheckCircle className="inline h-4 w-4 mr-2" /> Connected to QuickBooks!
                </p>
                <p className="text-sm text-muted-foreground">
                  Your Fortress account is linked with QuickBooks. You can now synchronize data.
                </p>
                <Button onClick={handleSyncSalesOrders} disabled={isSyncingQuickBooks || !canAccessQuickBooks || isLoadingProfile}>
                  {isSyncingQuickBooks ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing...
                    </>
                  ) : (
                    <>
                      <Plug className="h-4 w-4 mr-2" /> Sync Sales Orders to QuickBooks
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleGoToQuickBooksAccount} disabled={!canAccessQuickBooks || isLoadingProfile || !quickbooksEnvironment}>
                  <ExternalLink className="h-4 w-4 mr-2" /> Go to QuickBooks Account
                </Button>
                <Button variant="destructive" onClick={handleDisconnectQuickBooks} disabled={!canAccessQuickBooks || isLoadingProfile}>
                  Disconnect QuickBooks
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground">
                  Connect your QuickBooks account to enable automatic syncing of orders, inventory, and more.
                </p>
                <Button onClick={handleConnectQuickBooks} disabled={!profile?.id || !canAccessQuickBooks || isLoadingProfile || isFetchingQuickbooksClientId || !quickbooksClientId}>
                  {isFetchingQuickbooksClientId ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Client ID...
                    </>
                  ) : (
                    "Connect to QuickBooks"
                  )}
                </Button>
                {!profile?.id && (
                  <p className="text-sm text-red-500">
                    Please log in to connect to QuickBooks.
                  </p>
                )}
                {!canAccessQuickBooks && (
                  <p className="text-sm text-yellow-500">
                    QuickBooks integration requires a Premium or Enterprise plan.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-lg shadow-sm p-6">
          <CardHeader className="pb-4 flex flex-row items-center gap-4">
            <img src={shopifyLogoSrc} alt="Shopify Logo" className="h-10 object-contain" />
            <CardTitle className="text-xl font-semibold">Shopify Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isShopifyConnected ? (
              <div className="flex flex-col gap-2">
                <p className="text-green-500 font-semibold">
                  <CheckCircle className="inline h-4 w-4 mr-2" /> Connected to Shopify Store: {profile?.companyProfile?.shopifyStoreName}!
                </p>
                <p className="text-sm text-muted-foreground">
                  Your Fortress account is linked with Shopify. You can now synchronize product data.
                </p>
                <Button onClick={handleSyncShopifyProducts} disabled={isSyncingShopify || !canAccessShopify || isLoadingProfile}>
                  {isSyncingShopify ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" /> Sync Products from Shopify
                    </>
                  )}
                </Button>
                <Button variant="destructive" onClick={handleDisconnectShopify} disabled={!canAccessShopify || isLoadingProfile}>
                  Disconnect Shopify
                </Button>

                <div className="mt-6 pt-4 border-t border-border space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" /> Shopify Location Mappings
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Map your Shopify fulfillment locations to your Fortress inventory folders to ensure accurate stock deduction.
                  </p>
                  <Button onClick={fetchShopifyLocations} disabled={isFetchingShopifyLocations || !canAccessShopify || !isShopifyConnected || isLoadingProfile}>
                    {isFetchingShopifyLocations ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching Locations...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" /> Fetch Shopify Locations
                      </>
                    )}
                  </Button>

                  {shopifyLocations.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-md">Create/Update Mapping</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                          <Label htmlFor="shopify-location-select">Shopify Location</Label>
                          <Select
                            value={selectedShopifyLocationId || ""}
                            onValueChange={(value) => {
                              setSelectedShopifyLocationId(value);
                              const existing = shopifyMappings.find(m => m.shopify_location_id === value);
                              setSelectedFortressFolderId(existing?.fortress_location_id || null);
                              setMappingToEdit(existing || null);
                            }}
                            disabled={isSavingMapping || !canAccessShopify || isLoadingProfile}
                          >
                            <SelectTrigger id="shopify-location-select">
                              <SelectValue placeholder="Select Shopify Location" />
                            </SelectTrigger>
                            <SelectContent>
                              {shopifyLocations.map(loc => (
                                <SelectItem key={loc.id} value={loc.id}>
                                  {loc.name} ({loc.city}, {loc.country})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fortress-folder-select">Fortress Folder</Label>
                          <Select
                            value={selectedFortressFolderId || ""}
                            onValueChange={setSelectedFortressFolderId}
                            disabled={isSavingMapping || inventoryFolders.length === 0 || !canAccessShopify || isLoadingProfile}
                          >
                            <SelectTrigger id="fortress-folder-select">
                              <SelectValue placeholder="Select Fortress Folder" />
                            </SelectTrigger>
                            <SelectContent>
                              {inventoryFolders.map(folder => (
                                <SelectItem key={folder.id} value={folder.id}>
                                  {folder.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={handleSaveLocationMapping}
                          disabled={isSavingMapping || !selectedShopifyLocationId || !selectedFortressFolderId || !canAccessShopify || isLoadingProfile}
                        >
                          {isSavingMapping ? (
                            <>
                              <LinkIcon className="h-4 w-4 mr-2" /> Saving...
                            </>
                          ) : (
                            <>
                              <LinkIcon className="h-4 w-4 mr-2" /> {mappingToEdit ? "Update Mapping" : "Save Mapping"}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {isFetchingShopifyMappings ? (
                    <div className="flex items-center justify-center h-24">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2 text-muted-foreground">Loading mappings...</span>
                    </div>
                  ) : shopifyMappings.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <h4 className="font-semibold text-md">Existing Mappings</h4>
                      <div className="border rounded-md">
                        {shopifyMappings.map(mapping => (
                          <div key={mapping.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>
                                <span className="font-medium">{mapping.shopify_location_name}</span>
                                <span className="text-muted-foreground"> &rarr; </span>
                                <span className="font-medium">{getFortressFolderDisplayName(mapping.fortress_location_id)}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditMappingClick(mapping)} disabled={!isAdmin || !canAccessShopify || isLoadingProfile}>
                                <Edit className="h-4 w-4 text-primary" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteMappingClick(mapping)} disabled={isDeletingMapping || !isAdmin || !canAccessShopify || isLoadingProfile}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground">
                  Connect your Shopify store to import products and synchronize inventory levels.
                </p>
                <Button onClick={handleConnectShopify} disabled={!profile?.id || !canAccessShopify || isLoadingProfile}>
                  Connect to Shopify
                </Button>
                {!profile?.id && (
                  <p className="text-sm text-red-500">
                    Please log in to connect to Shopify.
                  </p>
                )}
                {!canAccessShopify && (
                  <p className="text-sm text-yellow-500">
                    Shopify integration requires a Premium or Enterprise plan.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border rounded-lg shadow-sm p-6">
        <CardHeader className="pb-4 flex flex-row items-center gap-4">
          <Hourglass className="h-6 w-6 text-muted-foreground" />
          <CardTitle className="text-xl font-semibold">More Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            We're actively working on expanding our integration capabilities to connect with even more of your essential business tools.
            Stay tuned for updates on new platforms like:
          </p>
          <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-1">
            <li>Amazon Seller Central</li>
            <li>Stripe</li>
            <li>And many more...</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            Have a specific integration in mind? Let us know through the feedback button in the header!
          </p>
        </CardContent>
      </Card>

      {mappingToDelete && (
        <ConfirmDialog
          isOpen={isConfirmDeleteMappingOpen}
          onClose={() => setIsConfirmDeleteMappingOpen(false)}
          onConfirm={confirmDeleteMapping}
          title="Confirm Delete Mapping"
          description={`Are you sure you want to delete the mapping for Shopify location "${mappingToDelete.shopify_location_name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}

      <ShopifyStoreUrlDialog
        isOpen={isShopifyStoreUrlDialogOpen}
        onClose={() => setIsShopifyStoreUrlDialogOpen(false)}
        onConfirm={initiateShopifyOAuth}
        isLoading={isLoadingProfile}
      />
    </div>
  );
};

export default Integrations;