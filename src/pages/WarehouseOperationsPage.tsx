import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Package, Scan, Truck, CheckCircle, AlertTriangle, LayoutDashboard, Search as SearchIcon, ShoppingCart, ListOrdered, Undo2, MapPin, Repeat } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import WarehouseDashboard from "@/components/warehouse-operations/WarehouseDashboard";
import CameraScannerDialog from "@/components/CameraScannerDialog";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/utils/toast";
import { useNavigate, useLocation } from "react-router-dom";
import { useProfile } from "@/context/ProfileContext";
import { useSidebar } from "@/context/SidebarContext";


// Import new dialog wrappers
import ItemLookupDialog from "@/components/warehouse-operations/dialogs/ItemLookupDialog";
import ReceiveInventoryDialog from "@/components/warehouse-operations/dialogs/ReceiveInventoryDialog";
import FulfillOrderDialog from "@/components/warehouse-operations/dialogs/FulfillOrderDialog";
import ShipOrderDialog from "@/components/warehouse-operations/dialogs/ShipOrderDialog";
import PickingWaveManagementDialog from "@/components/warehouse-operations/dialogs/PickingWaveManagementDialog";
import ReplenishmentManagementDialog from "@/components/warehouse-operations/dialogs/ReplenishmentManagementDialog";
import ShippingVerificationDialog from "@/components/warehouse-operations/dialogs/ShippingVerificationDialog";
import ReturnsProcessingDialog from "@/components/warehouse-operations/dialogs/ReturnsProcessingDialog";
import StockTransferDialog from "@/components/warehouse-operations/dialogs/StockTransferDialog";
import CycleCountDialog from "@/components/warehouse-operations/dialogs/CycleCountDialog";
import IssueReportDialog from "@/components/warehouse-operations/dialogs/IssueReportDialog";
import PutawayDialog from "@/components/warehouse-operations/dialogs/PutawayDialog";

