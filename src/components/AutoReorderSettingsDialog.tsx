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
import { Switch } from "@/components/ui/switch";
import { showSuccess, showError } from "@/utils/toast";
import { Repeat, Loader2 } from "lucide-react";
import { useProfile } from "@/context/ProfileContext"; // Corrected import

interface AutoReorderSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AutoReorderSettingsDialog: React.FC<AutoReorderSettingsDialogProps> = ({ isOpen, onClose }) => {
  const { profile, isLoadingProfile, updateCompanyProfile } = useProfile();
  const [defaultReorderLevel, setDefaultReorderLevel] = useState("0");
  const [enableAutoReorderNotifications, setEnableAutoReorderNotifications] = useState(false);
  const [enableAutoReorder, setEnableAutoReorder] = useState(false); // Corrected typo here
  const [isSaving, setIsSaving] = useState(false);

  // Role-based permissions
  const canManageInventory = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  useEffect(() => {
    if (isOpen && !isLoadingProfile && profile?.companyProfile) {
      setDefaultReorderLevel(String(profile.companyProfile.defaultReorderLevel || 0));
      setEnableAutoReorderNotifications(profile.companyProfile.enableAutoReorderNotifications || false);
      setEnableAutoReorder(profile.companyProfile.enableAutoReorder || false); // Corrected typo here
    } else if (isOpen && !isLoadingProfile && !profile?.companyProfile) {
      // If no company profile, reset to defaults
      setDefaultReorderLevel("0");
      setEnableAutoReorderNotifications(false);
      setEnableAutoReorder(false);
    }
  }, [isOpen, isLoadingProfile, profile?.companyProfile]);

  const handleSaveSettings = async () => {
    if (!canManageInventory) {
      showError("No permission to save settings.");
      return;
    }
    const parsedLevel = parseInt(defaultReorderLevel);
    if (isNaN(parsedLevel) || parsedLevel < 0) {
      showError("Reorder Level must be non-negative.");
      return;
    }

    if (!profile?.organizationId) {
      showError("Org not found. Cannot save settings.");
      return;
    }

    setIsSaving(true);
    try {
      await updateCompanyProfile({
        defaultReorderLevel: parsedLevel,
        enableAutoReorderNotifications: enableAutoReorderNotifications,
        enableAutoReorder: enableAutoReorder, // Corrected typo here
      });
      showSuccess("Auto-reorder settings saved!");
      onClose();
    } catch (error: any) {
      console.error("Error saving auto-reorder settings:", error);
      showError(`Failed to save settings: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-6 w-6 text-primary" /> Auto-Reorder Settings
          </DialogTitle>
          <DialogDescription>
            Configure global rules for automatic reordering and notifications.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="defaultReorderLevel">Default Reorder Level</Label>
            <Input
              id="defaultReorderLevel"
              type="number"
              value={defaultReorderLevel}
              onChange={(e) => setDefaultReorderLevel(e.target.value)}
              placeholder="e.g., 10"
              min="0"
              disabled={isLoadingProfile || !canManageInventory}
            />
            <p className="text-xs text-muted-foreground">
              This value will be suggested for new items' reorder levels.
            </p>
          </div>
          <div className="flex items-center justify-between space-x-2 pt-2">
            <Label htmlFor="enableAutoReorder">
              Enable Global Auto-Reorder System
            </Label>
            <Switch
              id="enableAutoReorder"
              checked={enableAutoReorder}
              onCheckedChange={setEnableAutoReorder}
              disabled={isLoadingProfile || !canManageInventory}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            When enabled, items with individual auto-reorder settings will trigger purchase orders.
          </p>
          <div className="flex items-center justify-between space-x-2 pt-2">
            <Label htmlFor="enableAutoReorderNotifications">
              Enable Auto-Reorder Notifications
            </Label>
            <Switch
              id="enableAutoReorderNotifications"
              checked={enableAutoReorderNotifications}
              onCheckedChange={setEnableAutoReorderNotifications}
              disabled={isLoadingProfile || !canManageInventory}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Receive alerts when items hit their reorder level.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSaveSettings} disabled={isSaving || isLoadingProfile || !canManageInventory}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AutoReorderSettingsDialog;