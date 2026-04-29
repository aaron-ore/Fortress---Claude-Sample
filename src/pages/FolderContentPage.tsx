import React, { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { List, LayoutGrid, Folder, Loader2, AlertTriangle, PlusCircle } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { useOnboarding, InventoryFolder } from "@/context/OnboardingContext";
import { createInventoryColumns } from "@/pages/Inventory"; // Reusing columns from Inventory page
import InventoryCardGrid from "@/components/inventory/InventoryCardGrid";
import InventoryItemQuickViewDialog from "@/components/InventoryItemQuickViewDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useSidebar } from "@/context/SidebarContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { showError } from "@/utils/toast";
import FolderCard from "@/components/inventory/FolderCard"; // Import FolderCard
import FolderLabelGenerator from "@/components/FolderLabelGenerator"; // Import FolderLabelGenerator
import AddInventoryDialog from "@/components/AddInventoryDialog"; // Import AddInventoryDialog
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useProfile } from "@/context/ProfileContext"; // Corrected import

const FolderContentPage: React.FC = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const { inventoryItems, deleteInventoryItem, isLoadingInventory, refreshInventory } = useInventory();
  const { inventoryFolders, addInventoryFolder, updateInventoryFolder, removeInventoryFolder } = useOnboarding();
  const { isLoadingProfile, profile } = useProfile(); // FIXED: Get isLoadingProfile from useProfile
  const { isCollapsed } = useSidebar(); // Use isCollapsed from SidebarContext


  // NEW: Role-based permissions
  const canViewInventory = profile?.role === 'admin' || profile?.role === 'inventory_manager' || profile?.role === 'viewer';
  const canManageInventory = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canDeleteInventory = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canManageFolders = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  const [isConfirmDeleteItemDialogOpen, setIsConfirmDeleteItemDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  const [isConfirmDeleteFolderDialogOpen, setIsConfirmDeleteFolderDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<InventoryFolder | null>(null);

  const [isQuickViewDialogOpen, setIsQuickViewDialogOpen] = useState(false);
  const [selectedItemForQuickView, setSelectedItemForQuickView] = useState<InventoryItem | null>(null);

  const [isAddSubfolderDialogOpen, setIsAddSubfolderDialogOpen] = useState(false);
  const [isEditSubfolderDialogOpen, setIsEditSubfolderDialogOpen] = useState(false);
  const [subfolderToEdit, setSubfolderToEdit] = useState<InventoryFolder | null>(null);

  const [isAddInventoryItemToFolderDialogOpen, setIsAddInventoryItemToFolderDialogOpen] = useState(false);

  const currentFolder = useMemo(() => {
    if (isLoadingProfile) return null;
    return inventoryFolders.find(folder => folder.id === folderId);
  }, [folderId, inventoryFolders, isLoadingProfile]);

  const subfolders = useMemo(() => {
    return inventoryFolders.filter(folder => folder.parentId === folderId);
  }, [inventoryFolders, folderId]);

  const itemsInCurrentFolder = useMemo(() => {
    return inventoryItems.filter(item => item.folderId === folderId);
  }, [inventoryItems, folderId]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) {
      return itemsInCurrentFolder;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return itemsInCurrentFolder.filter(item =>
      item.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      item.sku.toLowerCase().includes(lowerCaseSearchTerm) ||
      item.description.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [itemsInCurrentFolder, searchTerm]);

  const getFolderItemCounts = useCallback((fId: string) => {
    const items = inventoryItems.filter(item => item.folderId === fId);
    const subfoldersIn = inventoryFolders.filter(folder => folder.parentId === fId);
    return { itemCount: items.length, subfolderCount: subfoldersIn.length };
  }, [inventoryItems, inventoryFolders]);

  const handleQuickView = useCallback((item: InventoryItem) => {
    setSelectedItemForQuickView(item);
    setIsQuickViewDialogOpen(true);
  }, []);

  const handleDeleteItemClick = useCallback((itemId: string, itemName: string) => {
    if (!canDeleteInventory) { // NEW: Check permission before deleting
      showError("You do not have permission to delete inventory items.");
      return;
    }
    setItemToDelete({ id: itemId, name: itemName });
    setIsConfirmDeleteItemDialogOpen(true);
  }, [canDeleteInventory]);

  const confirmDeleteItem = async () => {
    if (itemToDelete) {
      await deleteInventoryItem(itemToDelete.id);
      refreshInventory(); // Refresh to update the list after deletion
    }
    setIsConfirmDeleteItemDialogOpen(false);
    setItemToDelete(null);
  };

  const handleCreateOrder = useCallback((item: InventoryItem) => {
    showError(`Create order for ${item.name} (feature not implemented yet)`);
  }, []);

  const navigateToFolder = useCallback((id: string) => {
    navigate(`/folders/${id}`);
  }, [navigate]);

  const columnsForDataTable = useMemo(() => createInventoryColumns(
    handleQuickView,
    inventoryFolders,
    navigateToFolder,
    handleDeleteItemClick, // Pass handleDeleteItemClick
    canManageInventory,
    canDeleteInventory
  ), [handleQuickView, inventoryFolders, navigateToFolder, handleDeleteItemClick, canManageInventory, canDeleteInventory]);

  // Subfolder management handlers
  const handleAddSubfolderClick = () => {
    if (!canManageFolders) { // NEW: Check permission before adding subfolder
      showError("You do not have permission to add subfolders.");
      return;
    }
    setIsAddSubfolderDialogOpen(true);
  };

  const handleEditSubfolderClick = (folder: InventoryFolder) => {
    if (!canManageFolders) { // NEW: Check permission before editing subfolder
      showError("You do not have permission to edit subfolders.");
      return;
    }
    setSubfolderToEdit(folder);
    setIsEditSubfolderDialogOpen(true);
  };

  const handleDeleteSubfolderClick = (folder: InventoryFolder) => {
    if (!canManageFolders) { // NEW: Check permission before deleting subfolder
      showError("You do not have permission to delete subfolders.");
      return;
    }
    setFolderToDelete(folder);
    setIsConfirmDeleteFolderDialogOpen(true);
  };

  const confirmDeleteFolder = async () => {
    if (folderToDelete) {
      const { itemCount, subfolderCount } = getFolderItemCounts(folderToDelete.id);
      if (itemCount > 0 || subfolderCount > 0) {
        showError(`Cannot delete folder "${folderToDelete.name}". It contains ${itemCount} items and ${subfolderCount} subfolders. Please empty it first.`);
        setIsConfirmDeleteFolderDialogOpen(false);
        setFolderToDelete(null);
        return;
      }
      await removeInventoryFolder(folderToDelete.id);
    }
    setIsConfirmDeleteFolderDialogOpen(false);
    setFolderToDelete(null);
  };

  const handleSaveSubfolder = async (newFolderData: Omit<InventoryFolder, 'id' | 'createdAt' | 'userId' | 'organizationId'>, isNew: boolean) => {
    if (!currentFolder) return;
    if (!canManageFolders) { // NEW: Check permission before saving subfolder
      showError("You do not have permission to save subfolder changes.");
      return;
    }

    if (isNew) {
      await addInventoryFolder({ ...newFolderData, parentId: currentFolder.id });
      setIsAddSubfolderDialogOpen(false);
    } else if (subfolderToEdit) {
      await updateInventoryFolder({ ...subfolderToEdit, ...newFolderData });
      setIsEditSubfolderDialogOpen(false);
      setSubfolderToEdit(null);
    }
  };

  const handleAddInventoryItemToFolderClick = () => {
    if (!canManageInventory) { // NEW: Check permission before adding item
      showError("You do not have permission to add inventory items.");
      return;
    }
    setIsAddInventoryItemToFolderDialogOpen(true);
  };

  if (!canViewInventory) { // NEW: Check permission for viewing page
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border">
          <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
          <CardContent>
            <p className="text-muted-foreground">You do not have permission to view folder contents.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingInventory || isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading folder contents...</span>
      </div>
    );
  }

  if (!currentFolder) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-destructive">
        <AlertTriangle className="h-16 w-16 mb-4" />
        <p className="text-lg">Folder not found.</p>
        <Button onClick={() => navigate("/folders")} className="mt-4">Back to Folders</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 flex-grow">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Folder className="h-8 w-8 text-primary" /> {currentFolder.name}
        </h1>
        <Button variant="outline" onClick={() => navigate("/folders")}>
          Back to All Folders
        </Button>
      </div>

      <p className="text-muted-foreground">
        Viewing contents of the "{currentFolder.name}" folder.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={`Search items in ${currentFolder.name}...`}
          className="flex-grow max-w-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="flex items-center ml-auto space-x-2">
          {(filteredItems.length > 0 || searchTerm) && ( // Only show if there are items in the folder or search results
            <>
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
            </>
          )}
        </div>
      </div>

      <Card className="flex-grow rounded-md border flex flex-col">
        <CardHeader className="pb-4 flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-xl font-semibold">Items & Subfolders ({subfolders.length + filteredItems.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {canManageFolders && (
              <Button onClick={handleAddSubfolderClick}>
                <PlusCircle className="h-4 w-4 mr-2" /> Add Subfolder
              </Button>
            )}
            {canManageInventory && (
              <Button onClick={handleAddInventoryItemToFolderClick}>
                <PlusCircle className="h-4 w-4 mr-2" /> Add Item to Folder
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto">
          {subfolders.length === 0 && filteredItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">This folder is empty.</p>
          ) : (
            <div className="space-y-6">
              {/* Subfolders Display */}
              {subfolders.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Subfolders ({subfolders.length})</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {subfolders.map(folder => {
                      const { itemCount, subfolderCount } = getFolderItemCounts(folder.id);
                      return (
                        <FolderCard
                          key={folder.id}
                          folder={folder}
                          onEdit={handleEditSubfolderClick}
                          onDelete={handleDeleteSubfolderClick}
                          itemCount={itemCount}
                          subfolderCount={subfolderCount}
                          canManageFolders={canManageFolders} // NEW: Pass permission
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Inventory Items Display */}
              {filteredItems.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold mb-4">Inventory Items ({filteredItems.length})</h2>
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
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {itemToDelete && (
        <ConfirmDialog
          isOpen={isConfirmDeleteItemDialogOpen}
          onClose={() => setIsConfirmDeleteItemDialogOpen(false)}
          onConfirm={confirmDeleteItem}
          title="Confirm Item Deletion"
          description={`Are you sure you want to delete "${itemToDelete.name}" (SKU: ${itemToDelete.id})? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
      {folderToDelete && (
        <ConfirmDialog
          isOpen={isConfirmDeleteFolderDialogOpen}
          onClose={() => setIsConfirmDeleteFolderDialogOpen(false)}
          onConfirm={confirmDeleteFolder}
          title="Confirm Folder Dletion"
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

      {/* Add Subfolder Dialog */}
      <Dialog open={isAddSubfolderDialogOpen} onOpenChange={setIsAddSubfolderDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Subfolder to "{currentFolder?.name}"</DialogTitle>
            <DialogDescription>Define a new subfolder within the current folder.</DialogDescription>
          </DialogHeader>
          <FolderLabelGenerator
            initialFolder={null}
            onSave={handleSaveSubfolder}
            onClose={() => setIsAddSubfolderDialogOpen(false)}
            parentId={currentFolder?.id}
            disabled={!canManageFolders} // NEW: Disable generator if no permission
          />
        </DialogContent>
      </Dialog>

      {/* Edit Subfolder Dialog */}
      {subfolderToEdit && (
        <Dialog open={isEditSubfolderDialogOpen} onOpenChange={setIsEditSubfolderDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Subfolder "{subfolderToEdit.name}"</DialogTitle>
              <DialogDescription>Update details for this subfolder.</DialogDescription>
            </DialogHeader>
            <FolderLabelGenerator
              initialFolder={subfolderToEdit}
              onSave={handleSaveSubfolder}
              onClose={() => { setIsEditSubfolderDialogOpen(false); setSubfolderToEdit(null); }}
              parentId={currentFolder?.id}
              disabled={!canManageFolders} // NEW: Disable generator if no permission
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Add Inventory Item to Folder Dialog */}
      <AddInventoryDialog
        isOpen={isAddInventoryItemToFolderDialogOpen}
        onClose={() => setIsAddInventoryItemToFolderDialogOpen(false)}
        initialFolderId={currentFolder?.id}
      />
    </div>
  );
};

export default FolderContentPage;