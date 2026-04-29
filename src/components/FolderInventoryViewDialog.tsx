import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Search } from "lucide-react";
import { useInventory } from "@/context/InventoryContext";
import { Input } from "@/components/ui/input";
import { useOnboarding } from "@/context/OnboardingContext"; // Now imports InventoryFolder

interface FolderInventoryViewDialogProps { // Renamed interface
  isOpen: boolean;
  onClose: () => void;
  folderId: string; // Changed from locationName to folderId
}

const FolderInventoryViewDialog: React.FC<FolderInventoryViewDialogProps> = ({ // Renamed component
  isOpen,
  onClose,
  folderId, // Changed from locationName
}) => {
  const { inventoryItems } = useInventory();
  const { inventoryFolders } = useOnboarding(); // Renamed from locations
  const [searchTerm, setSearchTerm] = useState("");

  const folderDisplayName = useMemo(() => { // Renamed from locationDisplayName
    const foundFolder = inventoryFolders.find(folder => folder.id === folderId);
    return foundFolder?.name || "Unknown Folder";
  }, [inventoryFolders, folderId]);

  const itemsInFolder = useMemo(() => { // Renamed from itemsInLocation
    return inventoryItems.filter(item =>
      item.folderId === folderId
    );
  }, [inventoryItems, folderId]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) {
      return itemsInFolder;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return itemsInFolder.filter(item =>
      item.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      item.sku.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [itemsInFolder, searchTerm]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" /> Inventory in "{folderDisplayName}" {/* Updated to folderDisplayName */}
          </DialogTitle>
          <DialogDescription>
            Viewing all inventory items currently stored in {folderDisplayName}. {/* Updated to folderDisplayName */}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow flex flex-col gap-4 py-4 px-6 overflow-hidden">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search items by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow"
            />
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>

          {filteredItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No inventory items found in "{folderDisplayName}" matching your search. {/* Updated to folderDisplayName */}
            </p>
          ) : (
            <ScrollArea className="flex-grow border border-border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Picking Bin Qty</TableHead>
                    <TableHead className="text-right">Overstock Qty</TableHead>
                    <TableHead className="text-right">Total Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right">{item.pickingBinQuantity}</TableCell>
                      <TableCell className="text-right">{item.overstockQuantity}</TableCell>
                      <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FolderInventoryViewDialog; // Renamed export