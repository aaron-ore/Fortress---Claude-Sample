import React, { useState, useEffect, useMemo, useCallback } from "react";
import { PlusCircle, List, LayoutGrid, PackagePlus, Upload, Repeat, Scan as ScanIcon, ChevronDown, Loader2, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { useCategories } from "@/context/CategoryContext";
import { useVendors } from "@/context/VendorContext";
import { useOnboarding, InventoryFolder } from "@/context/OnboardingContext";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { showError } from "@/utils/toast";
import { useNavigate, Link } from "react-router-dom";
import { useProfile } from "@/context/ProfileContext";

import InventoryCardGrid from "@/components/inventory/InventoryCardGrid";
import ManageFoldersDialog from "@/components/ManageFoldersDialog";
import CategoryManagementDialog from "@/components/CategoryManagementDialog";
import ScanItemDialog from "@/components/ScanItemDialog";
import BulkUpdateDialog from "@/components/BulkUpdateDialog";
import ImportCsvDialog from "@/components/ImportCsvDialog";
import AutoReorderSettingsDialog from "@/components/AutoReorderSettingsDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import InventoryItemQuickViewDialog from "@/components/InventoryItemQuickViewDialog";
import AddInventoryDialog from "@/components/AddInventoryDialog";
import { useSidebar } from "@/context/SidebarContext";
import FolderCard from "@/components/inventory/FolderCard";
import FolderLabelGenerator from "@/components/FolderLabelGenerator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";


export const createInventoryColumns = (
  handleQuickView: (item: InventoryItem) => void,
  inventoryFolders: InventoryFolder[],
  navigateToFolder: (folderId: string) => void,
  handleDeleteItemClick: (itemId: string, itemName: string) => void, // Added this parameter
  canManageInventory: boolean, // Added this parameter
  canDeleteInventory: boolean // Added this parameter
): ColumnDef<InventoryItem>[] => [
  {
    accessorKey: "name",
    header: "Item Name",
    cell: ({ row }) => (
      <Button variant="link" className="p-0 h-auto text-left font-medium hover:underline" onClick={() => handleQuickView(row.original)}>
        {row.getValue("name") as string}
      </Button>
    ),
  },
  {
    accessorKey: "sku",
    header: "SKU",
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => (
      <span className={row.original.quantity <= row.original.reorderLevel ? "text-red-500 font-semibold" : ""}>
        {row.getValue("quantity") as number}
      </span>
    ),
  },
  {
    accessorKey: "reorderLevel",
    header: "Reorder Level",
  },
  {
    accessorKey: "folderId",
    header: "Folder",
    cell: ({ row }) => {
      const folderId = row.original.folderId;
      const foundFolder = inventoryFolders.find(folder => folder.id === folderId);
      return (
        <Button variant="link" className="p-0 h-auto text-left font-medium hover:underline" onClick={() => navigateToFolder(folderId)}>
          {foundFolder?.name || "Unassigned"}
        </Button>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      let variant: "success" | "warning" | "destructive" | "info" | "muted" = "info";
      switch (row.original.status) {
        case "In Stock":
          variant = "success";
          break;
        case "Low Stock":
          variant = "warning";
          break;
        case "Out of Stock":
          variant = "destructive";
          break;
      }
      return <Badge variant={variant}>{row.original.status}</Badge>;
    },
  },
  {
    accessorKey: "unitCost",
    header: "Unit Cost",
    cell: ({ row }) => `$${parseFloat(row.original.unitCost.toString() || '0').toFixed(2)}`,
  },
  {
    accessorKey: "retailPrice",
    header: "Retail Price",
    cell: ({ row }) => `$${parseFloat(row.original.retailPrice.toString() || '0').toFixed(2)}`,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex space-x-2">
        <Button variant="outline" size="sm" onClick={() => handleQuickView(row.original)}>
          <Eye className="h-4 w-4 mr-1" /> View
        </Button>
        {canManageInventory && (
          <Link to={`/inventory/${row.original.id}`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
          </Link>
        )}
        {canDeleteInventory && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeleteItemClick(row.original.id, row.original.name)}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        )}
      </div>
    ),
  },
];

