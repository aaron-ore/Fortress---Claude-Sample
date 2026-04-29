"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, MoreVertical, Edit, Trash2, Package } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { InventoryFolder } from "@/context/OnboardingContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useNavigate } from "react-router-dom";
import { showError } from "@/utils/toast";


interface FolderCardProps {
  folder: InventoryFolder;
  onEdit: (folder: InventoryFolder) => void;
  onDelete: (folder: InventoryFolder) => void;
  itemCount: number;
  subfolderCount: number;
  canManageFolders: boolean; // NEW: Add canManageFolders prop
}

const FolderCard: React.FC<FolderCardProps> = ({
  folder,
  onEdit,
  onDelete,
  itemCount,
  subfolderCount,
  canManageFolders, // NEW: Destructure canManageFolders
}) => {
  const navigate = useNavigate();
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);

  const handleCardClick = () => {
    navigate(`/folders/${folder.id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from triggering
    if (!canManageFolders) { // NEW: Check permission before deleting
      showError("No permission to delete folders.");
      return;
    }
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    onDelete(folder);
    setIsConfirmDeleteDialogOpen(false);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from triggering
    if (!canManageFolders) { // NEW: Check permission before editing
      showError("No permission to edit folders.");
      return;
    }
    onEdit(folder);
  };

  return (
    <>
      <Card
        className={cn(
          "relative group bg-card border-border rounded-lg shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer",
          "flex flex-col justify-between p-4 aspect-square"
        )}
        onClick={handleCardClick}
      >
        <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Folder className="h-6 w-6 text-primary" style={{ color: folder.color }} />
            <CardTitle className="text-lg font-semibold text-foreground flex-1 min-w-0">
              {folder.name}
            </CardTitle>
          </div>
          {canManageFolders && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {/* Removed opacity-0 and group-hover:opacity-100 to make the button always visible */}
                {/* Added onClick to stop propagation so clicking the dots doesn't trigger card navigation */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEditClick}>
                  <Edit className="h-4 w-4 mr-2" /> Edit Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        <CardContent className="p-0 flex-grow flex flex-col justify-end">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-1">
              <Folder className="h-4 w-4 text-muted-foreground" /> {subfolderCount} Subfolders
            </p>
            <p className="flex items-center gap-1">
              <Package className="h-4 w-4 text-muted-foreground" /> {itemCount} Items
            </p>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={isConfirmDeleteDialogOpen}
        onClose={() => setIsConfirmDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Confirm Folder Deletion"
        description={
          <div>
            <p>Are you sure you want to delete the folder "<span className="font-semibold">{folder.name}</span>"?</p>
            <p className="text-destructive font-semibold mt-2">
              This action cannot be undone. All {itemCount} items and {subfolderCount} subfolders within this folder will be unassigned or deleted.
            </p>
          </div>
        }
        confirmText="Delete Folder"
        cancelText="Cancel"
      />
    </>
  );
};

export default FolderCard;