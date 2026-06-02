import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useUnitOfMeasure, UnitOfMeasure } from "@/context/UnitOfMeasureContext";
import { showError } from "@/utils/toast";

const CATEGORIES: { value: UnitOfMeasure["category"]; label: string }[] = [
  { value: "weight", label: "Weight (kg, lb, oz…)" },
  { value: "volume", label: "Volume (L, ml, cup…)" },
  { value: "count", label: "Count (each, case, dozen…)" },
  { value: "length", label: "Length" },
  { value: "area", label: "Area" },
];

interface AddUnitDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the newly created unit so the caller can auto-select it. */
  onCreated?: (unit: UnitOfMeasure) => void;
  /** Optional prefill for the unit name. */
  defaultName?: string;
}

const AddUnitDialog: React.FC<AddUnitDialogProps> = ({ open, onClose, onCreated, defaultName }) => {
  const { addUnit } = useUnitOfMeasure();
  const [name, setName] = useState(defaultName ?? "");
  const [abbreviation, setAbbreviation] = useState("");
  const [category, setCategory] = useState<UnitOfMeasure["category"]>("weight");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(defaultName ?? "");
      setAbbreviation("");
      setCategory("weight");
    }
  }, [open, defaultName]);

  const isDirty = !!(name.trim() || abbreviation.trim());
  const attemptClose = () => {
    if (saving) return;
    if (isDirty && !window.confirm("Discard this unit? Your unsaved changes will be lost.")) return;
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) return showError("Unit name is required.");
    if (!abbreviation.trim()) return showError("Abbreviation is required.");
    setSaving(true);
    const created = await addUnit({ name: name.trim(), abbreviation: abbreviation.trim(), category });
    setSaving(false);
    if (created) {
      onCreated?.(created);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) attemptClose(); }}>
      <DialogContent
        className="sm:max-w-[420px]"
        onInteractOutside={(e) => { if (isDirty) { e.preventDefault(); attemptClose(); } }}
      >
        <DialogHeader>
          <DialogTitle>New unit of measure</DialogTitle>
          <DialogDescription>Add a unit (e.g. Kilogram / kg) for your organization.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="unit-name">Name <span className="text-red-500">*</span></Label>
              <Input id="unit-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kilogram" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit-abbr">Abbreviation <span className="text-red-500">*</span></Label>
              <Input id="unit-abbr" value={abbreviation} onChange={(e) => setAbbreviation(e.target.value)} placeholder="kg" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unit-category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as UnitOfMeasure["category"])}>
              <SelectTrigger id="unit-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={attemptClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add unit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddUnitDialog;
