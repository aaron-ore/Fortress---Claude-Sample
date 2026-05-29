import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PlusCircle, CalendarRange, Loader2 } from "lucide-react";
import { useVariancePeriods } from "@/context/VariancePeriodContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { showError } from "@/utils/toast";

interface PeriodPickerProps {
  value: string;
  onChange: (periodId: string) => void;
  canManage?: boolean;
}

const PeriodPicker: React.FC<PeriodPickerProps> = ({ value, onChange, canManage = true }) => {
  const { periods, createPeriod } = useVariancePeriods();
  const { inventoryFolders } = useOnboarding();
  const restaurantLocations = inventoryFolders.filter((f) => f.locationType === "restaurant");

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const locationName = (id: string) => inventoryFolders.find((f) => f.id === id)?.name || "Unknown location";

  const handleCreate = async () => {
    if (!name.trim()) return showError("Period name is required.");
    if (!locationId) return showError("Select a restaurant location.");
    if (!startDate || !endDate) return showError("Start and end dates are required.");
    if (endDate < startDate) return showError("End date must be on or after the start date.");
    setSaving(true);
    const created = await createPeriod({ name: name.trim(), locationId, startDate, endDate });
    setSaving(false);
    if (created) {
      onChange(created.id);
      setOpen(false);
      setName(""); setLocationId(""); setStartDate(""); setEndDate("");
    }
  };

  return (
    <div className="flex items-end gap-2">
      <div className="space-y-1.5 flex-1 min-w-0">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <CalendarRange className="h-3.5 w-3.5" /> Variance period
        </Label>
        <Select value={value || "_none"} onValueChange={(v) => onChange(v === "_none" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a period..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Select a period...</SelectItem>
            {periods.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} · {p.startDate} → {p.endDate} · {locationName(p.locationId)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {canManage && (
        <Button variant="outline" onClick={() => setOpen(true)} className="shrink-0">
          <PlusCircle className="h-4 w-4 mr-2" /> New
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New variance period</DialogTitle>
            <DialogDescription>A location and date range that scopes sales, counts, and purchases.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="period-name">Name</Label>
              <Input id="period-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Week of May 19" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period-location">Restaurant location</Label>
              <Select value={locationId || "_none"} onValueChange={(v) => setLocationId(v === "_none" ? "" : v)}>
                <SelectTrigger id="period-location">
                  <SelectValue placeholder="Select location..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none" disabled>Select location...</SelectItem>
                  {restaurantLocations.length === 0 && (
                    <SelectItem value="_empty" disabled>No restaurant locations yet</SelectItem>
                  )}
                  {restaurantLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="period-start">Start date</Label>
                <Input id="period-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="period-end">End date</Label>
                <Input id="period-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PeriodPicker;
