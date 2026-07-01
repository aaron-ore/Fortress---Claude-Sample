import { useEffect, useRef, lazy, Suspense, useState, startTransition } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
// Import pdfContentComponents from the centralized config file
import { pdfContentComponents } from "./lib/reportConfig";

// Removed: import { useOnboarding } from "./context/OnboardingContext";
import { useProfile } from "./context/ProfileContext"; // Removed UserProfile import as it's not directly used here
import { usePrint } from "./context/PrintContext";
import { showSuccess, showError, showInfo } from "./utils/toast"; // ADDED showInfo

import { SidebarProvider } from "./context/SidebarContext";
import { OrdersProvider } from "./context/OrdersContext";
import { VendorProvider } from "./context/VendorContext";
import { CustomerProvider } from "./context/CustomerContext";
import { CategoryProvider } from "./context/CategoryContext";
import { NotificationProvider } from "./context/NotificationContext";
import { StockMovementProvider } from "./context/StockMovementContext";
import { ReplenishmentProvider } from "./context/ReplenishmentContext";
import { InventoryProvider } from "./context/InventoryContext";
import { InventoryUnitsProvider } from "./context/InventoryUnitsContext"; // Warehouse serialized units
import { PartnersProvider } from "./context/PartnersContext"; // Warehouse partners (ISO/ISV)
import { MerchantsProvider } from "./context/MerchantsContext"; // Warehouse merchants
import { ShipmentsProvider } from "./context/ShipmentsContext"; // Warehouse shipments (packing slips)
import { AutomationProvider } from "./context/AutomationContext";
import { UnitOfMeasureProvider } from "./context/UnitOfMeasureContext"; // NEW: Import UnitOfMeasureProvider
import { RecipeProvider } from "./context/RecipeContext"; // NEW: Import RecipeProvider
import { VariancePeriodProvider } from "./context/VariancePeriodContext"; // Variance Finder
import { SalesImportProvider } from "./context/SalesImportContext"; // Variance Finder
import { PosMappingProvider } from "./context/PosMappingContext"; // Variance Finder
import { InventoryCountProvider } from "./context/InventoryCountContext"; // Variance Finder
import { StockCountProvider } from "./context/StockCountContext"; // Simplified Food Cost
import { PreferencesProvider } from "./context/PreferencesContext";
import ErrorBoundary from "./components/ErrorBoundary";
import PrintWrapper from "./components/PrintWrapper";
import { Loader2 } from "lucide-react";
// Removed: import { useTutorial } from "./context/TutorialContext";
// Removed: import TutorialTooltip from "./components/TutorialTooltip";
import UpgradePromptDialog from "./components/UpgradePromptDialog";
// import LiveChatWidget from "./components/LiveChatWidget"; // hidden for now — not ready
import Footer from "./components/Footer"; // NEW: Import Footer
import { useAuth } from "./context/AuthContext"; // NEW: Import useAuth

// Wrap React.lazy so a failed dynamic import — almost always a stale chunk after a
// new deploy (old index.html requesting a hash that no longer exists) — triggers a
// single full reload to fetch the fresh build, instead of a blank/broken page.
type LazyFactory = Parameters<typeof lazy>[0];
function lazyWithRetry(factory: LazyFactory) {
  return lazy(async () => {
    const KEY = "chunk-reload-once";
    try {
      const mod = await factory();
      sessionStorage.removeItem(KEY);
      return mod;
    } catch (err) {
      if (!sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, "1");
        window.location.reload();
        // Never resolves; the reload replaces the page.
        return await new Promise<Awaited<ReturnType<LazyFactory>>>(() => {});
      }
      throw err;
    }
  });
}

