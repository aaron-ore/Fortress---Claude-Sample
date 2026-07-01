import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { showError } from "@/utils/toast";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { useCategories } from "@/context/CategoryContext";
import { useOnboarding } from "@/context/OnboardingContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Batch location, so the model lands in the right folder without asking again. */
  defaultFolderId?: string;
  onCreated: (item: InventoryItem) => void;
}

const NO_CATEGORY = "_none";

/**
 * Minimal product/model creator for the serialized (Bulk Intake) flow. A model
 * is just a template — the physical units carry the serial/barcode — so this
 * asks only for a name (plus optional category & unit cost). SKU is auto-
 * generated; there is no barcode/quantity/price to avoid overlap with per-unit
 * serials.
 */
const QuickAddProductDialog: React.FC<Props> = ({ isOpen, onClose, defaultFolderId, onCreated }) => {
  const { addInventoryItem } = useInventory();
  const { categories } = useCategories();
  const { inventoryFolders } = useOnboarding();

  const [name, setName] = useState("");
  const [category, setCategory] = useState(NO_CATEGORY);
  const [unitCost, setUnitCost] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setCategory(NO_CATEGORY);
      setUnitCost("");
      setSaving(false);
    }
  }, [isOpen]);

  const generateSku = () => {
    const base = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 16) || "MODEL";
    return `${base}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showError("Product name is required.");
      return;
    }
    const folderId = defaultFolderId || inventoryFolders[0]?.id;
    if (!folderId) {
      showError("Create a location first, then add products.");
      return;
    }

    setSaving(true);
    try {
      const created = await addInventoryItem({
        name: name.trim(),
        description: "",
        sku: generateSku(),
        category: category === NO_CATEGORY ? "Uncategorized" : category,
        pickingBinQuantity: 0,
        overstockQuantity: 0,
        reorderLevel: 0,
        pickingReorderLevel: 0,
        committedStock: 0,
        incomingStock: 0,
        unitCost: parseFloat(unitCost) || 0,
        retailPrice: 0,
        folderId,
        pickingBinFolderId: folderId,
        autoReorderEnabled: false,
        autoReorderQuantity: 0,
        imageUrl: null,
      });
      if (created) {
        onCreated(created);
        onClose();
      }
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to create product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>New product / model</DialogTitle>
          <DialogDescription>
            Just the model name — each scanned unit keeps its own serial. You can add pricing/details later on the item page.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="qpName">Product name <span className="text-red-500">*</span></Label>
            <Input
              id="qpName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PAX A920"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>Uncategorized</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qpCost">Unit cost</Label>
              <Input id="qpCost" type="number" min="0" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</> : "Create product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddProductDialog;
