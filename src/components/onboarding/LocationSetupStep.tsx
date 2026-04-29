import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useOnboarding, InventoryFolder } from "@/context/OnboardingContext"; // Updated import to InventoryFolder
import { showError } from "@/utils/toast";
import { XCircle } from "lucide-react";
// Removed parseLocationString, buildLocationString as they are not directly used for folders

export interface FolderSetupStepProps { // Renamed interface
  onNext: () => void;
  onBack: () => void;
}

const FolderSetupStep: React.FC<FolderSetupStepProps> = ({ onNext, onBack }) => { // Renamed component
  const { inventoryFolders, addInventoryFolder, removeInventoryFolder } = useOnboarding(); // Updated context functions
  const [newFolderName, setNewFolderName] = useState(""); // Renamed from newLocationName

  const handleAddFolder = async () => { // Renamed from handleAddLocation
    if (newFolderName.trim() === "") {
      showError("Folder name empty.");
      return;
    }
    // Check if folder name already exists at the root level (for simplicity, no parent_id check here)
    const existingFolder = inventoryFolders.find(folder =>
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
    setNewFolderName("");
  };

  const handleRemoveFolder = async (folderId: string) => { // Renamed from handleRemoveLocation
    await removeInventoryFolder(folderId); // Updated context function
  };

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold text-foreground">Inventory Folder Setup</h2> {/* Updated title */}
      <p className="text-muted-foreground">Define your inventory organization folders (e.g., Main Warehouse, Store Front, Bin A1).</p> {/* Updated description */}

      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="newFolder">New Folder Name</Label> {/* Updated label */}
          <div className="flex gap-2">
            <Input
              id="newFolder"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g., Main Warehouse, Shelf A"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddFolder();
                }
              }}
            />
            <Button onClick={handleAddFolder}>Add</Button>
          </div>
        </div>

        {inventoryFolders.length > 0 && (
          <div className="space-y-2">
            <Label>Current Folders</Label> {/* Updated label */}
            <ul className="border border-border rounded-md p-3 bg-muted/20 max-h-40 overflow-y-auto">
              {inventoryFolders.map((folder) => ( // Iterate over InventoryFolder objects
                <li key={folder.id} className="flex items-center justify-between py-1 text-foreground">
                  <span>{folder.name}</span> {/* Display folder name */}
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveFolder(folder.id)}>
                    <XCircle className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Next</Button>
      </div>
    </div>
  );
};

export default FolderSetupStep; // Renamed export