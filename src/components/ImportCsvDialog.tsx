import { useState, useEffect, useMemo } from "react";
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
import { Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { useInventory } from "@/context/InventoryContext";
import { useCategories } from "@/context/CategoryContext";
import { useOnboarding, InventoryFolder } from "@/context/OnboardingContext"; // Updated import to InventoryFolder
import { showError, showSuccess } from "@/utils/toast";
import { generateInventoryCsvTemplate } from "@/utils/csvGenerator";
import DuplicateItemsWarningDialog from "@/components/DuplicateItemsWarningDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
// Removed parseLocationString as it's not directly used for folders
import { supabase } from "@/lib/supabaseClient";
import { uploadFileToSupabase } from "@/integrations/supabase/storage";
import { useProfile } from "@/context/ProfileContext"; // NEW: Import useProfile

interface CsvDuplicateItem {
  sku: string;
  csvQuantity: number;
  itemName: string;
}

interface ImportCsvDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImportCsvDialog: React.FC<ImportCsvDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { inventoryItems, refreshInventory } = useInventory();
  const {  } = useCategories(); // Removed categories and addCategory
  const { inventoryFolders, addInventoryFolder } = useOnboarding(); // Updated to inventoryFolders and addInventoryFolder
  const { profile } = useProfile(); // NEW: Get profile for role checks

  // NEW: Role-based permissions
  const canManageInventory = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  const [selectedFile, setSelectedFile] = useState<File | null>(null); // Fixed: Initialized with null
  const [isUploading, setIsUploading] = useState(false);
  const [jsonDataToProcess, setJsonDataToProcess] = useState<any[] | null>(null);

  // States for New Folders Confirmation
  const [newFoldersToConfirm, setNewFoldersToConfirm] = useState<string[]>([]); // Renamed from newLocationsToConfirm
  const [isConfirmNewFoldersDialogOpen, setIsConfirmNewFoldersDialogOpen] = useState(false); // Renamed

  // States for Duplicate SKUs Warning
  const [duplicateSkusInCsv, setDuplicateSkusInCsv] = useState<CsvDuplicateItem[]>([]);
  const [isDuplicateItemsWarningDialogOpen, setIsDuplicateItemsWarningDialogOpen] = useState(false);
  const [duplicateAction, setDuplicateAction] = useState<"skip" | "add_to_stock" | "update">("skip");

  // Memoize existing SKUs for efficient lookup
  const existingInventorySkus = useMemo(() => {
    return new Set(inventoryItems.map(item => item.sku.toLowerCase()));
  }, [inventoryItems]);

  // Memoize existing folder names for efficient lookup
  const existingFolderNames = useMemo(() => {
    return new Set(inventoryFolders.map(folder => folder.name.toLowerCase()));
  }, [inventoryFolders]);

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setJsonDataToProcess(null);
      setNewFoldersToConfirm([]);
      setIsConfirmNewFoldersDialogOpen(false);
      setDuplicateSkusInCsv([]);
      setIsDuplicateItemsWarningDialogOpen(false);
      setDuplicateAction("skip");
    }
  }, [isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (file.name.endsWith(".csv")) {
        setSelectedFile(file);
      } else {
        showError("Select a CSV file.");
        setSelectedFile(null);
      }
    } else {
      setSelectedFile(null);
    }
  };

  const checkForNewFoldersAndProceed = async (data: any[], actionForDuplicates: "skip" | "add_to_stock" | "update") => { // Renamed
    const uniqueFolderNamesInCsv = Array.from(new Set(data.map(row => String(row.folderName || '').trim()))); // Changed from location to folderName

    const newFolders = uniqueFolderNamesInCsv.filter(folderName => folderName && !existingFolderNames.has(folderName.toLowerCase())); // Check against existingFolderNames

    if (newFolders.length > 0) {
      setNewFoldersToConfirm(newFolders);
      setDuplicateAction(actionForDuplicates);
      setIsConfirmNewFoldersDialogOpen(true);
      setIsUploading(false);
    } else {
      await invokeEdgeFunction(actionForDuplicates); // Removed dataToProcess
      setSelectedFile(null);
    }
  };

  const invokeEdgeFunction = async (actionForDuplicates: "skip" | "add_to_stock" | "update") => { // Removed dataToProcess parameter
    if (!profile?.organizationId || !profile?.id) {
      showError("User/org not loaded. Cannot import.");
      setIsUploading(false);
      return;
    }
    if (!canManageInventory) { // NEW: Check permission before invoking edge function
      showError("No permission to import data.");
      setIsUploading(false);
      return;
    }

    setIsUploading(true);
    let uploadedFilePath: string | null = null;

    try {
      if (!selectedFile) {
        throw new Error("No file selected for upload.");
      }
      uploadedFilePath = await uploadFileToSupabase(selectedFile, 'csv-uploads', 'inventory-imports/');
      showSuccess("CSV uploaded. Processing...");

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error("Session expired. Log in again.");
      }

      const edgeFunctionUrl = `https://nojumocxivfjsbqnnkqe.supabase.co/functions/v1/process-csv-inventory-upload`;
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          filePath: uploadedFilePath,
          organizationId: profile.organizationId,
          userId: profile.id,
          actionForDuplicates: actionForDuplicates,
        }),
      });

      if (!response.ok) {
        let errorDetail = `Edge Function failed with status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.error || JSON.stringify(errorData); // Capture full error object if available
          console.error("Edge Function detailed error response:", errorData); // Log full error response
        } catch (jsonError) {
          console.error("Failed to parse error response JSON:", jsonError);
          errorDetail = `Edge Function failed with status: ${response.status}. Response was not valid JSON. Raw response: ${await response.text()}`; // Log raw text if not JSON
        }
        throw new Error(errorDetail);
      }

      const result = await response.json();
      if (result.success) {
        showSuccess(result.message);
      } else {
        showError(result.message || "Import errors. Check console.");
        console.error("Bulk Import Errors:", result.errors);
      }
      refreshInventory();
      onClose();

    } catch (error: any) {
      console.error("Error during bulk import process:", error);
      const errorMessage = typeof error === 'string' ? error : (error.message || "An unknown error occurred during bulk import.");
      showError(`Bulk import failed: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!canManageInventory) { // NEW: Check permission before uploading
      showError("No permission to import data.");
      return;
    }
    if (!selectedFile) {
      showError("Select a CSV file to upload.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const binaryString = e.target?.result;
        if (typeof binaryString !== 'string') {
          showError("Failed to read file content.");
          setIsUploading(false);
          return;
        }

        const workbook = XLSX.read(binaryString, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          showError("CSV file is empty.");
          setIsUploading(false);
          return;
        }

        setJsonDataToProcess(jsonData);

        const duplicates: CsvDuplicateItem[] = [];
        const seenSkusInCsv = new Set<string>(); // Track SKUs seen in the current CSV to avoid duplicate warnings for same CSV
        jsonData.forEach(row => {
          const sku = String(row.sku || '').trim();
          if (sku && existingInventorySkus.has(sku.toLowerCase())) {
            if (!seenSkusInCsv.has(sku.toLowerCase())) { // Check if this specific SKU has already been added to duplicates from this CSV
              duplicates.push({
                sku: sku,
                csvQuantity: parseInt(String(row.pickingBinQuantity || '0')) + parseInt(String(row.overstockQuantity || '0')),
                itemName: String(row.name || '').trim(),
              });
              seenSkusInCsv.add(sku.toLowerCase()); // Add to the set of SKUs seen in this CSV
            }
          }
        });

        if (duplicates.length > 0) {
          setDuplicateSkusInCsv(duplicates);
          setIsDuplicateItemsWarningDialogOpen(true);
        } else {
          await checkForNewFoldersAndProceed(jsonData, "skip"); // Renamed
        }

      } catch (parseError: any) {
        showError(`Error parsing CSV file: ${parseError.message}`);
        console.error("CSV Parse Error:", parseError);
      } finally {
      }
    };

    reader.onerror = () => {
      showError("Failed to read file.");
      setIsUploading(false);
      setSelectedFile(null);
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleDownloadTemplate = () => {
    const csv = generateInventoryCsvTemplate();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "inventory_import_template.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("CSV template downloaded!");
    } else {
      showError("Browser doesn't support downloads.");
    }
  };

  const handleSkipAllDuplicates = async () => {
    setIsDuplicateItemsWarningDialogOpen(false);
    if (jsonDataToProcess) {
      await checkForNewFoldersAndProceed(jsonDataToProcess, "skip"); // Renamed
    } else {
      setIsUploading(false);
      setSelectedFile(null);
      onClose();
    }
  };

  const handleAddToExistingStock = async () => {
    setIsDuplicateItemsWarningDialogOpen(false);
    if (jsonDataToProcess) {
      await checkForNewFoldersAndProceed(jsonDataToProcess, "add_to_stock"); // Renamed
    } else {
      setIsUploading(false);
      setSelectedFile(null);
      onClose();
    }
  };

  const handleUpdateExisting = async () => {
    setIsDuplicateItemsWarningDialogOpen(false);
    if (jsonDataToProcess) {
      await checkForNewFoldersAndProceed(jsonDataToProcess, "update"); // Renamed
    } else {
      setIsUploading(false);
      setSelectedFile(null);
      onClose();
    }
  };

  const handleCancelDuplicateWarning = () => {
    setIsDuplicateItemsWarningDialogOpen(false);
    setIsUploading(false);
    setJsonDataToProcess(null);
    setDuplicateSkusInCsv([]);
    setSelectedFile(null);
    showError("CSV upload cancelled.");
    onClose();
  };

  const handleConfirmAddFolders = async () => { // Renamed
    setIsConfirmNewFoldersDialogOpen(false);
    setIsUploading(true);

    for (const folderName of newFoldersToConfirm) { // Iterate over folder names
      const newFolder: Omit<InventoryFolder, "id" | "createdAt" | "userId" | "organizationId"> = { // Create InventoryFolder object
        name: folderName,
        color: "#CCCCCC", // Default color
      };
      await addInventoryFolder(newFolder); // Use addInventoryFolder
    }
    showSuccess(`Added ${newFoldersToConfirm.length} new folders.`);

    if (jsonDataToProcess) {
      await invokeEdgeFunction(duplicateAction); // Removed jsonDataToProcess
    }
    setNewFoldersToConfirm([]);
    setSelectedFile(null);
  };

  const handleCancelAddFolders = () => { // Renamed
    setIsConfirmNewFoldersDialogOpen(false);
    setIsUploading(false);
    setJsonDataToProcess(null);
    setNewFoldersToConfirm([]);
    setSelectedFile(null);
    showError("CSV upload cancelled.");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import CSV File</DialogTitle>
          <DialogDescription>
            Upload a CSV file to update your inventory. New categories will be automatically added if they don't exist.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="csvFile" className="text-right">
              CSV File
            </Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="col-span-3"
              disabled={!canManageInventory} // NEW: Disable input if no permission
            />
          </div>
          {selectedFile && (
            <p className="col-span-4 text-center text-sm text-muted-foreground">
              Selected: {selectedFile.name}
            </p>
          )}
          <div className="col-span-4 text-center">
            <Button variant="outline" onClick={handleDownloadTemplate} className="w-full" disabled={!canManageInventory}>
              <Download className="h-4 w-4 mr-2" /> Download CSV Template
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isUploading || !canManageInventory}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <DuplicateItemsWarningDialog
        isOpen={isDuplicateItemsWarningDialogOpen}
        onClose={handleCancelDuplicateWarning}
        duplicates={duplicateSkusInCsv}
        onSkipAll={handleSkipAllDuplicates}
        onAddToExistingStock={handleAddToExistingStock}
        onUpdateExisting={handleUpdateExisting}
      />

      <ConfirmDialog
        isOpen={isConfirmNewFoldersDialogOpen}
        onClose={handleCancelAddFolders}
        onConfirm={handleConfirmAddFolders}
        title="New Folders Detected"
        description={
          <div>
            <p>The following new inventory folders were found in your CSV:</p>
            <ul className="list-disc list-inside mt-2 ml-4 text-left">
              {newFoldersToConfirm.map((folderName, _index) => (
                <li key={_index} className="font-semibold">{folderName}</li>
              ))}
            </ul>
            <p>Would you like to add these to your available folders? Items with these folders will only be imported if confirmed.</p>
          </div>
        }
        confirmText="Add Folders & Continue"
        cancelText="Cancel Import"
      />
    </Dialog>
  );
};

export default ImportCsvDialog;