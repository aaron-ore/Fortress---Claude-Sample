import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useOnboarding, InventoryFolder } from "@/context/OnboardingContext";
import { showSuccess, showError } from "@/utils/toast";
import { PlusCircle, Trash2, Folder, Edit } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProfile } from "@/context/ProfileContext";

interface ManageFoldersDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManageFoldersDialog: React.FC<ManageFoldersDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { inventoryFolders, addInventoryFolder, removeInventoryFolder, updateInventoryFolder } = useOnboarding();
  const { profile } = useProfile(); // NEW: Get profile for role checks

  // NEW: Role-based permissions
  const canManageFolders = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  const [newFolderName, setNewFolderName] = useState("");
  const [folderToEdit, setFolderToEdit] = useState<InventoryFolder | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  // State for delete confirmation dialog
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<InventoryFolder | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFolderToEdit(null);
      setEditingFolderName("");
      setNewFolderName("");
    }
  }, [isOpen]);

  const handleAddFolder = async () => {
    if (!canManageFolders) { // NEW: Check permission before adding
      showError("No permission to add folders.");
      return;
    }
    if (newFolderName.trim() === "") {
      showError("Folder name empty.");
      return;
    }
    // Check if folder name already exists at the root level (for simplicity, no parent_id check here)
    const existingFolder = inventoryFolders.find((folder: InventoryFolder) => // Explicitly type folder
      folder.name.toLowerCase() === newFolderName.trim().toLowerCase()
    );
    if (existingFolder) {
      showError("Folder already exists.");
      return;
    }

    // Default color for new folders
    const defaultColor = "#4CAF50"; // Green

    const newFolder: Omit<InventoryFolder, "id" | "createdAt" | "userId" | "organizationId"> = { // Create InventoryFolder object
      name: newFolderName.trim(),
      color: defaultColor,
      // parentId, description, imageUrl, tags can be added via a more detailed dialog
    };

    await addInventoryFolder(newFolder); // Updated context function
    showSuccess(`Folder "${newFolderName.trim()}" added.`);
    setNewFolderName("");
  };

  const handleEditFolderClick = (folder: InventoryFolder) => {
    if (!canManageFolders) { // NEW: Check permission before editing
      showError("No permission to edit folders.");
      return;
    }
    setFolderToEdit(folder);
    setEditingFolderName(folder.name);
  };

  const handleSaveEditedFolder = async () => {
    if (!canManageFolders) { // NEW: Check permission before saving
      showError("No permission to save changes.");
      return;
    }
    if (!folderToEdit || !editingFolderName.trim()) {
      showError("Folder name empty.");
      return;
    }

    // Check for duplicate name, excluding the folder being edited
    const duplicateExists = inventoryFolders.some((f: InventoryFolder) => // Explicitly type f
      f.name.toLowerCase() === editingFolderName.trim().toLowerCase() && f.id !== folderToEdit.id
    );
    if (duplicateExists) {
      showError("Folder name already exists.");
      return;
    }

    await updateInventoryFolder({ ...folderToEdit, name: editingFolderName.trim() });
    showSuccess(`Folder "${editingFolderName.trim()}" updated.`);
    setFolderToEdit(null);
    setEditingFolderName("");
  };

  const handleRemoveFolderClick = (folder: InventoryFolder) => { // Renamed from handleRemoveLocationClick
    if (!canManageFolders) { // NEW: Check permission before removing
      showError("No permission to delete folders.");
      return;
    }
    setFolderToDelete(folder);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmRemoveFolder = async () => { // Renamed from confirmRemoveLocation
    if (folderToDelete) {
      await removeInventoryFolder(folderToDelete.id); // Updated context function
      showSuccess(`Folder "${folderToDelete.name}" removed.`);
    }
    setIsConfirmDeleteDialogOpen(false);
    setFolderToDelete(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-6 w-6 text-primary" /> Manage Inventory Folders {/* Updated icon and title */}
          </DialogTitle>
          <DialogDescription>
            Add, view, edit, or remove your inventory organization folders.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newFolder">New Folder Name</Label> {/* Updated label */}
            <div className="flex gap-2">
              <Input
                id="newFolder"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g., Main Warehouse, Electronics"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddFolder();
                  }
                }}
                disabled={!canManageFolders} // NEW: Disable input if no permission
              />
              <Button onClick={handleAddFolder} disabled={!canManageFolders}>
                <PlusCircle className="h-4 w-4 mr-2" /> Add
              </Button>
            </div>
          </div>

          {inventoryFolders.length > 0 && (
            <div className="space-y-2">
              <Label>Existing Folders</Label> {/* Updated label */}
              <ScrollArea className="border border-border rounded-md p-3 bg-muted/20 max-h-40 overflow-y-auto">
                <ul className="space-y-1">
                  {inventoryFolders.map((folder: InventoryFolder) => ( // Explicitly type folder
                    <li key={folder.id} className="flex items-center justify-between py-1 text-foreground">
                      {folderToEdit?.id === folder.id ? (
                        <Input
                          value={editingFolderName}
                          onChange={(e) => setEditingFolderName(e.target.value)}
                          onBlur={handleSaveEditedFolder}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEditedFolder();
                            }
                          }}
                          autoFocus
                          disabled={!canManageFolders} // NEW: Disable input if no permission
                        />
                      ) : (
                        <span>{folder.name}</span>
                      )}
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditFolderClick(folder)}
                          aria-label={`Edit folder ${folder.name}`}
                          disabled={!canManageFolders} // NEW: Disable button if no permission
                        >
                          <Edit className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFolderClick(folder)}
                          aria-label={`Remove folder ${folder.name}`}
                          disabled={!canManageFolders} // NEW: Disable button if no permission
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}
          </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
      {folderToDelete && (
        <ConfirmDialog
          isOpen={isConfirmDeleteDialogOpen}
          onClose={() => setIsConfirmDeleteDialogOpen(false)}
          onConfirm={confirmRemoveFolder}
          title="Confirm Folder Deletion"
          description={`Are you sure you want to delete the folder "${folderToDelete.name}"? This cannot be undone and will unassign all items within it.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </Dialog>
  );
};

export default ManageFoldersDialog;