const WarehouseOperationsPage: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useProfile();
  const { isCollapsed: _isCollapsed } = useSidebar();


  // NEW: Role-based permissions for warehouse operations
  const canViewWarehouseOps = profile?.role === 'admin' || profile?.role === 'inventory_manager' || profile?.role === 'viewer';
  const canLookupItems = profile?.role === 'admin' || profile?.role === 'inventory_manager' || profile?.role === 'viewer';
  const canReceiveInventory = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canPutaway = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canFulfillOrders = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canShipOrders = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canManagePickingWaves = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canManageReplenishment = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canVerifyShipping = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canProcessReturns = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canTransferStock = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canCycleCount = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canReportIssues = profile?.role === 'admin' || profile?.role === 'inventory_manager' || profile?.role === 'viewer';


  const [activeTab, setActiveTab] = useState("dashboard");

  const [isCameraScannerDialogOpen, setIsCameraScannerDialogOpen] = useState(false);
  const [scanCallback, setScanCallback] = useState<((scannedData: string) => void) | null>(null);
  const [scannedDataForTool, setScannedDataForTool] = useState<string | null>(null);

  const [isItemLookupDialogOpen, setIsItemLookupDialogOpen] = useState(false);
  const [isReceiveInventoryDialogOpen, setIsReceiveInventoryDialogOpen] = useState(false);
  const [isFulfillOrderDialogOpen, setIsFulfillOrderDialogOpen] = useState(false);
  const [isShipOrderDialogOpen, setIsShipOrderDialogOpen] = useState(false);
  const [isPickingWaveManagementDialogOpen, setIsPickingWaveManagementDialogOpen] = useState(false);
  const [isReplenishmentManagementDialogOpen, setIsReplenishmentManagementDialogOpen] = useState(false);
  const [isShippingVerificationDialogOpen, setIsShippingVerificationDialogOpen] = useState(false);
  const [isReturnsProcessingDialogOpen, setIsReturnsProcessingDialogOpen] = useState(false);
  const [isStockTransferDialogOpen, setIsStockTransferDialogOpen] = useState(false);
  const [isCycleCountDialogOpen, setIsCycleCountDialogOpen] = useState(false);
  const [isIssueReportDialogOpen, setIsIssueReportDialogOpen] = useState(false);
  const [isPutawayDialogOpen, setIsPutawayDialogOpen] = useState(false);

  const dialogStates = {
    "item-lookup": { isOpen: isItemLookupDialogOpen, setIsOpen: setIsItemLookupDialogOpen, canAccess: canLookupItems },
    "receive-inventory": { isOpen: isReceiveInventoryDialogOpen, setIsOpen: setIsReceiveInventoryDialogOpen, canAccess: canReceiveInventory },
    "fulfill-order": { isOpen: isFulfillOrderDialogOpen, setIsOpen: setIsFulfillOrderDialogOpen, canAccess: canFulfillOrders },
    "ship-order": { isOpen: isShipOrderDialogOpen, setIsOpen: setIsShipOrderDialogOpen, canAccess: canShipOrders },
    "picking-wave": { isOpen: isPickingWaveManagementDialogOpen, setIsOpen: setIsPickingWaveManagementDialogOpen, canAccess: canManagePickingWaves },
    "replenishment": { isOpen: isReplenishmentManagementDialogOpen, setIsOpen: setIsReplenishmentManagementDialogOpen, canAccess: canManageReplenishment },
    "shipping-verify": { isOpen: isShippingVerificationDialogOpen, setIsOpen: setIsShippingVerificationDialogOpen, canAccess: canVerifyShipping },
    "returns-process": { isOpen: isReturnsProcessingDialogOpen, setIsOpen: setIsReturnsProcessingDialogOpen, canAccess: canProcessReturns },
    "stock-transfer": { isOpen: isStockTransferDialogOpen, setIsOpen: setIsStockTransferDialogOpen, canAccess: canTransferStock },
    "cycle-count": { isOpen: isCycleCountDialogOpen, setIsOpen: setIsCycleCountDialogOpen, canAccess: canCycleCount },
    "issue-report": { isOpen: isIssueReportDialogOpen, setIsOpen: setIsIssueReportDialogOpen, canAccess: canReportIssues },
    "putaway": { isOpen: isPutawayDialogOpen, setIsOpen: setIsPutawayDialogOpen, canAccess: canPutaway },
  };

  const operationButtons = [
    { value: "dashboard", label: "Dashboard", icon: LayoutDashboard, type: "tab", canAccess: canViewWarehouseOps },
    { value: "item-lookup", label: "Lookup", icon: SearchIcon, type: "dialog", canAccess: canLookupItems },
    { value: "receive-inventory", label: "Receive", icon: Package, type: "dialog", canAccess: canReceiveInventory },
    { value: "putaway", label: "Putaway", icon: MapPin, type: "dialog", canAccess: canPutaway },
    { value: "fulfill-order", label: "Fulfill", icon: ShoppingCart, type: "dialog", canAccess: canFulfillOrders },
    { value: "ship-order", label: "Ship", icon: Truck, type: "dialog", canAccess: canShipOrders },
    { value: "picking-wave", label: "Pick Wave", icon: ListOrdered, type: "dialog", canAccess: canManagePickingWaves },
    { value: "replenishment", label: "Replenish", icon: Repeat, type: "dialog", canAccess: canManageReplenishment },
    { value: "shipping-verify", label: "Verify Ship", icon: CheckCircle, type: "dialog", canAccess: canVerifyShipping },
    { value: "returns-process", label: "Returns", icon: Undo2, type: "dialog", canAccess: canProcessReturns },
    { value: "stock-transfer", label: "Transfer", icon: Scan, type: "dialog", canAccess: canTransferStock },
    { value: "cycle-count", label: "Count", icon: CheckCircle, type: "dialog", canAccess: canCycleCount },
    { value: "issue-report", label: "Report Issue", icon: AlertTriangle, type: "dialog", canAccess: canReportIssues },
  ];

  useEffect(() => {
    const hash = location.hash.replace("#", "");

    Object.entries(dialogStates).forEach(([_key, state]) => {
      if (state.isOpen) state.setIsOpen(false);
    });

    if (hash === "dashboard") {
      setActiveTab("dashboard");
    } else {
      const dialogKey = hash as keyof typeof dialogStates;
      if (dialogStates[dialogKey] && dialogStates[dialogKey].canAccess) {
        dialogStates[dialogKey].setIsOpen(true);
        setActiveTab("");
      } else {
        setActiveTab("dashboard");
        if (hash) {
          navigate(location.pathname, { replace: true });
        }
      }
    }
  }, [location.hash, navigate, location.pathname, profile, dialogStates]);

  const requestScan = (callback: (scannedData: string) => void) => {
    setScanCallback(() => callback);
    setIsCameraScannerDialogOpen(true);
  };

  const handleScanSuccessFromDialog = (decodedText: string) => {
    if (scanCallback) {
      scanCallback(decodedText);
      setScanCallback(null);
    } else {
      // If no specific tool requested a scan, default to Item Lookup
      setScannedDataForTool(decodedText);
      Object.entries(dialogStates).forEach(([_key, state]) => {
        if (state.isOpen && _key !== "item-lookup") {
          state.setIsOpen(false);
        }
      });
      if (canLookupItems) {
        dialogStates["item-lookup"].setIsOpen(true);
        navigate(`${location.pathname}#item-lookup`, { replace: true });
        setActiveTab("");
        showSuccess(`Scanned: ${decodedText}. Opening Item Lookup.`);
      } else {
        showError("No permission for Item Lookup.");
      }
    }
    setIsCameraScannerDialogOpen(false);
  };

  const handleCameraScannerDialogClose = () => {
    setIsCameraScannerDialogOpen(false);
    setScanCallback(null);
  };

  const handleScannedDataProcessed = () => {
    setScannedDataForTool(null);
  };

  const closeDialogAndClearHash = (dialogKey: keyof typeof dialogStates) => {
    dialogStates[dialogKey].setIsOpen(false);
    if (location.hash === `#${dialogKey}`) {
      navigate(location.pathname, { replace: true });
    }
    setActiveTab("dashboard");
  };

  if (!isMobile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center bg-card border-border">
          <CardHeader className="flex flex-col items-center gap-2">
            <Scan className="h-10 w-10 text-primary" />
            <CardTitle className="text-2xl font-bold mb-2">Warehouse Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page is optimized for mobile devices and smaller screens. Please access it from a mobile device or resize your browser window.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canViewWarehouseOps) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border">
          <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
          <CardContent>
            <p className="text-muted-foreground">You do not have permission to view warehouse operations.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full p-4 bg-background text-foreground">
      <h1 className="text-2xl font-bold text-center mb-6">Warehouse Operations</h1>

      <Button
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3 flex items-center justify-center gap-2 mb-4"
        onClick={() => requestScan(handleScanSuccessFromDialog)} // Fixed global scan button
        disabled={!canLookupItems}
      >
        <Scan className="h-6 w-6" />
        Scan Item
      </Button>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-4 p-1 bg-muted rounded-lg overflow-x-auto">
        {operationButtons.map((op) => (
          <Button
            key={op.value}
            variant="ghost"
            className={cn(
              "flex flex-col items-center justify-center h-24 w-full aspect-square py-3 px-2 text-sm font-medium rounded-lg transition-colors text-center",
              op.type === "tab" && op.value === activeTab
                ? "bg-primary text-primary-foreground shadow-sm"
                : op.type === "dialog" && dialogStates[op.value as keyof typeof dialogStates]?.isOpen
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground hover:bg-muted/50 hover:text-primary"
            )}
            onClick={() => {
              if (!op.canAccess) {
                showError("No permission to access this operation.");
                return;
              }
              if (op.type === "tab") {
                setActiveTab(op.value);
                navigate(`${location.pathname}#${op.value}`, { replace: true });
              } else if (op.type === "dialog") {
                const dialogKey = op.value as keyof typeof dialogStates;
                if (dialogStates[dialogKey]) {
                  Object.entries(dialogStates).forEach(([_key, state]) => {
                    if (state.isOpen && _key !== dialogKey) {
                      state.setIsOpen(false);
                    }
                  });
                  dialogStates[dialogKey].setIsOpen(true);
                  navigate(`${location.pathname}#${dialogKey}`, { replace: true });
                  setActiveTab("");
                }
              } else if (op.type === "page-link") {
                navigate(`/${op.value}`);
              }
            }}
            disabled={!op.canAccess}
          >
            <op.icon className="h-6 w-6 sm:h-7 sm:w-7 mb-1" />
            <span className="text-xs sm:text-sm font-semibold">{op.label}</span>
          </Button>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col">
        <TabsContent value="dashboard" className="flex-grow min-h-0">
          <WarehouseDashboard />
        </TabsContent>
      </Tabs>

      <ItemLookupDialog
        isOpen={isItemLookupDialogOpen}
        onClose={() => closeDialogAndClearHash("item-lookup")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />
      <ReceiveInventoryDialog
        isOpen={isReceiveInventoryDialogOpen}
        onClose={() => closeDialogAndClearHash("receive-inventory")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />
      <PutawayDialog
        isOpen={isPutawayDialogOpen}
        onClose={() => closeDialogAndClearHash("putaway")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />
      <FulfillOrderDialog
        isOpen={isFulfillOrderDialogOpen}
        onClose={() => closeDialogAndClearHash("fulfill-order")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />
      <ShipOrderDialog
        isOpen={isShipOrderDialogOpen}
        onClose={() => closeDialogAndClearHash("ship-order")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />
      <PickingWaveManagementDialog
        isOpen={isPickingWaveManagementDialogOpen}
        onClose={() => closeDialogAndClearHash("picking-wave")}
      />
      <ReplenishmentManagementDialog
        isOpen={isReplenishmentManagementDialogOpen}
        onClose={() => closeDialogAndClearHash("replenishment")}
      />
      <ShippingVerificationDialog
        isOpen={isShippingVerificationDialogOpen}
        onClose={() => closeDialogAndClearHash("shipping-verify")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />
      <ReturnsProcessingDialog
        isOpen={isReturnsProcessingDialogOpen}
        onClose={() => closeDialogAndClearHash("returns-process")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />
      <StockTransferDialog
        isOpen={isStockTransferDialogOpen}
        onClose={() => closeDialogAndClearHash("stock-transfer")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />
      <CycleCountDialog
        isOpen={isCycleCountDialogOpen}
        onClose={() => closeDialogAndClearHash("cycle-count")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />
      <IssueReportDialog
        isOpen={isIssueReportDialogOpen}
        onClose={() => closeDialogAndClearHash("issue-report")}
        onScanRequest={requestScan}
        scannedDataFromGlobal={scannedDataForTool}
        onScannedDataProcessed={handleScannedDataProcessed}
      />

      <CameraScannerDialog
        isOpen={isCameraScannerDialogOpen}
        onClose={handleCameraScannerDialogClose}
        onScanSuccess={handleScanSuccessFromDialog}
      />
    </div>
  );
};

export default WarehouseOperationsPage;