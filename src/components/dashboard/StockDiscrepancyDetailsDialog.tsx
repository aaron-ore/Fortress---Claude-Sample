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
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, User, Clock, MapPin, Package, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useProfile, UserProfile } from "@/context/ProfileContext"; // Corrected import
import { showError, showSuccess } from "@/utils/toast";
import { format, startOfDay, endOfDay, isValid } from "date-fns";
import { DateRange } from "react-day-picker";
import ConfirmDialog from "@/components/ConfirmDialog";
import { parseAndValidateDate } from "@/utils/dateUtils";
import { useOnboarding } from "@/context/OnboardingContext"; // Now imports InventoryFolder

interface StockDiscrepancyDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dateRange: DateRange | undefined;
}

interface DiscrepancyLog {
  id: string;
  timestamp: string;
  userId: string;
  organizationId: string;
  itemId: string;
  itemName: string;
  folderId: string; // Changed from locationString to folderId
  locationType: string;
  originalQuantity: number;
  countedQuantity: number;
  difference: number;
  reason: string;
  status: string;
}

const StockDiscrepancyDetailsDialog: React.FC<StockDiscrepancyDetailsDialogProps> = ({ isOpen, onClose, dateRange }) => {
  const { profile, allProfiles, fetchAllProfiles } = useProfile();
  const { inventoryFolders } = useOnboarding(); // Renamed from locations
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [discrepancyToResolve, setDiscrepancyToResolve] = useState<DiscrepancyLog | null>(null);

  const fetchDiscrepancies = async () => {
    if (!profile?.organizationId) {
      setDiscrepancies([]);
      return;
    }

    setIsLoading(true);
    let query = supabase
      .from('discrepancies')
      .select('*')
      .eq('organization_id', profile.organizationId)
      .eq('status', 'pending')
      .order('timestamp', { ascending: false });

    const filterFrom = (dateRange?.from && isValid(dateRange.from)) ? startOfDay(dateRange.from) : null;
    const filterTo = (dateRange?.to && isValid(dateRange.to)) ? endOfDay(dateRange.to) : ((dateRange?.from && isValid(dateRange.from)) ? endOfDay(dateRange.from) : null);

    if (filterFrom && filterTo) {
      query = query.gte('timestamp', filterFrom.toISOString()).lte('timestamp', filterTo.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching discrepancies for dialog:", error);
      showError("Failed to load discrepancies.");
      setDiscrepancies([]);
    } else {
      const fetchedDiscrepancies: DiscrepancyLog[] = data.map((log: any) => ({
        id: log.id,
        timestamp: parseAndValidateDate(log.timestamp)?.toISOString() || new Date().toISOString(),
        userId: log.user_id,
        organizationId: log.organization_id,
        itemId: log.item_id,
        itemName: log.item_name,
        folderId: log.folder_id, // Updated to folderId
        locationType: log.location_type,
        originalQuantity: log.original_quantity,
        countedQuantity: log.counted_quantity,
        difference: log.difference,
        reason: log.reason,
        status: log.status,
      }));
      setDiscrepancies(fetchedDiscrepancies);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen && profile?.organizationId) {
      fetchDiscrepancies();
      fetchAllProfiles();
    }
  }, [isOpen, profile?.organizationId, fetchAllProfiles, dateRange]);

  const getUserName = (userId: string) => {
    const user = allProfiles.find((p: UserProfile) => p.id === userId); // Explicitly type p
    return user?.fullName || user?.email || "Unknown User";
  };

  // Function to get folder display name
  const getFolderName = (folderId: string) => {
    const foundFolder = inventoryFolders.find(folder => folder.id === folderId);
    return foundFolder?.name || "Unknown Folder";
  };

  const getDisplayDateRange = () => {
    const filterFrom = (dateRange?.from && isValid(dateRange.from)) ? dateRange.from : new Date();
    const filterTo = (dateRange?.to && isValid(dateRange.to)) ? dateRange.to : new Date();

    if (format(filterFrom, "yyyy-MM-dd") === format(filterTo, "yyyy-MM-dd")) {
      return format(filterFrom, "MMM dd, yyyy");
    } else {
      return `${format(filterFrom, "MMM dd, yyyy")} - ${format(filterTo, "MMM dd, yyyy")}`;
    }
  };

  const handleResolveClick = (discrepancy: DiscrepancyLog) => {
    setDiscrepancyToResolve(discrepancy);
    setIsConfirmDialogOpen(true);
  };

  const confirmResolveDiscrepancy = async () => {
    if (!discrepancyToResolve || !profile?.organizationId) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('discrepancies')
      .update({ status: 'resolved' })
      .eq('id', discrepancyToResolve.id)
      .eq('organization_id', profile.organizationId);

    if (error) {
      console.error("Error resolving discrepancy:", error);
      showError("Failed to resolve discrepancy.");
    } else {
      showSuccess(`Discrepancy ${discrepancyToResolve.id} resolved.`);
      fetchDiscrepancies();
    }
    setIsConfirmDialogOpen(false);
    setDiscrepancyToResolve(null);
    setIsLoading(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" /> Stock Discrepancies ({getDisplayDateRange()})
            </DialogTitle>
            <DialogDescription>
              List of pending stock discrepancies reported today.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow flex flex-col gap-4 py-4 overflow-hidden">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading discrepancies...</p>
            ) : discrepancies.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending stock discrepancies. Great job!</p>
            ) : (
              <ScrollArea className="flex-grow max-h-[calc(100vh-250px)] border border-border rounded-md p-3">
                <div className="space-y-4">
                  {discrepancies.map((discrepancy: DiscrepancyLog) => { // Explicitly type discrepancy
                    const discrepancyTimestamp = parseAndValidateDate(discrepancy.timestamp);
                    return (
                      <div key={discrepancy.id} className="bg-muted/20 p-3 rounded-md border border-border">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-semibold flex items-center gap-1">
                            <User className="h-4 w-4 text-muted-foreground" /> {getUserName(discrepancy.userId)}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {discrepancyTimestamp ? format(discrepancyTimestamp, "MMM dd, yyyy HH:mm") : "N/A"}
                          </span>
                        </div>
                        <p className="font-medium text-foreground mb-1 flex items-center gap-1">
                          <Package className="h-4 w-4 text-primary" /> {discrepancy.itemName} (ID: {discrepancy.itemId})
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-4 w-4" /> Folder: {getFolderName(discrepancy.folderId)} ({discrepancy.locationType.replace('_', ' ')})
                        </p>
                        {discrepancy.reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Reason: {discrepancy.reason}
                          </p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => handleResolveClick(discrepancy)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" /> Mark as Resolved
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {discrepancyToResolve && (
        <ConfirmDialog
          isOpen={isConfirmDialogOpen}
          onClose={() => setIsConfirmDialogOpen(false)}
          onConfirm={confirmResolveDiscrepancy}
          title="Confirm Resolution"
          description={`Are you sure you want to mark the discrepancy for "${discrepancyToResolve.itemName}" at "${getFolderName(discrepancyToResolve.folderId)}" as resolved?`}
          confirmText="Resolve"
          cancelText="Cancel"
        />
      )}
    </>
  );
};

export default StockDiscrepancyDetailsDialog;