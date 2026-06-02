import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Ruler, PlusCircle, Sparkles, Pencil, Trash2, Loader2 } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import AddUnitDialog from "@/components/units/AddUnitDialog";
import { useUnitOfMeasure, UnitOfMeasure } from "@/context/UnitOfMeasureContext";
import { useProfile } from "@/context/ProfileContext";

const CATEGORY_LABELS: Record<UnitOfMeasure["category"], string> = {
  weight: "Weight",
  volume: "Volume",
  count: "Count",
  length: "Length",
  area: "Area",
};

const CATEGORY_ORDER: UnitOfMeasure["category"][] = ["weight", "volume", "count", "length", "area"];

const UnitsOfMeasurePage = () => {
  const { units, isLoading, updateUnit, deleteUnit, seedDefaultUnits } = useUnitOfMeasure();
  const { profile } = useProfile();
  const canManage = profile?.role === "admin" || profile?.role === "inventory_manager";

  const [addOpen, setAddOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<UnitOfMeasure | null>(null);
  const [unitToDelete, setUnitToDelete] = useState<UnitOfMeasure | null>(null);
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    await seedDefaultUnits();
    setSeeding(false);
  };

  const grouped = CATEGORY_ORDER
    .map((cat) => ({ cat, items: units.filter((u) => u.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Ruler className="h-7 w-7 text-primary" /> Units of Measure
          </h1>
          <p className="text-muted-foreground mt-1 max-w-xl">
            Units used across inventory items and recipes (kg, lb, oz, L, each…). Recipes price variance per unit, so keep them consistent.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2 shrink-0">
            {units.length === 0 && (
              <Button variant="outline" onClick={handleSeed} disabled={seeding}>
                {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Seed defaults
              </Button>
            )}
            <Button onClick={() => setAddOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" /> New unit
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading units…
        </div>
      ) : units.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <Ruler className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-lg font-medium">No units yet</p>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Seed the common defaults (kg, lb, oz, L, ml, each…) or add your own to start building recipes.
            </p>
            {canManage && (
              <Button onClick={handleSeed} disabled={seeding} className="mt-2">
                {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Seed default units
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {grouped.map(({ cat, items }) => (
            <Card key={cat} className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {CATEGORY_LABELS[cat]}
                  <Badge variant="secondary">{items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {items.map((u) => (
                  <div key={u.id} className="flex items-center justify-between border-t border-border py-1.5 first:border-t-0">
                    <div className="min-w-0">
                      <span className="font-medium">{u.name}</span>
                      <span className="text-muted-foreground text-sm ml-2">{u.abbreviation}</span>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditUnit(u)}>
                          <Pencil className="h-3.5 w-3.5 text-primary" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setUnitToDelete(u)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddUnitDialog open={addOpen} onClose={() => setAddOpen(false)} />

      <EditUnitDialog unit={editUnit} onClose={() => setEditUnit(null)} onSave={updateUnit} />

      {unitToDelete && (
        <ConfirmDialog
          isOpen={!!unitToDelete}
          onClose={() => setUnitToDelete(null)}
          onConfirm={async () => { await deleteUnit(unitToDelete.id); setUnitToDelete(null); }}
          title="Delete unit"
          description={`Delete "${unitToDelete.name}" (${unitToDelete.abbreviation})? Items or recipes using it will fall back to no unit.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </div>
  );
};

// ── Edit dialog ──────────────────────────────────────────────────────────────
interface EditUnitDialogProps {
  unit: UnitOfMeasure | null;
  onClose: () => void;
  onSave: (unit: Omit<UnitOfMeasure, "createdAt" | "userId" | "organizationId">) => Promise<void>;
}

const EditUnitDialog: React.FC<EditUnitDialogProps> = ({ unit, onClose, onSave }) => {
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [category, setCategory] = useState<UnitOfMeasure["category"]>("weight");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (unit) {
      setName(unit.name);
      setAbbreviation(unit.abbreviation);
      setCategory(unit.category);
    }
  }, [unit]);

  const handleSave = async () => {
    if (!unit) return;
    setSaving(true);
    await onSave({ id: unit.id, name: name.trim(), abbreviation: abbreviation.trim(), category });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={!!unit} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Edit unit</DialogTitle>
          <DialogDescription>Update this unit of measure.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-unit-name">Name</Label>
              <Input id="edit-unit-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-unit-abbr">Abbreviation</Label>
              <Input id="edit-unit-abbr" value={abbreviation} onChange={(e) => setAbbreviation(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-unit-cat">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as UnitOfMeasure["category"])}>
              <SelectTrigger id="edit-unit-cat"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_ORDER.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || !abbreviation.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnitsOfMeasurePage;