const Inventory: React.FC = () => {
  const { inventoryItems, deleteInventoryItem, refreshInventory, isLoadingInventory } = useInventory();
  const { categories } = useCategories();
  const { vendors } = useVendors();
  const { inventoryFolders, addInventoryFolder, updateInventoryFolder, removeInventoryFolder } = useOnboarding();
  const { isCollapsed } = useSidebar();
  const navigate = useNavigate();
  const { profile } = useProfile(); // NEW: Get profile for role checks

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddInventoryDialogOpen, setIsAddInventoryDialogOpen] = useState(false);
  const [isManageCategoriesDialogOpen, setIsManageCategoriesDialogOpen] = useState(false);
  const [isManageFoldersDialogOpen, setIsManageFoldersDialogOpen] = useState(false); // Renamed state
  const [isScanItemDialogOpen, setIsScanItemDialogOpen] = useState(false);
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [isImportCsvDialogOpen, setIsImportCsvDialogOpen] = useState(false);
  const [isAutoReorderSettingsDialogOpen, setIsAutoReorderSettingsDialogOpen] = useState(false);

  const [isConfirmDeleteItemDialogOpen, setIsConfirmDeleteItemDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  const [isConfirmDeleteFolderDialogOpen, setIsConfirmDeleteFolderDialogOpen] = useState(false); // Corrected state variable name
  const [folderToDelete, setFolderToDelete] = useState<InventoryFolder | null>(null);

  const [isQuickViewDialogOpen, setIsQuickViewDialogOpen] = useState(false);
  const [selectedItemForQuickView, setSelectedItemForQuickView] = useState<InventoryItem | null>(null);

  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // State for Add/Edit Folder Dialog
  const [isFolderLabelGeneratorOpen, setIsFolderLabelGeneratorOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<InventoryFolder | null>(null);

  // NEW: Role-based permissions
  const canViewInventory = profile?.role === 'admin' || profile?.role === 'inventory_manager' || profile?.role === 'viewer';
  const canManageInventory = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canDeleteInventory = profile?.role === 'admin' || profile?.role === 'inventory_manager'; // Often delete is restricted to admin, but for now, manager can too.
  const canManageFolders = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canManageCategories = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canUseTools = profile?.role === 'admin' || profile?.role === 'inventory_manager';


  useEffect(() => {
    refreshInventory();
  }, [refreshInventory]);

  const vendorNameMap = useMemo(() => {
    return new Map(vendors.map(vendor => [vendor.id, vendor.name]));
  }, [vendors]);

  const topLevelFolders = useMemo(() => {
    return inventoryFolders.filter(folder => !folder.parentId);
  }, [inventoryFolders]);

  // RECURSIVE FUNCTION TO GET ALL ITEMS IN A FOLDER AND ITS SUBFOLDERS
  const getItemsInFolderRecursive = useCallback((folderId: string, allItems: InventoryItem[], allFolders: InventoryFolder[]): InventoryItem[] => {
    let items = allItems.filter(item => item.folderId === folderId);
    const directSubfolders = allFolders.filter(folder => folder.parentId === folderId);

    for (const subfolder of directSubfolders) {
      items = items.concat(getItemsInFolderRecursive(subfolder.id, allItems, allFolders));
    }
    return items;
  }, []);

  const getFolderItemCounts = useCallback((folderId: string) => {
    const itemsInFolderAndSubfolders = getItemsInFolderRecursive(folderId, inventoryItems, inventoryFolders);
    const directSubfolders = inventoryFolders.filter(folder => folder.parentId === folderId);
    return { itemCount: itemsInFolderAndSubfolders.length, subfolderCount: directSubfolders.length };
  }, [inventoryItems, inventoryFolders, getItemsInFolderRecursive]);

  const filteredItems = useMemo(() => {
    return inventoryItems
      .filter(item => {
        const matchesSearch =
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (inventoryFolders.find(f => f.id === item.folderId)?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || // Search by folder name
          (item.vendorId ? (vendorNameMap.get(item.vendorId) || "").toLowerCase().includes(searchTerm.toLowerCase()) : false);

        const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .map(item => ({
        ...item,
        vendorName: item.vendorId ? vendorNameMap.get(item.vendorId) || '-' : '-',
      }));
  }, [inventoryItems, searchTerm, vendorNameMap, categoryFilter, statusFilter, inventoryFolders]);

  const handleDeleteItemClick = useCallback((itemId: string, itemName: string) => {
    if (!canDeleteInventory) {
      showError("You do not have permission to delete inventory items.");
      return;
    }
    setItemToDelete({ id: itemId, name: itemName });
    setIsConfirmDeleteItemDialogOpen(true);
  }, [canDeleteInventory]);

  const confirmDeleteItem = async () => {
    if (itemToDelete) {
      await deleteInventoryItem(itemToDelete.id);
    }
    setIsConfirmDeleteItemDialogOpen(false);
    setItemToDelete(null);
  };

  const handleQuickView = useCallback((item: InventoryItem) => {
    setSelectedItemForQuickView(item);
    setIsQuickViewDialogOpen(true);
  }, []);

  const handleScanItem = () => {
    if (!canUseTools) {
      showError("You do not have permission to use inventory tools.");
      return;
    }
    setIsScanItemDialogOpen(true);
  };

  const handleCreateOrder = useCallback((item: InventoryItem) => {
    showError(`Create order for ${item.name} (feature not implemented yet)`);
  }, []);

  const navigateToFolder = useCallback((folderId: string) => {
    navigate(`/folders/${folderId}`);
  }, [navigate]);

  const columnsForDataTable = useMemo(() => createInventoryColumns(
    handleQuickView,
    inventoryFolders,
    navigateToFolder,
    handleDeleteItemClick, // Pass handleDeleteItemClick
    canManageInventory,
    canDeleteInventory
  ), [handleQuickView, inventoryFolders, navigateToFolder, handleDeleteItemClick, canManageInventory, canDeleteInventory]);

  // Folder management handlers
  const handleAddFolderClick = () => {
    if (!canManageFolders) {
      showError("You do not have permission to add folders.");
      return;
    }
    setFolderToEdit(null); // Clear any existing folder data
    setIsFolderLabelGeneratorOpen(true);
  };

  const handleEditFolderClick = (folder: InventoryFolder) => {
    if (!canManageFolders) {
      showError("You do not have permission to edit folders.");
      return;
    }
    setFolderToEdit(folder);
    setIsFolderLabelGeneratorOpen(true);
  };

  const handleDeleteFolderClick = (folder: InventoryFolder) => {
    if (!canManageFolders) {
      showError("You do not have permission to delete folders.");
      return;
    }
    setFolderToDelete(folder);
    setIsConfirmDeleteFolderDialogOpen(true); // Corrected state variable name
  };

  const confirmDeleteFolder = async () => {
    if (folderToDelete) {
      const { itemCount, subfolderCount } = getFolderItemCounts(folderToDelete.id);
      if (itemCount > 0 || subfolderCount > 0) {
        showError(`Cannot delete folder "${folderToDelete.name}". It contains ${itemCount} items and ${subfolderCount} subfolders. Please empty it first.`);
        setIsConfirmDeleteFolderDialogOpen(false); // Corrected state variable name
        setFolderToDelete(null);
        return;
      }
      await removeInventoryFolder(folderToDelete.id);
    }
    setIsConfirmDeleteFolderDialogOpen(false); // Corrected state variable name
    setFolderToDelete(null);
  };

  const handleSaveFolder = async (newFolderData: Omit<InventoryFolder, 'id' | 'createdAt' | 'userId' | 'organizationId'>, isNew: boolean) => {
    if (isNew) {
      await addInventoryFolder(newFolderData);
    } else if (folderToEdit) {
      await updateInventoryFolder({ ...folderToEdit, ...newFolderData });
    }
    setIsFolderLabelGeneratorOpen(false);
  };

  if (!canViewInventory) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border">
          <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
          <CardContent>
            <p className="text-muted-foreground">You do not have permission to view inventory.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 flex-grow" data-testid="inventory-page-root">
      <h1 className="text-3xl font-bold">Inventory Management</h1>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by name, SKU, or description..."
          className="flex-grow max-w-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="In Stock">In Stock</SelectItem>
            <SelectItem value="Low Stock">Low Stock</SelectItem>
            <SelectItem value="Out of Stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>

        {searchTerm && ( // Only show if there's an active search
          <div className="flex items-center ml-auto space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "table" ? "secondary" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Table View</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "card" ? "secondary" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("card")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Card View</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      <Card className="flex-grow rounded-md border flex flex-col">
        <CardHeader className="pb-4 flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-xl font-semibold">Inventory Overview</CardTitle>
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            {canManageFolders && (
              <Button onClick={handleAddFolderClick} size="sm">
                <PlusCircle className="h-4 w-4 mr-2" /> Add New Folder
              </Button>
            )}
            {canManageInventory && (
              <Button onClick={() => setIsAddInventoryDialogOpen(true)} size="sm">
                <PlusCircle className="h-4 w-4 mr-2" /> Add New Item
              </Button>
            )}
            {canManageCategories && (
              <Button variant="outline" onClick={() => setIsManageCategoriesDialogOpen(true)} size="sm">
                Manage Categories
              </Button>
            )}
            {canUseTools && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <PackagePlus className="h-4 w-4 mr-2" /> Tools <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleScanItem}>
                    <ScanIcon className="h-4 w-4 mr-2" /> Scan Item
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsImportCsvDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" /> Import CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsBulkUpdateDialogOpen(true)}>
                    <PackagePlus className="h-4 w-4 mr-2" /> Bulk Update
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsAutoReorderSettingsDialogOpen(true)}>
                    <Repeat className="h-4 w-4 mr-2" /> Auto-Reorder Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto">
          {isLoadingInventory ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading inventory...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top-level Folders Display */}
              {topLevelFolders.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {topLevelFolders.map((folder: InventoryFolder) => {
                    const { itemCount, subfolderCount } = getFolderItemCounts(folder.id);
                    return (
                      <FolderCard
                        key={folder.id}
                        folder={folder}
                        onEdit={handleEditFolderClick}
                        onDelete={handleDeleteFolderClick}
                        itemCount={itemCount}
                        subfolderCount={subfolderCount}
                        canManageFolders={canManageFolders} // NEW: Pass permission
                      />
                    );
                  })}
                </div>
              )}

              {/* All Items (if no specific folder is selected, or for global search) */}
              {searchTerm && filteredItems.length > 0 ? (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4">Search Results ({filteredItems.length})</h2>
                  {viewMode === "table" && (
                    <DataTable columns={columnsForDataTable} data={filteredItems} />
                  )}
                  {viewMode === "card" && (
                    <InventoryCardGrid
                      items={filteredItems}
                      onAdjustStock={handleQuickView}
                      onCreateOrder={handleCreateOrder}
                      onViewDetails={handleQuickView}
                      onDeleteItem={handleDeleteItemClick}
                      isSidebarCollapsed={isCollapsed}
                    />
                  )}
                </div>
              ) : (
                !searchTerm && topLevelFolders.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No inventory items or folders found. Add your first folder or item!</p>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AddInventoryDialog
        isOpen={isAddInventoryDialogOpen}
        onClose={() => setIsAddInventoryDialogOpen(false)}
      />
      <ManageFoldersDialog
        isOpen={isManageFoldersDialogOpen}
        onClose={() => setIsManageFoldersDialogOpen(false)}
      />
      <CategoryManagementDialog
        isOpen={isManageCategoriesDialogOpen}
        onClose={() => setIsManageCategoriesDialogOpen(false)}
      />
      <ScanItemDialog
        isOpen={isScanItemDialogOpen}
        onClose={() => setIsScanItemDialogOpen(false)}
      />
      <BulkUpdateDialog
        isOpen={isBulkUpdateDialogOpen}
        onClose={() => setIsBulkUpdateDialogOpen(false)}
      />
      <ImportCsvDialog
        isOpen={isImportCsvDialogOpen}
        onClose={() => setIsImportCsvDialogOpen(false)}
      />
      <AutoReorderSettingsDialog
        isOpen={isAutoReorderSettingsDialogOpen}
        onClose={() => setIsAutoReorderSettingsDialogOpen(false)}
      />
      {itemToDelete && (
        <ConfirmDialog
          isOpen={isConfirmDeleteItemDialogOpen}
          onClose={() => setIsConfirmDeleteItemDialogOpen(false)}
          onConfirm={confirmDeleteItem}
          title="Confirm Item Dletion"
          description={`Are you sure you want to delete "${itemToDelete.name}" (SKU: ${itemToDelete.id})? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
      {folderToDelete && (
        <ConfirmDialog
          isOpen={isConfirmDeleteFolderDialogOpen} // Corrected state variable name
          onClose={() => setIsConfirmDeleteFolderDialogOpen(false)} // Corrected state variable name
          onConfirm={confirmDeleteFolder}
          title="Confirm Folder Deletion"
          description={
            <div>
              <p>Are you sure you want to delete the folder "<span className="font-semibold">{folderToDelete.name}</span>"?</p>
              <p className="text-destructive font-semibold mt-2">
                This action cannot be undone. All {getFolderItemCounts(folderToDelete.id).itemCount} items and {getFolderItemCounts(folderToDelete.id).subfolderCount} subfolders within this folder will be unassigned or deleted.
              </p>
            </div>
          }
          confirmText="Delete Folder"
          cancelText="Cancel"
        />
      )}
      <InventoryItemQuickViewDialog
        isOpen={isQuickViewDialogOpen}
        onClose={() => setIsQuickViewDialogOpen(false)}
        item={selectedItemForQuickView}
      />

      {/* Folder Label Generator Dialog (for adding/editing folders) */}
      <Dialog open={isFolderLabelGeneratorOpen} onOpenChange={setIsFolderLabelGeneratorOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{folderToEdit ? "Edit Folder & Generate Labels" : "Add New Folder & Generate Labels"}</DialogTitle>
            <DialogDescription>
              {folderToEdit ? "Update details for this folder and generate new labels." : "Define a new folder and generate scannable QR code labels."}
            </DialogDescription>
          </DialogHeader>
          <FolderLabelGenerator
            initialFolder={folderToEdit}
            onSave={handleSaveFolder}
            onClose={() => setIsFolderLabelGeneratorOpen(false)}
            disabled={!canManageFolders} // NEW: Disable generator if no permission
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;