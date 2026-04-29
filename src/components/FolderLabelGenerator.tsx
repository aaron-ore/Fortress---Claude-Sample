import React, { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Download, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { showError, showSuccess } from "@/utils/toast";
import { usePrint, PrintContentData } from "@/context/PrintContext";
import { useOnboarding, InventoryFolder, LocationType } from "@/context/OnboardingContext";
import { generateQrCodeSvg } from "@/utils/qrCodeGenerator";
import FolderLabelPdfContent from "@/components/reports/pdf/FolderLabelPdfContent";
import html2canvas from 'html2canvas';

// Predefined colors for labels, matching some of the designs
const labelColors = [
  { name: "Green", hex: "#4CAF50" },
  { name: "Blue", hex: "#2196F3" },
  { name: "Purple", hex: "#9C27B0" },
  { name: "Yellow", hex: "#FFEB3B" },
  { name: "Red", hex: "#F44336" },
  { name: "Orange", hex: "#FF9800" },
];

interface FolderLabelGeneratorProps {
  initialFolder?: InventoryFolder | null;
  onSave: (folder: Omit<InventoryFolder, 'id' | 'createdAt' | 'userId' | 'organizationId'>, isNew: boolean) => void;
  onClose: () => void;
  onGenerateAndPrint?: (data: PrintContentData[]) => void;
  parentId?: string; // New prop for subfolders
  disabled?: boolean; // NEW: Add disabled prop
}

const FolderLabelGenerator: React.FC<FolderLabelGeneratorProps> = ({
  initialFolder,
  onSave,
  onClose,
  onGenerateAndPrint,
  parentId,
  disabled = false, // NEW: Default disabled to false
}) => {
  const { initiatePrint } = usePrint();
  const { inventoryFolders: existingFoldersInContext } = useOnboarding();

  const [folderName, setFolderName] = useState(initialFolder?.name || "");
  const [selectedColor, setSelectedColor] = useState(initialFolder?.color || labelColors[0].hex);
  const [locationType, setLocationType] = useState<LocationType>(initialFolder?.locationType || 'warehouse');
  const [address, setAddress] = useState(initialFolder?.address || "");
  const [phone, setPhone] = useState(initialFolder?.phone || "");
  const [managerName, setManagerName] = useState(initialFolder?.managerName || "");
  const [quantity, setQuantity] = useState("1");
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);

  const labelPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFolderName(initialFolder?.name || "");
    setSelectedColor(initialFolder?.color || labelColors[0].hex);
    setLocationType(initialFolder?.locationType || 'warehouse');
    setAddress(initialFolder?.address || "");
    setPhone(initialFolder?.phone || "");
    setManagerName(initialFolder?.managerName || "");
    setQuantity("1");
  }, [initialFolder]);

  const folderIdentifier = useMemo(() => {
    return folderName;
  }, [folderName]);

  useEffect(() => {
    const generatePreviewQr = async () => {
      if (folderIdentifier) {
        try {
          const svg = await generateQrCodeSvg(folderIdentifier, 150);
          setQrCodeSvg(svg);
        } catch (error) {
          console.error("Error generating QR for preview:", error);
          setQrCodeSvg(null);
        }
      } else {
        setQrCodeSvg(null);
      }
    };
    generatePreviewQr();
  }, [folderIdentifier]);

  const handleSaveFolderDetails = async () => {
    if (disabled) { // NEW: Check disabled prop
      showError("No permission to save.");
      return;
    }
    if (!folderName || !selectedColor) {
      showError("Fill folder name and color.");
      return;
    }

    const isNew = !initialFolder;

    const duplicateExists = existingFoldersInContext.some(folder =>
      folder.name.toLowerCase() === folderName.trim().toLowerCase() &&
      folder.id !== initialFolder?.id &&
      (folder.parentId === parentId || (!folder.parentId && !parentId)) // Check uniqueness within the same parent or top-level
    );

    if (duplicateExists) {
      showError("Folder already exists.");
      return;
    }

    const folderData: Omit<InventoryFolder, 'id' | 'createdAt' | 'userId' | 'organizationId'> = {
      name: folderName.trim(),
      color: selectedColor,
      parentId: parentId || undefined,
      locationType,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      managerName: managerName.trim() || undefined,
      isActive: true,
    };

    onSave(folderData, isNew);
    onClose();
  };

  const handleGenerateAndPrint = async () => {
    if (disabled) { // NEW: Check disabled prop
      showError("No permission to print labels.");
      return;
    }
    if (!folderName || !selectedColor || !quantity) {
      showError("Fill folder name, color, and quantity.");
      return;
    }

    const numQuantity = parseInt(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0 || numQuantity > 100) {
      showError("Enter quantity between 1 and 100.");
      return;
    }

    try {
      const qrSvg = await generateQrCodeSvg(folderIdentifier, 150);

      const labelsToPrint: PrintContentData[] = Array.from({ length: numQuantity }).map(() => ({
        type: "location-label",
        props: {
          folderName: folderName,
          color: selectedColor,
          qrCodeSvg: qrSvg,
          // Removed printDate and folderIdentifier from props
        },
      }));

      if (onGenerateAndPrint) {
        onGenerateAndPrint(labelsToPrint);
      } else {
        for (const label of labelsToPrint) {
          initiatePrint(label);
        }
        showSuccess(`Generated ${numQuantity} folder labels.`);
      }
    } catch (error: any) {
      showError(`Failed to generate labels: ${error.message}`);
    }
  };

  const handleDownloadPng = async () => {
    if (disabled) { // NEW: Check disabled prop
      showError("No permission to download labels.");
      return;
    }
    if (!labelPreviewRef.current) {
      showError("No label preview to download.");
      return;
    }

    try {
      const canvas = await html2canvas(labelPreviewRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `folder-label-${folderIdentifier}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("Label downloaded as PNG!");
    } catch (error: any) {
      console.error("Error downloading label as PNG:", error);
      showError(`Failed to download label: ${error.message}`);
    }
  };

  const isSaveDisabled = !folderName || !selectedColor || disabled; // NEW: Include disabled prop

  return (
    <div className="space-y-4 flex-grow flex flex-col p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="folderName">Location Name <span className="text-red-500">*</span></Label>
          <Input id="folderName" value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="e.g., Main Warehouse" disabled={disabled} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="locationType">Location Type <span className="text-red-500">*</span></Label>
          <Select value={locationType} onValueChange={(v) => setLocationType(v as LocationType)} disabled={disabled}>
            <SelectTrigger id="locationType">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="warehouse">Warehouse</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="generic">Generic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State 12345" rows={2} disabled={disabled} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" disabled={disabled} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="managerName">Manager Name</Label>
          <Input id="managerName" value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Jane Smith" disabled={disabled} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="color">Label Color</Label>
          <Select value={selectedColor} onValueChange={setSelectedColor} disabled={disabled}>
            <SelectTrigger id="color" aria-label="Select label color">
              <SelectValue placeholder="Select a color" />
            </SelectTrigger>
            <SelectContent>
              {labelColors.map((c) => (
                <SelectItem key={c.hex} value={c.hex}>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.hex }}></div>
                    {c.name}
                  </div >
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="quantity">Number of Labels to Print (1-100)</Label>
        <Input
          id="quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="1"
          min="1"
          max="100"
          aria-label="Number of labels to print"
          disabled={disabled} // NEW: Disable input if no permission
        />
      </div>

      <div className="flex-grow flex flex-col items-center justify-center min-h-[150px] border border-dashed border-muted-foreground/50 rounded-md p-2">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Label Preview</h3>
        {qrCodeSvg ? (
          <div className="w-[101.6mm] h-[50.8mm] flex items-center justify-center overflow-hidden p-1 bg-white">
            <FolderLabelPdfContent
              ref={labelPreviewRef}
              folderName={folderName}
              color={selectedColor}
              qrCodeSvg={qrCodeSvg}
              // Removed printDate and folderIdentifier from props
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Enter details to see a preview.</p>
        )}
      </div>
      <div className="flex gap-2 w-full mt-auto">
        <Button onClick={handleSaveFolderDetails} className="flex-grow" disabled={isSaveDisabled}>
          <Save className="h-4 w-4 mr-2" /> {initialFolder ? "Save Changes" : "Save Location"}
        </Button>
        <Button onClick={handleGenerateAndPrint} className="flex-grow" variant="secondary" disabled={isSaveDisabled}>
          <Printer className="h-4 w-4 mr-2" /> Generate & Print Labels
        </Button>
        <Button onClick={handleDownloadPng} className="flex-grow" variant="outline" disabled={isSaveDisabled}>
          <Download className="h-4 w-4 mr-2" /> Download PNG
        </Button>
      </div>
    </div>
  );
};

export default FolderLabelGenerator;