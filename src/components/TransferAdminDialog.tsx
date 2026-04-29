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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users as UsersIcon, AlertTriangle } from "lucide-react";
import { useProfile, UserProfile } from "@/context/ProfileContext";
import { showError, showSuccess } from "@/utils/toast";
import ConfirmDialog from "@/components/ConfirmDialog";

interface TransferAdminDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const TransferAdminDialog: React.FC<TransferAdminDialogProps> = ({ isOpen, onClose }) => {
  const { profile, allProfiles, transferAdminRole, isLoadingAllProfiles, fetchAllProfiles } = useProfile();
  const [selectedNewAdminId, setSelectedNewAdminId] = useState<string | null>(null);
  const [isConfirmTransferOpen, setIsConfirmTransferOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedNewAdminId(null);
      fetchAllProfiles(); // Ensure we have the latest list of users
    }
  }, [isOpen, fetchAllProfiles]);

  const nonAdminUsers = allProfiles.filter(
    (user: UserProfile) => user.id !== profile?.id && user.role !== 'admin'
  );

  const handleTransferClick = () => {
    if (!selectedNewAdminId) {
      showError("Please select a user to transfer admin role to.");
      return;
    }
    setIsConfirmTransferOpen(true);
  };

  const confirmTransfer = async () => {
    if (!profile?.id || !selectedNewAdminId) {
      showError("Current admin or new admin not identified.");
      return;
    }
    setIsTransferring(true);
    try {
      await transferAdminRole(selectedNewAdminId);
      showSuccess("Admin role transferred successfully!");
      onClose();
    } catch (error: any) {
      console.error("Error during admin role transfer:", error);
      showError(`Failed to transfer admin role: ${error.message}`);
    } finally {
      setIsTransferring(false);
      setIsConfirmTransferOpen(false);
    }
  };

  const selectedNewAdminName = allProfiles.find(u => u.id === selectedNewAdminId)?.fullName || "selected user";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersIcon className="h-6 w-6 text-primary" /> Transfer Admin Role
            </DialogTitle>
            <DialogDescription>
              Select a user to transfer your administrator privileges to. Your role will be changed to 'Inventory Manager'.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newAdminSelect">Select New Administrator</Label>
              {isLoadingAllProfiles ? (
                <div className="flex items-center justify-center h-10">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading users...</span>
                </div>
              ) : nonAdminUsers.length === 0 ? (
                <p className="text-muted-foreground text-sm">No other non-admin users available in your organization.</p>
              ) : (
                <Select value={selectedNewAdminId || ""} onValueChange={setSelectedNewAdminId} disabled={isTransferring}>
                  <SelectTrigger id="newAdminSelect">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {nonAdminUsers.map((user: UserProfile) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.fullName} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500 rounded-md flex items-start gap-2 text-sm text-yellow-900">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p>
                <span className="font-semibold">Important:</span> After this action, your role will be automatically changed to 'Inventory Manager'. The selected user will become the new 'Admin'.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isTransferring}>
              Cancel
            </Button>
            <Button onClick={handleTransferClick} disabled={!selectedNewAdminId || isTransferring || nonAdminUsers.length === 0}>
              {isTransferring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Transferring...
                </>
              ) : (
                "Transfer Admin Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmTransferOpen}
        onClose={() => setIsConfirmTransferOpen(false)}
        onConfirm={confirmTransfer}
        title="Confirm Admin Role Transfer"
        description={
          <div>
            <p>Are you sure you want to transfer your admin role to <span className="font-semibold">{selectedNewAdminName}</span>?</p>
            <p className="text-destructive font-semibold mt-2">
              Your role will be changed to 'Inventory Manager' and this action cannot be easily undone.
            </p>
          </div>
        }
        confirmText="Confirm Transfer"
        cancelText="Cancel"
        isConfirming={isTransferring}
      />
    </>
  );
};

export default TransferAdminDialog;