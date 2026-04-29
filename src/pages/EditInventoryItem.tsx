"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useInventory } from "@/context/InventoryContext";
import { useCategories } from "@/context/CategoryContext";
import { useVendors } from "@/context/VendorContext";
import { PlusCircle, Loader2 } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { generateQrCodeSvg } from "@/utils/qrCodeGenerator";
import { useOnboarding } from "@/context/OnboardingContext";
import { uploadFileToSupabase, getFilePathFromPublicUrl } from "@/integrations/supabase/storage";
import { supabase } from "@/lib/supabaseClient";
import CustomFileInput from "@/components/CustomFileInput";
import { useProfile } from "@/context/ProfileContext";

const formSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().min(1, "Category is required"),
  pickingBinQuantity: z.number().min(0, "Must be non-negative"),
  overstockQuantity: z.number().min(0, "Must be non-negative"),
  reorderLevel: z.number().min(0, "Must be non-negative"),
  pickingReorderLevel: z.number().min(0, "Must be non-negative"),
  committedStock: z.number().min(0, "Must be non-negative"),
  incomingStock: z.number().min(0, "Must be non-negative"),
  unitCost: z.number().min(0, "Must be non-negative"),
  retailPrice: z.number().min(0, "Must be non-negative"),
  folderId: z.string().min(1, "Folder is required"),
  tags: z.string().optional(),
  notes: z.string().optional(),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).or(z.literal(null)), // Allow null
  vendorId: z.string().optional().or(z.literal("null-vendor")),
  autoReorderEnabled: z.boolean().default(false),
  autoReorderQuantity: z.number().min(0, "Must be non-negative").optional(),
});