// Dynamically import all page components for code splitting
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const Inventory = lazyWithRetry(() => import("./pages/Inventory"));
const Orders = lazyWithRetry(() => import("./pages/Orders"));
const Reports = lazyWithRetry(() => import("./pages/Reports"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const CreatePurchaseOrder = lazyWithRetry(() => import("./pages/CreatePurchaseOrder"));
const EditInventoryItem = lazyWithRetry(() => import("./pages/EditInventoryItem"));
const EditPurchaseOrder = lazyWithRetry(() => import("./pages/EditPurchaseOrder"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const MyProfile = lazyWithRetry(() => import("./pages/MyProfile"));
const AccountSettings = lazyWithRetry(() => import("./pages/AccountSettings"));
const NotificationsPage = lazyWithRetry(() => import("./pages/NotificationsPage"));
const BillingSubscriptions = lazyWithRetry(() => import("./pages/BillingSubscriptions"));
const HelpCenter = lazyWithRetry(() => import("./pages/HelpCenter"));
const WhatsNew = lazyWithRetry(() => import("./pages/WhatsNew"));
const Vendors = lazyWithRetry(() => import("./pages/Vendors"));
const Users = lazyWithRetry(() => import("./pages/Users"));
const CreateInvoice = lazyWithRetry(() => import("./pages/CreateInvoice"));
const SetupInstructions = lazyWithRetry(() => import("./pages/SetupInstructions"));
const WarehouseOperationsPage = lazyWithRetry(() => import("./pages/WarehouseOperationsPage"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Folders = lazyWithRetry(() => import("./pages/Locations"));
const Customers = lazyWithRetry(() => import("./pages/Customers"));
const Integrations = lazyWithRetry(() => import("./pages/Integrations"));
const OnboardingPage = lazyWithRetry(() => import("./pages/OnboardingPage"));
const Automation = lazyWithRetry(() => import("./pages/Automation"));
const ItemHistoryPage = lazyWithRetry(() => import("./pages/ItemHistoryPage"));
const FolderContentPage = lazyWithRetry(() => import("./pages/FolderContentPage"));
const ActivityLogs = lazyWithRetry(() => import("./pages/ActivityLogs"));
const TermsOfService = lazyWithRetry(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const RefundPolicy = lazyWithRetry(() => import("./pages/RefundPolicy"));
// Customer Import hidden (legacy B2B stub, out of scope for the variance pivot)
const Recipes = lazyWithRetry(() => import("./pages/Recipes")); // NEW: Lazy import for Recipes
const UnitsOfMeasure = lazyWithRetry(() => import("./pages/UnitsOfMeasure"));
const QuickScanPage = lazyWithRetry(() => import("./pages/QuickScanPage"));
const BulkIntakePage = lazyWithRetry(() => import("./pages/BulkIntakePage")); // Warehouse serialized intake
const DevicesPage = lazyWithRetry(() => import("./pages/DevicesPage")); // Warehouse serialized units list
const PartnersMerchantsPage = lazyWithRetry(() => import("./pages/PartnersMerchantsPage")); // Warehouse merchants & partners
const AllocatePage = lazyWithRetry(() => import("./pages/AllocatePage")); // Warehouse allocation workflow
const ShipPage = lazyWithRetry(() => import("./pages/ShipPage")); // Warehouse shipping + packing slip
const VarianceSalesImport = lazyWithRetry(() => import("./pages/variance/VarianceSalesImport")); // Variance Finder
const VariancePosMapping = lazyWithRetry(() => import("./pages/variance/VariancePosMapping")); // Variance Finder
const VarianceCounts = lazyWithRetry(() => import("./pages/variance/VarianceCounts")); // Variance Finder
const VarianceReport = lazyWithRetry(() => import("./pages/variance/VarianceReport")); // Variance Finder
const FoodCost = lazyWithRetry(() => import("./pages/FoodCost")); // Simplified Food Cost


// Fallback component for Suspense
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
    <Loader2 className="h-10 w-10 animate-spin text-primary" />
    <span className="ml-4 text-lg">Loading page...</span>
  </div>
);

const AuthenticatedApp = () => {
  return (
    <PreferencesProvider>
    <SidebarProvider>
      <OrdersProvider>
        <VendorProvider>
          <CustomerProvider>
            <CategoryProvider>
              <NotificationProvider>
                <StockMovementProvider>
                  <ReplenishmentProvider>
                    <InventoryProvider>
                      <InventoryUnitsProvider> {/* Warehouse serialized units */}
                      <PartnersProvider> {/* Warehouse partners */}
                      <MerchantsProvider> {/* Warehouse merchants */}
                      <ShipmentsProvider> {/* Warehouse shipments */}
                      <UnitOfMeasureProvider> {/* NEW: UnitOfMeasureProvider */}
                        <RecipeProvider> {/* NEW: RecipeProvider */}
                          <VariancePeriodProvider> {/* Variance Finder */}
                          <SalesImportProvider> {/* Variance Finder */}
                          <PosMappingProvider> {/* Variance Finder */}
                          <InventoryCountProvider> {/* Variance Finder */}
                          <StockCountProvider> {/* Simplified Food Cost */}
                          <AutomationProvider>
                            <Suspense fallback={<LoadingFallback />}>
                              {/* This is the main layout for authenticated users */}
                              <Routes>
                                <Route path="/" element={<Layout />}>
                                  {/* "/" is the landing URL; authenticated users go to the dedicated /home route */}
                                  <Route index element={<Navigate to="/home" replace />} />
                                  <Route path="home" element={<Dashboard />} />
                                  <Route path="inventory" element={<Inventory />} />
                                  <Route path="quick-scan" element={<QuickScanPage />} />
                                  <Route path="bulk-intake" element={<BulkIntakePage />} />
                                  <Route path="devices" element={<DevicesPage />} />
                                  <Route path="partners-merchants" element={<PartnersMerchantsPage />} />
                                  <Route path="allocate" element={<AllocatePage />} />
                                  <Route path="ship" element={<ShipPage />} />
                                  <Route path="inventory/:id" element={<EditInventoryItem />} />
                                  <Route path="inventory/:id/history" element={<ItemHistoryPage />} />
                                  <Route path="orders" element={<Orders />} />
                                  <Route path="orders/:id" element={<EditPurchaseOrder />} />
                                  <Route path="reports" element={<Reports />} />
                                  <Route path="settings" element={<Settings />} />
                                  <Route path="create-po" element={<CreatePurchaseOrder />} />
                                  <Route path="create-invoice" element={<CreateInvoice />} />
                                  <Route path="profile" element={<MyProfile />} />
                                  <Route path="account-settings" element={<AccountSettings />} />
                                  <Route path="notifications-page" element={<NotificationsPage />} />
                                  <Route path="billing" element={<BillingSubscriptions />} />
                                  <Route path="help" element={<HelpCenter />} />
                                  <Route path="whats-new" element={<WhatsNew />} />
                                  <Route path="vendors" element={<Vendors />} />
                                  <Route path="customers" element={<Customers />} />
                                  <Route path="users" element={<Users />} />
                                  <Route path="activity-logs" element={<ActivityLogs />} />
                                  <Route path="setup-instructions" element={<SetupInstructions />} />
                                  <Route path="warehouse-operations" element={<WarehouseOperationsPage />} />
                                  <Route path="reset-password" element={<ResetPassword />} />
                                  <Route path="folders" element={<Folders />} />
                                  <Route path="folders/:folderId" element={<FolderContentPage />} />
                                  <Route path="integrations" element={<Integrations />} />
                                  <Route path="automation" element={<Automation />} />
                                  <Route path="recipes" element={<Recipes />} /> {/* NEW: Route for Recipes */}
                                  <Route path="units" element={<UnitsOfMeasure />} /> {/* Units of measure management */}
                                  <Route path="variance/sales-import" element={<VarianceSalesImport />} /> {/* Variance Finder */}
                                  <Route path="variance/mapping" element={<VariancePosMapping />} /> {/* Variance Finder */}
                                  <Route path="variance/counts" element={<VarianceCounts />} /> {/* Variance Finder */}
                                  <Route path="variance" element={<VarianceReport />} /> {/* Variance Finder */}
                                  <Route path="food-cost" element={<FoodCost />} /> {/* Simplified Food Cost */}
                                  <Route path="terms-of-service" element={<TermsOfService />} />
                                  <Route path="privacy-policy" element={<PrivacyPolicy />} />
                                  <Route path="refund-policy" element={<RefundPolicy />} />
                                  <Route path="*" element={<NotFound />} />
                                </Route>
                              </Routes>
                            </Suspense>
                          </AutomationProvider>
                          </StockCountProvider> {/* Simplified Food Cost */}
                          </InventoryCountProvider> {/* Variance Finder */}
                          </PosMappingProvider> {/* Variance Finder */}
                          </SalesImportProvider> {/* Variance Finder */}
                          </VariancePeriodProvider> {/* Variance Finder */}
                        </RecipeProvider> {/* NEW: RecipeProvider */}
                      </UnitOfMeasureProvider> {/* NEW: UnitOfMeasureProvider */}
                      </ShipmentsProvider> {/* Warehouse shipments */}
                      </MerchantsProvider> {/* Warehouse merchants */}
                      </PartnersProvider> {/* Warehouse partners */}
                      </InventoryUnitsProvider> {/* Warehouse serialized units */}
                    </InventoryProvider>
                  </ReplenishmentProvider>
                </StockMovementProvider>
              </NotificationProvider>
            </CategoryProvider>
          </CustomerProvider>
        </VendorProvider>
      </OrdersProvider>
    </SidebarProvider>
    </PreferencesProvider>
  );
};

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: isLoadingAuth } = useAuth(); // NEW: Use user and isLoadingAuth
  const { isLoadingProfile, profile, fetchProfile } = useProfile();
  const { isPrinting, printContentData, resetPrintState } = usePrint();

  const qbCallbackProcessedRef = useRef(false);
  const shopifyCallbackProcessedRef = useRef(false);
  const dodoCallbackProcessedRef = useRef(false);

  const [isUpgradePromptDialogOpen, setIsUpgradePromptDialogOpen] = useState(false);

  useEffect(() => {
    // 1. Handle URL cleanup (e.g., removing Google's #_=_ hash)
    if (location.hash) {
      console.log("[AppContent] Detected URL hash. Clearing it for clean routing.");
      // Clear hash, keep search params
      navigate(location.pathname + location.search, { replace: true });
      return; // Exit this effect run, a new render cycle will start with the cleaned URL
    }

    // 2. Handle OAuth success/error messages (after hash is cleared)
    const params = new URLSearchParams(location.search);
    const quickbooksSuccess = params.get('quickbooks_success');
    const quickbooksError = params.get('quickbooks_error');
    const shopifySuccess = params.get('shopify_success');
    const shopifyError = params.get('shopify_error');
    const dodoCheckoutStatus = params.get('dodo_status');

    if (quickbooksSuccess && !qbCallbackProcessedRef.current) {
      showSuccess("QuickBooks connected!");
      qbCallbackProcessedRef.current = true;
      navigate('/integrations', { replace: true });
      return; // Exit after navigation
    } else if (quickbooksError && !qbCallbackProcessedRef.current) {
      showError(`QuickBooks connection failed: ${quickbooksError}`);
      qbCallbackProcessedRef.current = true;
      navigate('/integrations', { replace: true });
      return; // Exit after navigation
    }

    if (shopifySuccess && !shopifyCallbackProcessedRef.current) {
      showSuccess("Shopify connected!");
      shopifyCallbackProcessedRef.current = true;
      navigate(location.pathname, { replace: true });
      return; // Exit after navigation
    } else if (shopifyError && !shopifyCallbackProcessedRef.current) {
      showError(`Shopify connection failed: ${shopifyError}`);
      shopifyCallbackProcessedRef.current = true;
      navigate(location.pathname, { replace: true });
      return; // Exit after navigation
    }

    if (dodoCheckoutStatus && !dodoCallbackProcessedRef.current) {
      if (dodoCheckoutStatus === 'success') {
        showSuccess("Payment received! Activating your plan…");
      } else if (dodoCheckoutStatus === 'cancelled') {
        showError("Checkout cancelled.");
      } else {
        showInfo(`Checkout status: ${dodoCheckoutStatus}`);
      }
      // The Dodo webhook is the source of truth; refetch to pick up the new plan.
      // Retry shortly after in case the webhook lands a moment after redirect.
      fetchProfile();
      setTimeout(() => { fetchProfile(); }, 4000);

      const newSearchParams = new URLSearchParams(params);
      newSearchParams.delete('dodo_status');
      navigate({ search: newSearchParams.toString() }, { replace: true });
      dodoCallbackProcessedRef.current = true; // Mark as processed
      return; // Exit after navigation
    }

    // 3. Handle primary routing for authenticated users (after URL is clean and OAuth messages handled)
    console.log("[AppContent] Primary routing logic. isLoadingAuth:", isLoadingAuth, "user:", user, "isLoadingProfile:", isLoadingProfile, "profile:", profile, "location.pathname:", location.pathname);
    
    if (!isLoadingAuth && user) {
      // User is authenticated (raw user object exists)
      if (location.pathname === '/auth') {
        // If on /auth, wait for profile to load to decide where to go
        if (!isLoadingProfile) {
          if (profile?.organizationId && profile.hasOnboardingWizardCompleted) {
            console.log("[AppContent] Authenticated, onboarding complete, on /auth. Redirecting to home.");
            startTransition(() => {
              navigate('/home', { replace: true });
            });
          } else {
            console.log("[AppContent] Authenticated, onboarding NOT complete, on /auth. Redirecting to onboarding.");
            startTransition(() => {
              navigate('/onboarding', { replace: true });
            });
          }
        }
      } else if (!isLoadingProfile && !profile?.organizationId && location.pathname !== '/onboarding') {
        // If authenticated but no organization, redirect to onboarding
        console.log("[AppContent] Authenticated but no organization. Redirecting to onboarding to create/join org.");
        startTransition(() => {
            navigate('/onboarding', { replace: true });
        });
      }
      
      // Show upgrade prompt if applicable (only after profile is fully loaded and on dashboard)
      if (
        !isLoadingProfile &&
        profile?.organizationId &&
        profile.hasOnboardingWizardCompleted &&
        !profile.hasSeenUpgradePrompt &&
        profile.companyProfile?.plan === 'free' &&
        location.pathname === '/home'
      ) {
        console.log("[AppContent] Showing upgrade prompt.");
        setIsUpgradePromptDialogOpen(true);
      } else if (isUpgradePromptDialogOpen) {
        setIsUpgradePromptDialogOpen(false);
      }
    }
  }, [
    location.hash, location.search, location.pathname, navigate,
    qbCallbackProcessedRef, shopifyCallbackProcessedRef, dodoCallbackProcessedRef,
    isLoadingAuth, user, isLoadingProfile, profile, isUpgradePromptDialogOpen, fetchProfile,
  ]);

  useEffect(() => {
    if (isPrinting && printContentData?.type === "location-label") {
      document.documentElement.classList.add("print-mode-label");
    } else {
      document.documentElement.classList.remove("print-mode-label");
    }
  }, [isPrinting, printContentData]);

  if (isLoadingAuth || (user && isLoadingProfile)) { // Show loading screen if authenticating OR if user is present but profile is still loading
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-4 text-lg">Loading application...</span>
      </div>
    );
  }

  const mainAppRoutes = user ? (
    <ErrorBoundary>
      <Routes>
        <Route path="/onboarding" element={
          <Suspense fallback={<LoadingFallback />}>
            <OnboardingPage />
          </Suspense>
        } />
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </ErrorBoundary>
  ) : (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="*" element={<Auth />} />
      </Routes>
    </Suspense>
  );

  const renderPdfComponent = () => {
    if (!printContentData) return null;

    console.log("[AppContent] Rendering PDF component for type:", printContentData.type);

    const PdfComponent = pdfContentComponents[printContentData.type];

    if (PdfComponent) {
      return <PdfComponent {...printContentData.props} />;
    } else {
      return <div>Unknown PDF Report Type: {printContentData.type}</div>;
    }
  };

  return (
    <>
      <div className={isPrinting ? "hidden" : ""}>
        {mainAppRoutes}
        {/* Only show footer if not in print mode and not on onboarding page */}
        {!isPrinting && location.pathname !== '/onboarding' && location.pathname !== '/auth' && (
          <Footer />
        )}
      </div>

      {isPrinting && printContentData && (
        <PrintWrapper contentData={printContentData} onPrintComplete={resetPrintState}>
          {renderPdfComponent()}
        </PrintWrapper>
      )}

      <UpgradePromptDialog
        isOpen={isUpgradePromptDialogOpen}
        onClose={() => setIsUpgradePromptDialogOpen(false)}
      />

      {/* Live chat (tawk.to) hidden for now — not ready for use. */}
      {/* {!isLoadingProfile && profile && <LiveChatWidget />} */}
    </>
  );
};

export default AppContent;