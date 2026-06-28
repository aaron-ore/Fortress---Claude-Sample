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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { showSuccess, showError } from "@/utils/toast";
import { useInventory } from "@/context/InventoryContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useCategories } from "@/context/CategoryContext";
import { useVendors } from "@/context/VendorContext";
import { useUnitOfMeasure } from "@/context/UnitOfMeasureContext";
import AddUnitDialog from "@/components/units/AddUnitDialog";
import { generateQrCodeSvg } from "@/utils/qrCodeGenerator";
import { supabase } from "@/lib/supabaseClient";
import { useProfile } from "@/context/ProfileContext";
import { useBusinessMode } from "@/hooks/useBusinessMode";
import { Link } from "react-router-dom";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import CustomFileInput from "@/components/CustomFileInput";
import BarcodePreview from "@/components/BarcodePreview";
import { uploadFileToSupabase } from "@/integrations/supabase/storage";
import { Loader2, AlertTriangle } from "lucide-react"; // Import Loader2 for the spinner
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


interface AddInventoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialFolderId?: string; // NEW: Optional prop to pre-select folder
  initialSku?: string; // Pre-fill SKU (e.g. when creating from a failed scan)
}

const AddInventoryDialog: React.FC<AddInventoryDialogProps> = ({
  isOpen,
  onClose,
  initialFolderId, // NEW: Destructure initialFolderId
  initialSku,
}) => {
  const { addInventoryItem, inventoryItems } = useInventory();
  const { inventoryFolders } = useOnboarding(); // Updated to inventoryFolders
  const { categories } = useCategories();
  const { vendors } = useVendors();
  const { units } = useUnitOfMeasure();
  const { profile } = useProfile(); // NEW: Get profile for role checks
  const { hasFeature } = useBusinessMode(); // Mode-aware field visibility

  // NEW: Role-based permissions
  const canManageInventory = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  const [viewMode, setViewMode] = useState<"simple" | "detailed">("simple");

  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState("");
  const [simpleQuantity, setSimpleQuantity] = useState("0"); // Changed from ""
  const [pickingBinQuantity, setPickingBinQuantity] = useState("0"); // Changed from ""
  const [overstockQuantity, setOverstockQuantity] = useState("0"); // Changed from ""
  const [reorderLevel, setReorderLevel] = useState("0"); // Changed from ""
  const [pickingReorderLevel, setPickingReorderLevel] = useState("0"); // Changed from ""
  const [unitCost, setUnitCost] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [usageUnitId, setUsageUnitId] = useState("");
  const [addUnitOpen, setAddUnitOpen] = useState(false);

  const [selectedMainFolderId, setSelectedMainFolderId] = useState("");
  const [selectedPickingBinFolderId, setSelectedPickingBinFolderId] = useState("");

  const [selectedVendorId, setSelectedVendorId] = useState("none");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [qrCodeSvgPreview, setQrCodeSvgPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlPreview, setImageUrlPreview] = useState<string | null>(null); // This will be a public URL or data:URL
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false); // NEW: Loading state for adding item
  const [autoReorderEnabled, setAutoReorderEnabled] = useState(false); // State for auto-reorder switch
  const [autoReorderQuantity, setAutoReorderQuantity] = useState(""); // State for auto-reorder quantity

  // Duplicate-detection warning (name / SKU / barcode, case-insensitive)
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [duplicateConflicts, setDuplicateConflicts] = useState<
    { field: string; value: string; itemName: string }[]
  >([]);

  useEffect(() => {
    if (isOpen) {
      setViewMode("simple");
      setItemName("");
      setDescription("");
      setSku(initialSku || "");
      setBarcode("");
      setCategory("");
      setSimpleQuantity("0"); // Changed from ""
      setPickingBinQuantity("0"); // Changed from ""
      setOverstockQuantity("0"); // Changed from ""
      setReorderLevel("0"); // Changed from ""
      setPickingReorderLevel("0"); // Changed from ""
      setUnitCost("");
      setRetailPrice("");
      setUsageUnitId("");
      // NEW: Set initial folder based on prop or first available
      setSelectedMainFolderId(initialFolderId || (inventoryFolders.length > 0 ? inventoryFolders[0].id : "no-folders"));
      setSelectedPickingBinFolderId(initialFolderId || (inventoryFolders.length > 0 ? inventoryFolders[0].id : "no-folders"));
      setSelectedVendorId("none");
      setBarcodeValue("");
      setQrCodeSvgPreview(null);
      setImageFile(null);
      setImageUrlPreview(null);
      setIsUploadingImage(false);
      setAutoReorderEnabled(false);
      setAutoReorderQuantity("");
      setIsAddingItem(false); // Reset loading state
      setIsDuplicateDialogOpen(false);
      setDuplicateConflicts([]);
    }
  }, [isOpen, inventoryFolders, initialFolderId, initialSku]); // Added initialFolderId to dependencies

  useEffect(() => {
    const updateQrCode = async () => {
      const value = sku.trim();
      setBarcodeValue(value);
      if (value) {
        try {
          const svg = await generateQrCodeSvg(value, 60);
          setQrCodeSvgPreview(svg);
        } catch (error) {
          console.error("Error generating QR code preview:", error);
          setQrCodeSvgPreview(null);
        }
      } else {
        setQrCodeSvgPreview(null);
      }
    };
    updateQrCode();
  }, [sku]);

  // Restaurant locations don't require a SKU (food items rarely have one).
  // We key off the selected main folder's location type.
  const selectedFolder = inventoryFolders.find((f) => f.id === selectedMainFolderId);
  const isRestaurant = selectedFolder?.locationType === "restaurant";

  // For restaurant items left without a SKU, derive a unique one from the name
  // so the unique constraint and QR generation still work.
  const generateFallbackSku = () => {
    const base = itemName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 16) || "ITEM";
    return `${base}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (file.type.startsWith("image/")) {
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageUrlPreview(reader.result as string); // This is a data:URL for immediate preview
        };
        reader.readAsDataURL(file);
        console.log("[AddInventoryDialog] handleImageChange: New file selected. File name:", file.name);
      } else {
        showError("Select an image file.");
        setImageFile(null);
        setImageUrlPreview(null);
        console.log("[AddInventoryDialog] handleImageChange: Invalid file type selected.");
      }
    } else {
      setImageFile(null);
      setImageUrlPreview(null);
      console.log("[AddInventoryDialog] handleImageChange: File input cleared without selection.");
    }
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImageUrlPreview(null);
    showSuccess("Image cleared. Add item.");
    console.log("[AddInventoryDialog] handleClearImage: Image explicitly cleared. imageUrlPreview set to null.");
  };

  // Find existing items that collide on name / SKU / barcode (case-insensitive,
  // trimmed). Returns at most one conflict per field, with the existing item's name.
  const detectDuplicates = () => {
    const n = itemName.trim().toLowerCase();
    const s = sku.trim().toLowerCase();
    const b = barcode.trim().toLowerCase();
    const found: Record<string, { field: string; value: string; itemName: string }> = {};
    for (const item of inventoryItems) {
      if (n && !found.Name && item.name?.trim().toLowerCase() === n) {
        found.Name = { field: "Name", value: itemName.trim(), itemName: item.name };
      }
      if (s && !found.SKU && item.sku?.trim().toLowerCase() === s) {
        found.SKU = { field: "SKU", value: sku.trim(), itemName: item.name };
      }
      if (b && !found.Barcode && item.barcode?.trim().toLowerCase() === b) {
        found.Barcode = { field: "Barcode", value: barcode.trim(), itemName: item.name };
      }
    }
    return Object.values(found);
  };

  const handleSubmit = async (skipDuplicateCheck = false) => {
    if (!canManageInventory) { // NEW: Check permission before submitting
      showError("No permission to add items.");
      return;
    }
    setIsAddingItem(true); // Set loading state to true

    let finalPickingBinQuantity: number;
    let finalOverstockQuantity: number;
    let finalReorderLevel: number;
    let finalPickingReorderLevel: number;
    let finalMainFolderId: string;
    let finalPickingBinFolderId: string;
    let finalCommittedStock = 0;
    let finalIncomingStock = 0;

    if (viewMode === "simple") {
      const parsedSimpleQuantity = parseInt(simpleQuantity || '0');
      finalPickingBinQuantity = parsedSimpleQuantity;
      finalOverstockQuantity = 0;
      finalReorderLevel = parseInt(reorderLevel || '0');
      finalPickingReorderLevel = parseInt(reorderLevel || '0');
      finalMainFolderId = selectedMainFolderId;
      finalPickingBinFolderId = selectedMainFolderId; // Simple view uses same for both
    } else {
      finalPickingBinQuantity = parseInt(pickingBinQuantity || '0');
      finalOverstockQuantity = parseInt(overstockQuantity || '0');
      finalReorderLevel = parseInt(reorderLevel || '0');
      finalPickingReorderLevel = parseInt(pickingReorderLevel || '0');
      finalMainFolderId = selectedMainFolderId;
      finalPickingBinFolderId = selectedPickingBinFolderId;
      finalCommittedStock = 0;
      finalIncomingStock = 0;
    }

    if (
      !itemName.trim() ||
      (!isRestaurant && !sku.trim()) ||
      !category.trim() ||
      !unitCost ||
      !retailPrice ||
      (viewMode === "simple" && (isNaN(parseInt(simpleQuantity)) || parseInt(simpleQuantity) < 0)) || // Removed || '0' as state is now '0'
      (viewMode === "detailed" && (isNaN(finalPickingBinQuantity) || finalPickingBinQuantity < 0 || isNaN(finalOverstockQuantity) || finalOverstockQuantity < 0)) ||
      (isNaN(parseInt(reorderLevel)) || parseInt(reorderLevel) < 0) || // Removed || '0' as state is now '0'
      (viewMode === "detailed" && (isNaN(parseInt(pickingReorderLevel)) || parseInt(pickingReorderLevel) < 0)) || // Removed || '0' as state is now '0'
      isNaN(parseFloat(unitCost)) || parseFloat(unitCost) < 0 ||
      isNaN(parseFloat(retailPrice)) || parseFloat(retailPrice) < 0 ||
      !finalMainFolderId || finalMainFolderId === "no-folders" ||
      !finalPickingBinFolderId || finalPickingBinFolderId === "no-folders" ||
      categories.length === 0 ||
      (autoReorderEnabled && (parsedAutoReorderQuantity <= 0 || isNaN(parsedAutoReorderQuantity)))
    ) {
      showError("Fill all required fields.");
      setIsAddingItem(false); // Reset loading state
      return;
    }

    if (inventoryFolders.length === 0) {
      showError("Set up inventory folders first.");
      setIsAddingItem(false); // Reset loading state
      return;
    }

    if (!profile?.organizationId) {
      showError("Org ID not found.");
      setIsAddingItem(false); // Reset loading state
      return;
    }

    // Warn on duplicate name / SKU / barcode against items already loaded.
    // SKU & barcode are identity fields → hard block; a name-only match is a
    // soft warning the user can override via "Add Anyway".
    if (!skipDuplicateCheck) {
      const conflicts = detectDuplicates();
      if (conflicts.length > 0) {
        setDuplicateConflicts(conflicts);
        setIsDuplicateDialogOpen(true);
        setIsAddingItem(false);
        return;
      }
    }

    // Only check for duplicates when a SKU was actually entered. Restaurant items
    // may be left blank (we generate one below).
    if (sku.trim()) {
      const { data: existingItem, error: fetchError } = await supabase
        .from('inventory_items')
        .select('sku')
        .eq('sku', sku.trim())
        .eq('organization_id', profile.organizationId)
        .single();

      if (existingItem) {
        showError(`SKU '${sku.trim()}' already exists.`);
        setIsAddingItem(false); // Reset loading state
        return;
      }
      if (fetchError && fetchError.code === 'PGRST116') { // PGRST116 means "no rows found", which is expected for a non-duplicate
        // No item found, proceed
      } else if (fetchError) {
        console.error("Error checking for duplicate SKU:", fetchError);
        showError("Failed to check for duplicate SKU.");
        setIsAddingItem(false); // Reset loading state
        return;
      }
    }

    // Final SKU: use what was entered, otherwise auto-generate (restaurant items).
    const finalSku = sku.trim() || generateFallbackSku();

    let finalImageUrl: string | undefined | null = null; // This will be the INTERNAL PATH or null
    if (imageFile) {
      setIsUploadingImage(true);
      try {
        finalImageUrl = await uploadFileToSupabase(imageFile, 'inventory-images', 'items/'); // Returns INTERNAL PATH
        console.log("[AddInventoryDialog] Uploaded image internal path:", finalImageUrl);
        // Removed showSuccess for new image upload
      } catch (error: any) {
        console.error("Error uploading product image:", error);
        showError(`Failed to upload image: ${error.message}`);
        setIsAddingItem(false); // Reset loading state
        setIsUploadingImage(false);
        return;
      } finally {
        setIsUploadingImage(false);
      }
    } else {
      // If no new file is selected, and imageUrlPreview is null (meaning it was cleared or never existed),
      // then finalImageUrl should be null for the database.
      // Otherwise, it remains undefined (meaning no change to existing image_url in DB).
      finalImageUrl = imageUrlPreview === null ? null : undefined;
      console.log("[AddInventoryDialog] No new image file. imageUrlPreview is null:", imageUrlPreview === null, "finalImageUrl for DB:", finalImageUrl);
    }

    console.log("[AddInventoryDialog] Adding item with imageUrl (internal path):", finalImageUrl);
    const newItem = {
      name: itemName.trim(),
      description: description.trim(),
      sku: finalSku,
      barcode: barcode.trim() || undefined,
      category: category.trim(),
      usageUnitId: usageUnitId || undefined,
      pickingBinQuantity: finalPickingBinQuantity,
      overstockQuantity: finalOverstockQuantity,
      reorderLevel: finalReorderLevel,
      pickingReorderLevel: finalPickingReorderLevel,
      committedStock: finalCommittedStock,
      incomingStock: finalIncomingStock,
      unitCost: parseFloat(unitCost),
      retailPrice: parseFloat(retailPrice),
      folderId: finalMainFolderId,
      pickingBinFolderId: finalPickingBinFolderId,
      imageUrl: finalImageUrl, // Pass INTERNAL PATH or null to context
      vendorId: selectedVendorId === "none" ? undefined : selectedVendorId, // Corrected to item.vendorId
      barcodeUrl: barcodeValue || undefined,
      autoReorderEnabled: autoReorderEnabled,
      autoReorderQuantity: parseInt(autoReorderQuantity || '0'),
    };

    try {
      await addInventoryItem(newItem);
      showSuccess(`Added ${finalPickingBinQuantity + finalOverstockQuantity} of ${itemName}!`);
      onClose();
    } catch (error: any) {
      console.error("Failed to add inventory item:", error);
      showError("Failed to add item: " + (error.message || "Unknown error. Check console."));
    } finally {
      setIsAddingItem(false); // Reset loading state
    }
  };

  // Define these variables here so they are in scope for isFormInvalid
  const parsedPickingBinQuantity = parseInt(pickingBinQuantity); // Removed || '0'
  const parsedOverstockQuantity = parseInt(overstockQuantity); // Removed || '0'
  const parsedReorderLevel = parseInt(reorderLevel); // Removed || '0'
  const parsedPickingReorderLevel = parseInt(pickingReorderLevel); // Removed || '0'
  const parsedUnitCost = parseFloat(unitCost || '0');
  const parsedRetailPrice = parseFloat(retailPrice || '0');
  const parsedAutoReorderQuantity = parseInt(autoReorderQuantity || '0');

  const isFormInvalid =
    !itemName.trim() ||
    (!isRestaurant && !sku.trim()) ||
    !category.trim() ||
    isNaN(parsedUnitCost) || parsedUnitCost < 0 ||
    isNaN(parsedRetailPrice) || parsedRetailPrice < 0 ||
    (viewMode === "simple" && (isNaN(parseInt(simpleQuantity)) || parseInt(simpleQuantity) < 0)) || // Removed || '0'
    (viewMode === "detailed" && (isNaN(parsedPickingBinQuantity) || parsedPickingBinQuantity < 0 || isNaN(parsedOverstockQuantity) || parsedOverstockQuantity < 0)) ||
    isNaN(parsedReorderLevel) || parsedReorderLevel < 0 ||
    (viewMode === "detailed" && (isNaN(parsedPickingReorderLevel) || parsedPickingReorderLevel < 0)) ||
    inventoryFolders.length === 0 ||
    !selectedMainFolderId || selectedMainFolderId === "no-folders" ||
    !selectedPickingBinFolderId || selectedPickingBinFolderId === "no-folders" ||
    categories.length === 0 ||
    (autoReorderEnabled && (parsedAutoReorderQuantity <= 0 || isNaN(parsedAutoReorderQuantity))) ||
    isUploadingImage ||
    isAddingItem || // NEW: Disable if item is already being added
    !canManageInventory; // NEW: Disable if user cannot manage inventory

  // Guard against losing work when clicking outside / pressing Esc / hitting Cancel.
  const isDirty = !!(
    itemName.trim() || description.trim() || sku.trim() || category ||
    unitCost || retailPrice || usageUnitId || imageFile ||
    simpleQuantity !== "0" || pickingBinQuantity !== "0" || overstockQuantity !== "0" ||
    autoReorderEnabled
  );

  const attemptClose = () => {
    if (isAddingItem || isUploadingImage) return; // never close mid-save
    if (isDirty && !window.confirm("Discard this item? Your unsaved changes will be lost.")) return;
    onClose();
  };

  // SKU / barcode are unique identity fields → can't override.
  const hasHardConflict = duplicateConflicts.some(
    (c) => c.field === "SKU" || c.field === "Barcode",
  );
  const duplicateFieldLabel = duplicateConflicts
    .map((c) => c.field.toLowerCase())
    .join(", ");

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) attemptClose(); }}>
      <DialogContent
        className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => { if (isDirty) { e.preventDefault(); attemptClose(); } }}
      >
        <DialogHeader>
          <DialogTitle>Add New Inventory Item</DialogTitle>
          <DialogDescription>
            Enter details for the new item to add to your inventory. Fields marked with (*) are required.
          </DialogDescription>
        </DialogHeader>
        {/* Detailed view exposes warehouse picking-bin / overstock fields. */}
        {hasFeature("pickingBins") && (
          <div className="flex justify-center mb-4">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value: "simple" | "detailed") => value && setViewMode(value)}
              aria-label="Inventory item view mode"
              className="bg-muted rounded-md p-1"
              disabled={!canManageInventory} // NEW: Disable toggle if no permission
            >
              <ToggleGroupItem value="simple" aria-label="Simple view" className="px-4 py-2 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm">
                Simple View
              </ToggleGroupItem>
              <ToggleGroupItem value="detailed" aria-label="Detailed view" className="px-4 py-2 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm">
                Detailed View
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="itemName">Item Name <span className="text-red-500">*</span></Label>
            <Input
              id="itemName"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder={isRestaurant ? "e.g., Ground Beef" : "e.g., Laptop Pro X"}
              disabled={!canManageInventory} // NEW: Disable input if no permission
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">
              SKU {isRestaurant
                ? <span className="text-xs text-muted-foreground">(optional)</span>
                : <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder={isRestaurant ? "Optional — auto-generated if left blank" : "e.g., LPX-512-16"}
              disabled={!canManageInventory} // NEW: Disable input if no permission
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed product description..."
              rows={2}
              disabled={!canManageInventory} // NEW: Disable input if no permission
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
            <Select value={category} onValueChange={setCategory} disabled={!canManageInventory || categories.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-categories" disabled>
                    No categories set up. Manage categories.
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          {/* Usage unit drives recipes & food-cost variance (restaurant only). */}
          {hasFeature("usageUnits") && (
            <div className="space-y-2">
              <Label htmlFor="usageUnit">
                Usage Unit <span className="text-xs text-muted-foreground">(used by recipes & variance)</span>
              </Label>
              <Select
                value={usageUnitId || "_none"}
                onValueChange={(v) => {
                  if (v === "_new") { setAddUnitOpen(true); return; }
                  setUsageUnitId(v === "_none" ? "" : v);
                }}
                disabled={!canManageInventory}
              >
                <SelectTrigger id="usageUnit">
                  <SelectValue placeholder="Select a unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No unit</SelectItem>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>
                  ))}
                  <SelectItem value="_new" className="text-primary font-medium">+ New unit…</SelectItem>
                </SelectContent>
              </Select>
              <AddUnitDialog
                open={addUnitOpen}
                onClose={() => setAddUnitOpen(false)}
                onCreated={(u) => setUsageUnitId(u.id)}
              />
            </div>
          )}
          {viewMode === "simple" && (
            <div className="space-y-2">
              <Label htmlFor="simpleLocation">Location <span className="text-red-500">*</span></Label>
              <Select
                value={selectedMainFolderId}
                onValueChange={setSelectedMainFolderId}
                disabled={!canManageInventory || inventoryFolders.length === 0}
              >
                <SelectTrigger id="simpleLocation">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryFolders.length > 0 ? (
                    inventoryFolders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}{folder.locationType === "restaurant" ? " (Restaurant)" : ""}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-folders" disabled>No locations set up.</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose where this item lives. Restaurant locations don't require a SKU.
              </p>
            </div>
          )}
          {viewMode === "simple" ? (
            <div className="space-y-2">
              <Label htmlFor="simpleQuantity">Quantity <span className="text-red-500">*</span></Label>
              <Input
                id="simpleQuantity"
                type="number"
                value={simpleQuantity}
                onChange={(e) => setSimpleQuantity(e.target.value)}
                placeholder="e.g., 150"
                min="0"
                disabled={!canManageInventory} // NEW: Disable input if no permission
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="pickingBinQuantity">Picking Bin Quantity <span className="text-red-500">*</span></Label>
                <Input
                  id="pickingBinQuantity"
                  type="number"
                  value={pickingBinQuantity}
                  onChange={(e) => setPickingBinQuantity(e.target.value)}
                  placeholder="e.g., 50"
                  min="0"
                  disabled={!canManageInventory} // NEW: Disable input if no permission
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overstockQuantity">Overstock Quantity <span className="text-red-500">*</span></Label>
                <Input
                  id="overstockQuantity"
                  type="number"
                  value={overstockQuantity}
                  onChange={(e) => setOverstockQuantity(e.target.value)}
                  placeholder="e.g., 100"
                  min="0"
                  disabled={!canManageInventory} // NEW: Disable input if no permission
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="reorderLevel">Overall Reorder Level <span className="text-red-500">*</span></Label>
            <Input
              id="reorderLevel"
              type="number"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              placeholder="e.g., 20"
              min="0"
              disabled={!canManageInventory} // NEW: Disable input if no permission
            />
          </div>
          {viewMode === "detailed" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="pickingReorderLevel">Picking Bin Reorder Level <span className="text-red-500">*</span></Label>
                <Input
                  id="pickingReorderLevel"
                  type="number"
                  value={pickingReorderLevel}
                  onChange={(e) => setPickingReorderLevel(e.target.value)}
                  placeholder="e.g., 10"
                  min="0"
                  disabled={!canManageInventory} // NEW: Disable input if no permission
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="selectedMainFolderId">Main Storage Folder <span className="text-red-500">*</span></Label>
                <Select value={selectedMainFolderId} onValueChange={setSelectedMainFolderId} disabled={!canManageInventory || inventoryFolders.length === 0}>
                  <SelectTrigger id="selectedMainFolderId">
                    <SelectValue placeholder="Select a folder" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryFolders.length > 0 ? (
                      inventoryFolders.map(folder => <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>)
                    ) : (
                      <SelectItem value="no-folders" disabled>No folders set up.</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {inventoryFolders.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    You need to set up inventory folders first.
                    <Button variant="link" size="sm" asChild className="p-0 h-auto ml-1">
                      <Link to="/folders">Manage Folders</Link>
                    </Button>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="selectedPickingBinFolderId">Picking Bin Folder <span className="text-red-500">*</span></Label>
                <Select value={selectedPickingBinFolderId} onValueChange={setSelectedPickingBinFolderId} disabled={!canManageInventory || inventoryFolders.length === 0}>
                  <SelectTrigger id="selectedPickingBinFolderId">
                    <SelectValue placeholder="Select a folder" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryFolders.length > 0 ? (
                      inventoryFolders.map(folder => <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>)
                    ) : (
                      <SelectItem value="no-folders" disabled>No folders set up.</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="committedStock">Committed Stock</Label>
                <Input
                  id="committedStock"
                  type="number"
                  value={0}
                  disabled
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="incomingStock">Incoming Stock</Label>
                <Input
                  id="incomingStock"
                  type="number"
                  value={0}
                  disabled
                  placeholder="0"
                  min="0"
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="unitCost">Unit Cost <span className="text-red-500">*</span></Label>
            <Input
              id="unitCost"
              type="number"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="e.g., 900.00"
              step="0.01"
              min="0"
              disabled={!canManageInventory} // NEW: Disable input if no permission
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retailPrice">Retail Price <span className="text-red-500">*</span></Label>
            <Input
              id="retailPrice"
              type="number"
              value={retailPrice}
              onChange={(e) => setRetailPrice(e.target.value)}
              placeholder="e.g., 1200.00"
              step="0.01"
              min="0"
              disabled={!canManageInventory} // NEW: Disable input if no permission
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor">Primary Vendor</Label>
            <Select value={selectedVendorId} onValueChange={setSelectedVendorId} disabled={!canManageInventory}>
              <SelectTrigger id="vendor">
                <SelectValue placeholder="Select a vendor (Optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Vendor</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="barcodeValue">QR Code Value (from SKU)</Label>
            <Input
              id="barcodeValue"
              value={barcodeValue}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Enter SKU or custom value"
              disabled // Always disabled as it's derived from SKU
            />
            {qrCodeSvgPreview && (
              <div className="mt-2 p-4 border border-border rounded-md bg-white flex justify-center">
                <div dangerouslySetInnerHTML={{ __html: qrCodeSvgPreview }} />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="barcode">
              Barcode (UPC / EAN) <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="e.g., 036000291452"
              disabled={!canManageInventory}
            />
            <p className="text-xs text-muted-foreground">
              The printed product barcode. Scannable for lookup alongside the SKU/QR.
            </p>
            {barcode.trim() && (
              <div className="mt-2 p-2 border border-border rounded-md bg-white flex justify-center">
                <BarcodePreview value={barcode.trim()} />
              </div>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <CustomFileInput
              id="itemImage"
              label="Product Image"
              file={imageFile}
              onChange={handleImageChange}
              onClear={handleClearImage}
              disabled={isUploadingImage || !canManageInventory}
              accept="image/*"
              isUploading={isUploadingImage}
              previewUrl={imageUrlPreview}
            />
          </div>
          <div className="space-y-2 md:col-span-2 border-t border-border pt-4 mt-4">
            <h3 className="text-lg font-semibold">Auto-Reorder Settings</h3>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="autoReorderEnabled">Enable Auto-Reorder</Label>
              <Switch
                id="autoReorderEnabled"
                checked={autoReorderEnabled}
                onCheckedChange={setAutoReorderEnabled}
                disabled={!canManageInventory} // NEW: Disable switch if no permission
              />
            </div>
            {autoReorderEnabled && (
              <div className="space-y-2 mt-2">
                <Label htmlFor="autoReorderQuantity">Quantity to Auto-Reorder</Label>
                <Input
                  id="autoReorderQuantity"
                  type="number"
                  value={autoReorderQuantity}
                  onChange={(e) => {
                        const newQty = parseInt(e.target.value) || 0;
                        setAutoReorderQuantity(e.target.value);
                        if (newQty > 0) {
                          if (profile) {
                            // This is a local state update, not a direct DB update
                            // The actual DB update happens when the item is added/updated
                          }
                        }
                      }}
                  placeholder="e.g., 50"
                  min="1"
                  disabled={!canManageInventory} // NEW: Disable input if no permission
                />
                <p className="text-xs text-muted-foreground">
                  This quantity will be ordered when stock drops to or below the overall reorder level.
                </p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={attemptClose} disabled={isAddingItem}>
            Cancel
          </Button>
          <Button onClick={() => handleSubmit()} disabled={isFormInvalid}>
            {isAddingItem ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
              </>
            ) : (
              "Add Item"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Red duplicate-detected warning popup */}
    <AlertDialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
      <AlertDialogContent className="border-2 border-destructive">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Duplicate item detected
          </AlertDialogTitle>
          <AlertDialogDescription>
            An item with the same {duplicateFieldLabel} already exists in your inventory:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {duplicateConflicts.map((c) => (
            <li key={c.field}>
              <span className="font-semibold text-destructive">{c.field}</span>{" "}
              “{c.value}” matches existing item{" "}
              <span className="font-semibold">{c.itemName}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          {hasHardConflict
            ? "SKU and barcode must be unique. Please change them before adding this item."
            : "If this is intentional, you can add it anyway."}
        </p>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIsDuplicateDialogOpen(false)}>
            Go Back & Edit
          </AlertDialogCancel>
          {!hasHardConflict && (
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setIsDuplicateDialogOpen(false); handleSubmit(true); }}
            >
              Add Anyway
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default AddInventoryDialog;