const EditInventoryItem = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { inventoryItems, updateInventoryItem, refreshInventory } = useInventory();
  const { categories, addCategory } = useCategories();
  const { vendors } = useVendors();
  const { inventoryFolders } = useOnboarding();
  const { profile } = useProfile();

  const [itemNotFound, setItemNotFound] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [qrCodeSvg, setQrCodeSvg] = useState<string | undefined>(undefined);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlPreview, setImageUrlPreview] = useState<string | null>(null); // This will be a public URL or data:URL
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isImageCleared, setIsImageCleared] = useState(false); // Flag to indicate if logo was explicitly cleared

  const canManageInventory = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  const item = useMemo(() => {
    const foundItem = inventoryItems.find((i) => i.id === id);
    console.log("[EditInventoryItem] useMemo: Item found:", foundItem ? foundItem.id : "none", "item.imageUrl (from context):", foundItem?.imageUrl);
    return foundItem;
  }, [inventoryItems, id]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => {
      if (item) {
        const defaultVals = {
          ...item,
          vendorId: item.vendorId || "null-vendor",
          tags: item.tags?.join(', ') || "",
          notes: item.notes || "",
          imageUrl: item.imageUrl || null, // Ensure this is the public URL or null
        };
        console.log("[EditInventoryItem] useForm defaultValues memo: item.imageUrl (from context):", item.imageUrl, "defaultVals.imageUrl:", defaultVals.imageUrl);
        return defaultVals;
      }
      return { // Default values for new item if item is null
        name: "", description: "", sku: "", category: "",
        pickingBinQuantity: 0, overstockQuantity: 0, reorderLevel: 0, pickingReorderLevel: 0,
        committedStock: 0, incomingStock: 0, unitCost: 0, retailPrice: 0,
        folderId: "", tags: "", notes: "", imageUrl: null, vendorId: "null-vendor", // Set to null
        autoReorderEnabled: false, autoReorderQuantity: 0,
      };
    }, [item]),
  });

  useEffect(() => {
    console.log("[EditInventoryItem] useEffect (item dependency) triggered. Current item:", item ? item.id : "none", "item.imageUrl (from context):", item?.imageUrl);
    if (!item && id) {
      setItemNotFound(true);
      console.log("[EditInventoryItem] useEffect: Item not found, setting itemNotFound to true.");
    } else if (item) {
      setItemNotFound(false);
      const resetValues = {
        ...item,
        vendorId: item.vendorId || "null-vendor",
        tags: item.tags?.join(', ') || "",
        notes: item.notes || "",
        imageUrl: item.imageUrl || null, // Ensure this is the public URL or null
      };
      console.log("[EditInventoryItem] useEffect: Resetting form with resetValues.imageUrl:", resetValues.imageUrl);
      form.reset(resetValues);
      
      setImageFile(null);
      setImageUrlPreview(item.imageUrl || null); // This is the critical line for preview state
      setIsImageCleared(false);
      console.log("[EditInventoryItem] useEffect: Setting imageUrlPreview to:", item.imageUrl || null);

      const updateQrCode = async () => {
        if (item.barcodeUrl) {
          try {
            const svg = await generateQrCodeSvg(item.barcodeUrl, 60);
            setQrCodeSvg(svg);
          } catch (error) {
            console.error("Error generating QR code for display:", error);
            setQrCodeSvg(undefined);
          }
        } else {
          setQrCodeSvg(undefined);
        }
      };
      updateQrCode();
    }
  }, [item, id, form]);

  const watchSku = form.watch("sku");
  useEffect(() => {
    const updateQrCode = async () => {
      if (watchSku) {
        try {
          const svg = await generateQrCodeSvg(watchSku, 60);
          setQrCodeSvg(svg);
        } catch (error) {
          console.error("Error generating QR code preview:", error);
          setQrCodeSvg(undefined);
        }
      } else {
        setQrCodeSvg(undefined);
      }
    };
    updateQrCode();
  }, [watchSku]);

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (file.type.startsWith("image/")) {
        setImageFile(file);
        setIsImageCleared(false);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageUrlPreview(reader.result as string); // This is a data:URL for immediate preview
        };
        reader.readAsDataURL(file);
        console.log("[EditInventoryItem] handleImageFileChange: New file selected. File name:", file.name);
      } else {
        showError("Select an image file.");
        setImageFile(null);
        setImageUrlPreview(item?.imageUrl || null); // Revert to existing public URL if invalid file selected
        console.log("[EditInventoryItem] handleImageFileChange: Invalid file type selected. Reverting preview to:", item?.imageUrl || null);
      }
    } else {
      setImageFile(null);
      setImageUrlPreview(item?.imageUrl || null); // Revert to existing public URL if file input cleared without selection
      console.log("[EditInventoryItem] handleImageFileChange: File input cleared without selection. Reverting preview to:", item?.imageUrl || null);
    }
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImageUrlPreview(null); // Explicitly set to null
    setIsImageCleared(true); // Mark that the image was explicitly cleared
    showSuccess("Image cleared. Save changes to apply.");
    console.log("[EditInventoryItem] handleClearImage: Image explicitly cleared. imageUrlPreview set to null. isImageCleared:", true);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!item) {
      showError("Item not found for update.");
      return;
    }
    if (!canManageInventory) {
      showError("No permission to update items.");
      return;
    }
    setIsSaving(true);
    let finalImageUrlForDb: string | null | undefined; // This will be the INTERNAL PATH or null

    console.log("[EditInventoryItem] onSubmit: Starting image processing.");
    console.log("[EditInventoryItem] onSubmit: Current item.imageUrl (public from context):", item.imageUrl);
    console.log("[EditInventoryItem] onSubmit: imageFile (new file selected):", imageFile);
    console.log("[EditInventoryItem] onSubmit: isImageCleared (explicitly cleared):", isImageCleared);

    try {
      if (imageFile) {
        setIsUploadingImage(true);
        console.log("[EditInventoryItem] onSubmit: New image file detected.");
        // If there was an existing image, delete it first
        if (item.imageUrl) { // item.imageUrl is already a PUBLIC URL from context
          const internalPathToDelete = getFilePathFromPublicUrl(item.imageUrl, 'inventory-images');
          if (internalPathToDelete) {
            console.log("[EditInventoryItem] onSubmit: Deleting old image from storage. Internal path:", internalPathToDelete);
            const { error: deleteError } = await supabase.storage.from('inventory-images').remove([internalPathToDelete]);
            if (deleteError) console.warn("Failed to delete old image from storage:", deleteError);
            // Removed showSuccess for old image deletion
          }
        }
        finalImageUrlForDb = await uploadFileToSupabase(imageFile, 'inventory-images', 'items/'); // Returns INTERNAL PATH
        // Removed showSuccess for new image upload
        console.log("[EditInventoryItem] onSubmit: New image uploaded. Internal path for DB:", finalImageUrlForDb);
      } else if (isImageCleared) {
        console.log("[EditInventoryItem] onSubmit: Image was explicitly cleared.");
        if (item.imageUrl) { // item.imageUrl is already a PUBLIC URL from context
          const internalPathToDelete = getFilePathFromPublicUrl(item.imageUrl, 'inventory-images');
          if (internalPathToDelete) {
            console.log("[EditInventoryItem] onSubmit: Deleting old image from storage due to clear. Internal path:", internalPathToDelete);
            const { error: deleteError } = await supabase.storage.from('inventory-images').remove([internalPathToDelete]);
            if (deleteError) console.warn("Failed to delete old image from storage:", deleteError);
            // Removed showSuccess for old image deletion
          }
        }
        finalImageUrlForDb = null; // Set to null to explicitly clear the image_url in DB
        console.log("[EditInventoryItem] onSubmit: finalImageUrlForDb set to null (image cleared).");
      } else {
        // No new file, not explicitly cleared. Keep existing image's internal path.
        finalImageUrlForDb = item.imageUrl ? getFilePathFromPublicUrl(item.imageUrl, 'inventory-images') || null : null; // Ensure it's null if no image
        console.log("[EditInventoryItem] onSubmit: No image change. Keeping existing internal path:", finalImageUrlForDb);
      }
    } catch (error: any) {
      console.error("[EditInventoryItem] onSubmit: Error processing product image:", error);
      showError(`Failed to process product image: ${error.message}`);
      setIsSaving(false);
      setIsUploadingImage(false);
      return;
    } finally {
      setIsUploadingImage(false);
    }

    try {
      const finalBarcodeValue = values.sku || undefined;

      if (!values.folderId || values.folderId === "no-folders") {
        showError("Select a folder for the item.");
        setIsSaving(false);
        return;
      }

      await updateInventoryItem({
        ...item,
        ...values,
        folderId: values.folderId,
        tags: values.tags?.split(',').map((tag: string) => tag.trim()).filter(Boolean),
        notes: values.notes,
        imageUrl: finalImageUrlForDb, // Pass INTERNAL PATH or null to context
        vendorId: values.vendorId === "null-vendor" ? undefined : values.vendorId,
        barcodeUrl: finalBarcodeValue,
      });
      showSuccess("Item updated!");
      await refreshInventory();
    } catch (error: any) {
      console.error("[EditInventoryItem] onSubmit: Failed to update inventory item:", error);
      showError(`Failed to update item: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!canManageInventory) {
      showError("No permission to add categories.");
      return;
    }
    if (newCategoryName.trim()) {
      const newCat = await addCategory(newCategoryName.trim());
      if (newCat) {
        form.setValue("category", newCat.name);
        setNewCategoryName("");
        setIsAddingCategory(false);
      }
    }
  };

  if (itemNotFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-4">
        <h1 className="text-4xl font-bold text-destructive">404</h1>
        <p className="text-xl text-muted-foreground">Item not found.</p>
        <Button onClick={() => navigate("/inventory")}>Back to Inventory</Button>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading item details...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Inventory Item: {item.name}</h1>
        <Button variant="outline" onClick={() => navigate("/inventory")}>
          Back to Inventory
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Item Details */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Basic Information</h2>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canManageInventory} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canManageInventory} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {qrCodeSvg && (
                <FormItem>
                  <FormLabel>QR Code</FormLabel>
                  <FormControl>
                    <div dangerouslySetInnerHTML={{ __html: qrCodeSvg }} className="max-w-[100px] h-auto border p-4 rounded-md bg-white" />
                  </FormControl>
                  <FormDescription>This QR code is generated from the SKU.</FormDescription>
                </FormItem>
              )}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!canManageInventory}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="add-new-category" onClick={() => setIsAddingCategory(true)} disabled={!canManageInventory}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isAddingCategory && (
                <div className="flex space-x-2">
                  <Input
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    disabled={!canManageInventory}
                  />
                  <Button type="button" onClick={handleAddCategory} disabled={!canManageInventory}>
                    Add
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsAddingCategory(false)} disabled={!canManageInventory}>
                    Cancel
                  </Button>
                </div>
              )}
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!canManageInventory}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a vendor (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="null-vendor">None</SelectItem>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} disabled={!canManageInventory} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Product Image Field using CustomFileInput */}
              <CustomFileInput
                id="itemImage"
                label="Product Image"
                file={imageFile}
                onChange={handleImageFileChange}
                onClear={handleClearImage}
                disabled={isUploadingImage || !canManageInventory}
                accept="image/*"
                isUploading={isUploadingImage}
                previewUrl={imageUrlPreview}
              />
            </div>

            {/* Stock & Pricing */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Stock & Pricing</h2>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pickingBinQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Picking Bin Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value || '0'))} disabled={!canManageInventory} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="overstockQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overstock Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value || '0'))} disabled={!canManageInventory} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reorderLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reorder Level (Total)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value || '0'))} disabled={!canManageInventory} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pickingReorderLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Picking Reorder Level</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value || '0'))} disabled={!canManageInventory} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="committedStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Committed Stock</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value || '0'))} disabled={!canManageInventory} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="incomingStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Incoming Stock</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value || '0'))} disabled={!canManageInventory} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unitCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Cost</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value || '0'))} disabled={!canManageInventory} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="retailPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retail Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value || '0'))} disabled={!canManageInventory} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Folder Selection */}
              <FormField
                control={form.control}
                name="folderId"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Main Storage Folder <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!canManageInventory || inventoryFolders.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a folder" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {inventoryFolders.length > 0 ? (
                          inventoryFolders.map((folder) => (
                            <SelectItem key={folder.id} value={folder.id}>
                              {folder.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-folders" disabled>
                            No folders set up.
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {inventoryFolders.length === 0 && (
                      <FormDescription>
                        You need to set up inventory folders first.
                        <Button variant="link" size="sm" asChild className="p-0 h-auto ml-1">
                          <Link to="/folders">Manage Folders</Link>
                        </Button>
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Tags Field */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Tags (comma-separated)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., fragile, electronics, high-value" disabled={!canManageInventory} />
                    </FormControl>
                    <FormDescription>
                      Add keywords to help categorize and search for items.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Notes Field */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Any specific notes about this item..." rows={3} disabled={!canManageInventory} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2 border-t border-border pt-4 mt-4">
            <h3 className="text-lg font-semibold">Auto-Reorder Settings</h3>
            <FormField
              control={form.control}
              name="autoReorderEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Enable Auto-Reorder
                    </FormLabel>
                    <FormDescription>
                      Automatically generate purchase orders when stock is low.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!canManageInventory}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {form.watch("autoReorderEnabled") && (
              <FormField
                control={form.control}
                name="autoReorderQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity to Auto-Reorder</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value || '0'))} min="1" disabled={!canManageInventory} />
                    </FormControl>
                    <FormDescription>
                      This quantity will be ordered when stock drops to or below the overall reorder level.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSaving || isUploadingImage || !canManageInventory}>
            {isSaving || isUploadingImage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default EditInventoryItem;