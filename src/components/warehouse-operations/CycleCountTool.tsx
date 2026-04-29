import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, Barcode } from "lucide-react";
import { useInventory } from "@/context/InventoryContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabaseClient";
import { useProfile } from "@/context/ProfileContext";

interface CountedItem {
  id: string;
  name: string;
  sku: string;
  systemPickingBinQuantity: number;
  systemOverstockQuantity: number;
  countedPickingBinQuantity: number;
  countedOverstockQuantity: number;
  folderId: string;
  isScanned: boolean;
  barcodeUrl?: string;
}

interface CycleCountToolProps {
  onScanRequest: (callback: (scannedData: string) => void) => void;
  scannedDataFromGlobal?: string | null;
  onScannedDataProcessed: () => void;
}

const CycleCountTool: React.FC<CycleCountToolProps> = ({ onScanRequest, scannedDataFromGlobal, onScannedDataProcessed }) => {
  const { inventoryItems, refreshInventory } = useInventory();
  const { inventoryFolders } = useOnboarding();
  const { profile } = useProfile();

  const canCycleCount = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  const [selectedFolder, setSelectedFolder] = useState("all");
  const [itemsToCount, setItemsToCount] = useState<CountedItem[]>([]);
  const [isCounting, setIsCounting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const filteredInventory = useMemo(() => {
    if (selectedFolder === "all") return inventoryItems;
    return inventoryItems.filter(item => item.folderId === selectedFolder);
  }, [inventoryItems, selectedFolder]);

  useEffect(() => {
    if (!isCounting) {
      setItemsToCount([]);
    }
  }, [isCounting]);

  useEffect(() => {
    if (scannedDataFromGlobal && !isScanning && isCounting) {
      handleScannedBarcode(scannedDataFromGlobal);
      onScannedDataProcessed();
    }
  }, [scannedDataFromGlobal, isScanning, isCounting, onScannedDataProcessed]);

  const getFolderName = (folderId: string) => {
    const folder = inventoryFolders.find(f => f.id === folderId);
    return folder?.name || "Unknown Folder";
  };

  const startCycleCount = () => {
    if (!canCycleCount) {
      showError("No permission to start count.");
      return;
    }
    if (filteredInventory.length === 0) {
      showError("No items found for count.");
      return;
    }
    const initialItems: CountedItem[] = filteredInventory.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      systemPickingBinQuantity: item.pickingBinQuantity,
      systemOverstockQuantity: item.overstockQuantity,
      countedPickingBinQuantity: 0,
      countedOverstockQuantity: 0,
      folderId: item.folderId,
      isScanned: false,
      barcodeUrl: item.barcodeUrl,
    }));
    setItemsToCount(initialItems);
    setIsCounting(true);
    showSuccess(`Count started for ${selectedFolder === "all" ? "all folders" : inventoryFolders.find(folder => folder.id === selectedFolder)?.name || selectedFolder}.`);
  };

  const handleCountedQuantityChange = (itemId: string, locationType: 'pickingBin' | 'overstock', quantity: string) => {
    if (!canCycleCount) {
      showError("No permission to count.");
      return;
    }
    setItemsToCount(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const parsedQuantity = parseInt(quantity) || 0;
          if (locationType === 'pickingBin') {
            return { ...item, countedPickingBinQuantity: parsedQuantity };
          } else {
            return { ...item, countedOverstockQuantity: parsedQuantity };
          }
        }
        return item;
      })
    );
  };

  const handleScannedBarcode = (scannedData: string) => {
    setIsScanning(false);
    if (!canCycleCount) {
      showError("No permission to count.");
      return;
    }
    if (!isCounting) {
      showError("Start count before scanning.");
      return;
    }

    const lowerCaseScannedData = scannedData.toLowerCase();
    const scannedItem = itemsToCount.find(
      item => item.sku.toLowerCase() === lowerCaseScannedData ||
               (item.barcodeUrl && item.barcodeUrl.toLowerCase().includes(lowerCaseScannedData))
    );

    if (scannedItem) {
      setItemsToCount(prev =>
        prev.map(item =>
          item.id === scannedItem.id ? { ...item, isScanned: true, countedPickingBinQuantity: item.countedPickingBinQuantity + 1 } : item
        )
      );
      showSuccess(`Scanned: ${scannedItem.name}.`);
    } else {
      showError(`Item not found in count.`);
    }
  };

  const handleScanClick = () => {
    if (!canCycleCount) {
      showError("No permission to count.");
      return;
    }
    setIsScanning(true);
    onScanRequest(handleScannedBarcode);
  };

  const completeCycleCount = async () => {
    if (!canCycleCount) {
      showError("No permission to complete count.");
      return;
    }
    let discrepanciesFound = 0;
    let updatesSuccessful = 0;

    for (const item of itemsToCount) {
      const originalItem = inventoryItems.find(inv => inv.id === item.id);
      if (!originalItem) {
        console.warn(`Original inventory item ${item.id} not found during cycle count completion.`);
        continue;
      }

      if (item.systemPickingBinQuantity !== item.countedPickingBinQuantity) {
        discrepanciesFound++;
        try {
          const { data, error } = await supabase.functions.invoke('handle-stock-discrepancy', {
            body: JSON.stringify({
              item_id: item.id,
              folder_id: item.folderId,
              location_type: 'picking_bin',
              physical_count: item.countedPickingBinQuantity,
              reason: 'Cycle Count Adjustment',
            }),
          });

          if (error) throw error;
          if (data.error) throw new Error(data.error);

          updatesSuccessful++;
          console.log(`Discrepancy for ${item.name} (picking bin) processed:`, data);
        } catch (error: any) {
          console.error(`Failed to process picking bin discrepancy for ${item.name}:`, error);
          showError(`Failed to process picking bin discrepancy for ${item.name}: ${error.message}`);
        }
      }

      if (item.systemOverstockQuantity !== item.countedOverstockQuantity) {
        discrepanciesFound++;
        try {
          const { data, error } = await supabase.functions.invoke('handle-stock-discrepancy', {
            body: JSON.stringify({
              item_id: item.id,
              folder_id: item.folderId,
              location_type: 'overstock',
              physical_count: item.countedOverstockQuantity,
              reason: 'Cycle Count Adjustment',
            }),
          });

          if (error) throw error;
          if (data.error) throw new Error(data.error);

          updatesSuccessful++;
          console.log(`Discrepancy for ${item.name} (overstock) processed:`, data);
        } catch (error: any) {
          console.error(`Failed to process overstock discrepancy for ${item.name}:`, error);
          showError(`Failed to process overstock discrepancy for ${item.name}: ${error.message}`);
        }
      }
    }

    if (discrepanciesFound > 0) {
      showSuccess(`Count completed. ${updatesSuccessful} discrepancies processed.`);
    } else {
      showSuccess("Count completed. No discrepancies found.");
    }
    
    refreshInventory();
    setIsCounting(false);
    setItemsToCount([]);
    setSelectedFolder("all");
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-center">Cycle Counting</h2>

      {!isCounting ? (
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" /> Select Folder
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folderSelect" className="font-semibold">Folder to Count</Label>
              <Select value={selectedFolder} onValueChange={setSelectedFolder} disabled={!canCycleCount}>
                <SelectTrigger id="folderSelect">
                  <SelectValue placeholder="Select a folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Folders</SelectItem>
                  {inventoryFolders.map(folder => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={startCycleCount} className="w-full" disabled={filteredInventory.length === 0 || !canCycleCount}>
              Start Cycle Count
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-3 flex items-center justify-center gap-2"
            onClick={handleScanClick}
            disabled={isScanning || !canCycleCount}
          >
            <Barcode className="h-6 w-6" />
            {isScanning ? "Scanning..." : "Scan Item"}
          </Button>

          <ScrollArea className="flex-grow pb-4">
            <div className="space-y-3">
              {itemsToCount.map(item => (
                <Card key={item.id} className="bg-card border-border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <span className="text-sm text-muted-foreground">SKU: {item.sku}</span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-2">Folder: {getFolderName(item.folderId)}</p>
                    
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor={`counted-picking-qty-${item.id}`} className="font-semibold">
                        Picking Bin ({getFolderName(item.folderId)}):
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">System: {item.systemPickingBinQuantity}</span>
                        <Input
                          id={`counted-picking-qty-${item.id}`}
                          type="number"
                          value={item.countedPickingBinQuantity === 0 ? "" : item.countedPickingBinQuantity}
                          onChange={(e) => handleCountedQuantityChange(item.id, 'pickingBin', e.target.value)}
                          className="w-24 text-right"
                          min="0"
                          disabled={!canCycleCount}
                        />
                      </div>
                    </div>
                    {item.systemPickingBinQuantity !== item.countedPickingBinQuantity && item.countedPickingBinQuantity !== 0 && (
                      <p className="text-sm text-destructive mt-1">
                        Discrepancy: {Math.abs(item.systemPickingBinQuantity - item.countedPickingBinQuantity)} units in Picking Bin
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <Label htmlFor={`counted-overstock-qty-${item.id}`} className="font-semibold">
                        Overstock:
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">System: {item.systemOverstockQuantity}</span>
                        <Input
                          id={`counted-overstock-qty-${item.id}`}
                          type="number"
                          value={item.countedOverstockQuantity === 0 ? "" : item.countedOverstockQuantity}
                          onChange={(e) => handleCountedQuantityChange(item.id, 'overstock', e.target.value)}
                          className="w-24 text-right"
                          min="0"
                          disabled={!canCycleCount}
                        />
                      </div>
                    </div>
                    {item.systemOverstockQuantity !== item.countedOverstockQuantity && item.countedOverstockQuantity !== 0 && (
                      <p className="text-sm text-destructive mt-1">
                        Discrepancy: {Math.abs(item.systemOverstockQuantity - item.countedOverstockQuantity)} units in Overstock
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <div className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setIsCounting(false)} className="flex-grow" disabled={!canCycleCount}>
              Cancel Count
            </Button>
            <Button onClick={completeCycleCount} className="flex-grow" disabled={!canCycleCount}>
              Complete Count
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default CycleCountTool;