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
import { Download, Users } from "lucide-react";
import * as XLSX from 'xlsx';
import { useCustomers, Customer } from "@/context/CustomerContext";
import { showError, showSuccess } from "@/utils/toast";
import { generateCustomerCsvTemplate } from "@/utils/csvGenerator";
import DuplicateCustomersWarningDialog from "@/components/DuplicateCustomersWarningDialog";
import { useProfile } from "@/context/ProfileContext"; // NEW: Import useProfile

interface CsvDuplicateCustomer {
  name: string;
  email?: string;
}

interface ImportCustomersDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImportCustomersDialog: React.FC<ImportCustomersDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { addCustomer, updateCustomer, customers } = useCustomers();
  const { profile } = useProfile(); // NEW: Get profile for role checks

  // NEW: Role-based permissions
  const canManageCustomers = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [jsonDataToProcess, setJsonDataToProcess] = useState<any[] | null>(null);

  // States for Duplicate Customers Warning
  const [duplicateCustomersInCsv, setDuplicateCustomersInCsv] = useState<CsvDuplicateCustomer[]>([]);
  const [isDuplicateCustomersWarningDialogOpen, setIsDuplicateCustomersWarningDialogOpen] = useState(false);

  // Memoize existing customers for efficient lookup
  const existingCustomersMap = useMemo(() => {
    const map = new Map<string, Customer>();
    const emailMap = new Map<string, Customer>();
    customers.forEach(customer => {
      map.set(customer.name.toLowerCase(), customer);
      if (customer.email) {
        emailMap.set(customer.email.toLowerCase(), customer);
      }
    });
    return { nameMap: map, emailMap: emailMap };
  }, [customers]);

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setJsonDataToProcess(null);
      setDuplicateCustomersInCsv([]);
      setIsDuplicateCustomersWarningDialogOpen(false);
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

  const processCsvData = async (data: any[], actionForDuplicates: "skip" | "update") => {
    if (!canManageCustomers) { // NEW: Check permission before processing
      showError("No permission to import customer data.");
      setIsUploading(false);
      return;
    }
    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const row of data) {
      const name = String(row.name || '').trim();
      const email = String(row.email || '').trim();
      const phone = String(row.phone || '').trim();
      const address = String(row.address || '').trim();
      const contactPerson = String(row.contactPerson || '').trim();
      const notes = String(row.notes || '').trim();

      if (!name) {
        errors.push(`Row: Missing Customer Name. Cannot import.`);
        errorCount++;
        continue;
      }

      const existingCustomerByName = existingCustomersMap.nameMap.get(name.toLowerCase());
      const existingCustomerByEmail = email ? existingCustomersMap.emailMap.get(email.toLowerCase()) : undefined;
      const isDuplicate = existingCustomerByName || existingCustomerByEmail;

      if (isDuplicate) {
        if (actionForDuplicates === "skip") {
          errors.push(`Customer '${name}': Skipped duplicate.`);
          errorCount++;
          continue;
        } else if (actionForDuplicates === "update") {
          const customerToUpdate = existingCustomerByName || existingCustomerByEmail;
          if (customerToUpdate) {
            const updatedCustomerData = {
              ...customerToUpdate,
              name: name,
              contactPerson: contactPerson || undefined,
              email: email || undefined,
              phone: phone.replace(/[^\d]/g, '') || undefined,
              address: address || undefined,
              notes: notes || undefined,
            };

            try {
              await updateCustomer(updatedCustomerData);
              successCount++;
            } catch (updateError: any) {
              errors.push(`Failed to update customer '${name}'.`);
              errorCount++;
            }
            continue;
          } else {
            errors.push(`Customer '${name}': Not found for update.`);
            errorCount++;
            continue;
          }
        }
      }

      try {
        const newCustomerData = {
          name: name,
          contactPerson: contactPerson || undefined,
          email: email || undefined,
          phone: phone.replace(/[^\d]/g, '') || undefined,
          address: address || undefined,
          notes: notes || undefined,
        };
        await addCustomer(newCustomerData);
        successCount++;
      } catch (addError: any) {
        errors.push(`Failed to add customer '${name}'.`);
        errorCount++;
      }
    }

    if (successCount > 0) {
      showSuccess(`Imported ${successCount} customer(s).`);
    }
    if (errorCount > 0) {
      const errorMessage = errorCount === 1
        ? errors[0]
        : `Failed to import ${errorCount} customer(s).`;
      showError(errorMessage);
      console.error("CSV Import Summary - Errors:", errors);
    }
    setIsUploading(false);
    onClose();
  };

  const handleUpload = async () => {
    if (!canManageCustomers) { // NEW: Check permission before uploading
      showError("No permission to import customer data.");
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

        const duplicates: CsvDuplicateCustomer[] = [];
        const seenDuplicates = new Set<string>();

        jsonData.forEach((row: any) => {
          const name = String(row.name || '').trim();
          const email = String(row.email || '').trim();

          const isExistingByName = existingCustomersMap.nameMap.has(name.toLowerCase());
          const isExistingByEmail = email ? existingCustomersMap.emailMap.has(email.toLowerCase()) : false;

          if (isExistingByName || isExistingByEmail) {
            const duplicateKey = `${name.toLowerCase()}-${email.toLowerCase()}`;
            if (!seenDuplicates.has(duplicateKey)) {
              duplicates.push({ name, email: email || undefined });
              seenDuplicates.add(duplicateKey);
            }
          }
        });

        if (duplicates.length > 0) {
          setDuplicateCustomersInCsv(duplicates);
          setIsDuplicateCustomersWarningDialogOpen(true);
        } else {
          await processCsvData(jsonData, "skip");
        }

      } catch (parseError: any) {
        showError(`Error parsing CSV: ${parseError.message}`);
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
    const csv = generateCustomerCsvTemplate();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "customer_import_template.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("Customer CSV template downloaded!");
    } else {
      showError("Browser does not support downloads.");
    }
  };

  const handleSkipAllDuplicates = async () => {
    setIsDuplicateCustomersWarningDialogOpen(false);
    if (jsonDataToProcess) {
      await processCsvData(jsonDataToProcess, "skip");
    } else {
      setIsUploading(false);
      setSelectedFile(null);
      onClose();
    }
  };

  const handleUpdateExisting = async () => {
    setIsDuplicateCustomersWarningDialogOpen(false);
    if (jsonDataToProcess) {
      await processCsvData(jsonDataToProcess, "update");
    } else {
      setIsUploading(false);
      setSelectedFile(null);
      onClose();
    }
  };

  const handleCancelDuplicateWarning = () => {
    setIsDuplicateCustomersWarningDialogOpen(false);
    setIsUploading(false);
    setJsonDataToProcess(null);
    setDuplicateCustomersInCsv([]);
    setSelectedFile(null);
    showError("Customer CSV upload cancelled.");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Import Customers
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to add or update multiple customer records at once.
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
              disabled={!canManageCustomers} // NEW: Disable input if no permission
            />
          </div>
          {selectedFile && (
            <p className="col-span-4 text-center text-sm text-muted-foreground">
              Selected: {selectedFile.name}
            </p>
          )}
          <div className="col-span-4 text-center">
            <Button variant="outline" onClick={handleDownloadTemplate} className="w-full" disabled={!canManageCustomers}>
              <Download className="h-4 w-4 mr-2" /> Download CSV Template
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isUploading || !canManageCustomers}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <DuplicateCustomersWarningDialog
        isOpen={isDuplicateCustomersWarningDialogOpen}
        onClose={handleCancelDuplicateWarning}
        duplicates={duplicateCustomersInCsv}
        onSkipAll={handleSkipAllDuplicates}
        onUpdateExisting={handleUpdateExisting}
      />
    </Dialog>
  );
};

export default ImportCustomersDialog;