import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PlusCircle, Trash2, MapPin, Edit, Search, Warehouse, Utensils, Package, Phone, User, Building2 } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useOnboarding, InventoryFolder, LocationType } from "@/context/OnboardingContext";
import FolderLabelGenerator from "@/components/FolderLabelGenerator";
import FolderInventoryViewDialog from "@/components/FolderInventoryViewDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useProfile } from "@/context/ProfileContext";
import { showError } from "@/utils/toast";

const locationTypeConfig: Record<LocationType, { label: string; icon: React.ElementType; badgeClass: string }> = {
  warehouse: { label: "Warehouse", icon: Warehouse, badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  restaurant: { label: "Restaurant", icon: Utensils, badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  generic: { label: "Generic", icon: Package, badgeClass: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" },
};

const Locations = () => {
  const { inventoryFolders, addInventoryFolder, updateInventoryFolder, removeInventoryFolder, isLoadingFolders } = useOnboarding();
  const { profile } = useProfile();

  const canManageLocations = profile?.role === 'admin' || profile?.role === 'inventory_manager';
  const canViewLocations = profile?.role === 'admin' || profile?.role === 'inventory_manager' || profile?.role === 'viewer';

  const [filterType, setFilterType] = useState<LocationType | 'all'>('all');
  const [search, setSearch] = useState("");
  const [locationToDelete, setLocationToDelete] = useState<InventoryFolder | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [locationToEdit, setLocationToEdit] = useState<InventoryFolder | null>(null);
  const [inventoryViewLocationId, setInventoryViewLocationId] = useState<string | null>(null);
  const [isInventoryViewOpen, setIsInventoryViewOpen] = useState(false);

  const filtered = inventoryFolders.filter((f) => {
    const matchesType = filterType === 'all' || f.locationType === filterType;
    const matchesSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.address?.toLowerCase().includes(search.toLowerCase()) ||
      f.managerName?.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const counts = {
    all: inventoryFolders.length,
    warehouse: inventoryFolders.filter(f => f.locationType === 'warehouse').length,
    restaurant: inventoryFolders.filter(f => f.locationType === 'restaurant').length,
    generic: inventoryFolders.filter(f => f.locationType === 'generic').length,
  };

  const handleAdd = () => {
    if (!canManageLocations) { showError("No permission to add locations."); return; }
    setLocationToEdit(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (loc: InventoryFolder) => {
    if (!canManageLocations) { showError("No permission to edit locations."); return; }
    setLocationToEdit(loc);
    setIsDialogOpen(true);
  };

  const handleDelete = (loc: InventoryFolder) => {
    if (!canManageLocations) { showError("No permission to delete locations."); return; }
    setLocationToDelete(loc);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (locationToDelete) {
      await removeInventoryFolder(locationToDelete.id);
      if (inventoryViewLocationId === locationToDelete.id) {
        setInventoryViewLocationId(null);
        setIsInventoryViewOpen(false);
      }
    }
    setIsConfirmDeleteOpen(false);
    setLocationToDelete(null);
  };

  const handleSave = async (data: Omit<InventoryFolder, 'id' | 'createdAt' | 'userId' | 'organizationId'>, isNew: boolean) => {
    if (isNew) {
      await addInventoryFolder(data);
    } else if (locationToEdit) {
      await updateInventoryFolder({ ...locationToEdit, ...data });
    }
    setIsDialogOpen(false);
  };

  if (!canViewLocations) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center">
          <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
          <CardContent>
            <p className="text-muted-foreground">You do not have permission to view locations.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MapPin className="h-7 w-7 text-primary" /> Locations
          </h1>
          <p className="text-muted-foreground mt-1">Manage warehouse and restaurant locations across your organization.</p>
        </div>
        {canManageLocations && (
          <Button onClick={handleAdd} className="shrink-0">
            <PlusCircle className="h-4 w-4 mr-2" /> Add Location
          </Button>
        )}
      </div>

      {/* Filter tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'warehouse', 'restaurant', 'generic'] as const).map((type) => (
            <Button
              key={type}
              variant={filterType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType(type)}
            >
              {type === 'all' ? 'All' : locationTypeConfig[type].label}
              <span className="ml-1.5 text-xs opacity-70">({counts[type]})</span>
            </Button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Location cards grid */}
      {isLoadingFolders ? (
        <div className="text-center py-16 text-muted-foreground">Loading locations...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">
            {inventoryFolders.length === 0
              ? "No locations yet. Add your first warehouse or restaurant location."
              : "No locations match your filter."}
          </p>
          {canManageLocations && inventoryFolders.length === 0 && (
            <Button className="mt-4" onClick={handleAdd}>
              <PlusCircle className="h-4 w-4 mr-2" /> Add First Location
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((loc) => {
            const typeConf = locationTypeConfig[loc.locationType] || locationTypeConfig.generic;
            const TypeIcon = typeConf.icon;
            return (
              <Card key={loc.id} className={`border-border shadow-sm flex flex-col ${!loc.isActive ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: loc.color }} />
                      <CardTitle className="text-base font-semibold truncate">{loc.name}</CardTitle>
                    </div>
                    <Badge className={`shrink-0 text-xs font-medium ${typeConf.badgeClass}`}>
                      <TypeIcon className="h-3 w-3 mr-1" />
                      {typeConf.label}
                    </Badge>
                  </div>
                  {!loc.isActive && (
                    <Badge variant="outline" className="text-xs w-fit text-muted-foreground">Inactive</Badge>
                  )}
                </CardHeader>
                <CardContent className="pt-0 flex-grow space-y-2">
                  {loc.address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span className="leading-snug">{loc.address}</span>
                    </div>
                  )}
                  {loc.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{loc.phone}</span>
                    </div>
                  )}
                  {loc.managerName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span>{loc.managerName}</span>
                    </div>
                  )}
                  {loc.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{loc.description}</p>
                  )}
                </CardContent>
                <div className="px-6 pb-4 flex gap-2 border-t border-border pt-3 mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => { setInventoryViewLocationId(loc.id); setIsInventoryViewOpen(true); }}
                  >
                    <Package className="h-3.5 w-3.5 mr-1.5" /> View Stock
                  </Button>
                  {canManageLocations && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(loc)} aria-label={`Edit ${loc.name}`}>
                        <Edit className="h-4 w-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(loc)} aria-label={`Delete ${loc.name}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirm */}
      {locationToDelete && (
        <ConfirmDialog
          isOpen={isConfirmDeleteOpen}
          onClose={() => setIsConfirmDeleteOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Location"
          description={`Are you sure you want to delete "${locationToDelete.name}"? This cannot be undone and will unassign all items within it.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}

      {/* Add/Edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{locationToEdit ? "Edit Location" : "Add New Location"}</DialogTitle>
            <DialogDescription>
              {locationToEdit
                ? "Update this location's details and generate QR labels."
                : "Define a new warehouse or restaurant location and generate scannable labels."}
            </DialogDescription>
          </DialogHeader>
          <FolderLabelGenerator
            initialFolder={locationToEdit}
            onSave={handleSave}
            onClose={() => setIsDialogOpen(false)}
            disabled={!canManageLocations}
          />
        </DialogContent>
      </Dialog>

      {/* Inventory view */}
      {inventoryViewLocationId && (
        <FolderInventoryViewDialog
          isOpen={isInventoryViewOpen}
          onClose={() => setIsInventoryViewOpen(false)}
          folderId={inventoryViewLocationId}
        />
      )}
    </div>
  );
};

export default Locations;
