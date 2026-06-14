import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  PlusCircle, Trash2, Edit, Search, Utensils, Clock, ChevronDown, ChevronUp,
  Package, Plus, X, Loader2, AlertTriangle, Ruler
} from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import AddUnitDialog from "@/components/units/AddUnitDialog";
import { useRecipes, Recipe, RecipeIngredient, RecipeInput } from "@/context/RecipeContext";
import { useUnitOfMeasure } from "@/context/UnitOfMeasureContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { useInventory } from "@/context/InventoryContext";
import { useProfile } from "@/context/ProfileContext";
import { showError } from "@/utils/toast";

// ── Ingredient row editor ──────────────────────────────────────────────────
type DraftIngredient = Omit<RecipeIngredient, 'id' | 'recipeId' | 'organizationId' | 'createdAt'>;

const emptyIngredient = (): DraftIngredient => ({
  ingredientName: "",
  quantity: 0,
  inventoryItemId: undefined,
  unitId: undefined,
  unitName: undefined,
  notes: undefined,
  sortOrder: 0,
});

interface IngredientRowProps {
  ing: DraftIngredient;
  index: number;
  onChange: (index: number, updated: DraftIngredient) => void;
  onRemove: (index: number) => void;
}

const IngredientRow: React.FC<IngredientRowProps> = ({ ing, index, onChange, onRemove }) => {
  const { units } = useUnitOfMeasure();
  const { inventoryItems } = useInventory();
  const [addUnitOpen, setAddUnitOpen] = useState(false);

  const handleItemSelect = (itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    // Default the ingredient unit to the item's canonical usage unit so recipe
    // units line up with variance math (which does not auto-convert).
    const usageUnit = item?.usageUnitId ? units.find(u => u.id === item.usageUnitId) : undefined;
    onChange(index, {
      ...ing,
      inventoryItemId: itemId,
      ingredientName: item?.name || ing.ingredientName,
      ...(usageUnit ? { unitId: usageUnit.id, unitName: usageUnit.abbreviation } : {}),
    });
  };

  const selectedItem = ing.inventoryItemId ? inventoryItems.find(i => i.id === ing.inventoryItemId) : undefined;
  const itemUsageUnitId = selectedItem?.usageUnitId;
  const unitMismatch = !!selectedItem && !!itemUsageUnitId && !!ing.unitId && ing.unitId !== itemUsageUnitId;
  const missingItemUnit = !!selectedItem && !itemUsageUnitId;

  const handleUnitSelect = (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    onChange(index, { ...ing, unitId, unitName: unit?.abbreviation });
  };

  return (
    <div className="border border-border rounded-md p-2 bg-muted/20">
    <div className="grid grid-cols-12 gap-2 items-start">
      <div className="col-span-4">
        <Select
          value={ing.inventoryItemId || "_manual"}
          onValueChange={(v) => v === "_manual" ? onChange(index, { ...ing, inventoryItemId: undefined }) : handleItemSelect(v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Inventory item..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_manual">— Enter manually —</SelectItem>
            {inventoryItems.map(item => (
              <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!ing.inventoryItemId && (
          <Input
            className="mt-1 h-8 text-xs"
            placeholder="Ingredient name"
            value={ing.ingredientName}
            onChange={(e) => onChange(index, { ...ing, ingredientName: e.target.value })}
          />
        )}
      </div>
      <div className="col-span-2">
        <Input
          type="number"
          className="h-8 text-xs"
          placeholder="Qty"
          value={ing.quantity || ""}
          min={0}
          onChange={(e) => onChange(index, { ...ing, quantity: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div className="col-span-3">
        <Select
          value={ing.unitId || "_none"}
          onValueChange={(v) => {
            if (v === "_new") { setAddUnitOpen(true); return; }
            if (v === "_none") { onChange(index, { ...ing, unitId: undefined, unitName: undefined }); return; }
            handleUnitSelect(v);
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Unit..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">No unit</SelectItem>
            {units.map(u => (
              <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>
            ))}
            <SelectItem value="_new" className="text-primary font-medium">+ New unit…</SelectItem>
          </SelectContent>
        </Select>
        <AddUnitDialog
          open={addUnitOpen}
          onClose={() => setAddUnitOpen(false)}
          onCreated={(u) => onChange(index, { ...ing, unitId: u.id, unitName: u.abbreviation })}
        />
      </div>
      <div className="col-span-2">
        <Input
          className="h-8 text-xs"
          placeholder="Notes"
          value={ing.notes || ""}
          onChange={(e) => onChange(index, { ...ing, notes: e.target.value || undefined })}
        />
      </div>
      <div className="col-span-1 flex justify-end">
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onRemove(index)}>
          <X className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
    {unitMismatch && (
      <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Unit differs from this item's usage unit — fix it or variance will flag it as a setup error (no auto-conversion).
      </p>
    )}
    {missingItemUnit && (
      <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        This item has no canonical usage unit set — set one on the item so variance can price it.
      </p>
    )}
    </div>
  );
};

// ── Recipe form dialog ─────────────────────────────────────────────────────
interface RecipeFormProps {
  open: boolean;
  onClose: () => void;
  initialRecipe?: Recipe | null;
}

const RecipeForm: React.FC<RecipeFormProps> = ({ open, onClose, initialRecipe }) => {
  const { createRecipe, updateRecipe, fetchRecipeWithIngredients } = useRecipes();
  const { units, seedDefaultUnits } = useUnitOfMeasure();
  const { inventoryFolders } = useOnboarding();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [locationId, setLocationId] = useState<string>("");
  const [servingSize, setServingSize] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [outputQty, setOutputQty] = useState("1");
  const [outputUnitId, setOutputUnitId] = useState<string>("");
  const [outputItemId, setOutputItemId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([emptyIngredient()]);
  const [isSaving, setIsSaving] = useState(false);
  const [outputAddUnitOpen, setOutputAddUnitOpen] = useState(false);

  const restaurantLocations = inventoryFolders.filter(f => f.locationType === 'restaurant');

  useEffect(() => {
    if (!open) return;
    if (initialRecipe) {
      fetchRecipeWithIngredients(initialRecipe.id).then(full => {
        if (!full) return;
        setName(full.name);
        setDescription(full.description || "");
        setCategory(full.category || "");
        setLocationId(full.locationId || "");
        setServingSize(full.servingSize || "");
        setPrepTime(full.prepTimeMinutes?.toString() || "");
        setCookTime(full.cookTimeMinutes?.toString() || "");
        setOutputQty(full.outputQuantity.toString());
        setOutputUnitId(full.outputUnitId || "");
        setOutputItemId(full.outputItemId || "");
        setNotes(full.notes || "");
        setIngredients(full.ingredients?.length
          ? full.ingredients.map(i => ({
              ingredientName: i.ingredientName,
              quantity: i.quantity,
              inventoryItemId: i.inventoryItemId,
              unitId: i.unitId,
              unitName: i.unitName,
              notes: i.notes,
              sortOrder: i.sortOrder,
            }))
          : [emptyIngredient()]);
      });
    } else {
      setName(""); setDescription(""); setCategory(""); setLocationId("");
      setServingSize(""); setPrepTime(""); setCookTime("");
      setOutputQty("1"); setOutputUnitId(""); setOutputItemId(""); setNotes("");
      setIngredients([emptyIngredient()]);
    }
  }, [open, initialRecipe]);

  const handleIngredientChange = (index: number, updated: DraftIngredient) => {
    setIngredients(prev => prev.map((ing, i) => i === index ? updated : ing));
  };

  const handleIngredientRemove = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim()) { showError("Recipe name is required."); return; }
    // Drop blank rows (e.g. the default empty row or an unfilled extra one)
    // rather than blocking the whole save on them.
    const validIngredients = ingredients.filter(i => i.ingredientName.trim());
    if (validIngredients.length === 0) {
      showError("Add at least one ingredient."); return;
    }

    setIsSaving(true);
    const payload: RecipeInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      locationId: locationId || undefined,
      servingSize: servingSize.trim() || undefined,
      prepTimeMinutes: parseInt(prepTime) || undefined,
      cookTimeMinutes: parseInt(cookTime) || undefined,
      outputQuantity: parseFloat(outputQty) || 1,
      outputUnitId: outputUnitId || undefined,
      outputItemId: outputItemId || undefined,
      notes: notes.trim() || undefined,
      isActive: true,
      ingredients: validIngredients.map((i, idx) => ({ ...i, sortOrder: idx })),
    };

    if (initialRecipe) {
      await updateRecipe(initialRecipe.id, payload);
    } else {
      await createRecipe(payload);
    }
    setIsSaving(false);
    onClose();
  };

  // Guard against losing work when clicking outside / pressing Esc / hitting Cancel.
  const isDirty = !!(
    name.trim() || description.trim() || category.trim() || notes.trim() ||
    servingSize.trim() || prepTime || cookTime || locationId || outputUnitId ||
    outputQty !== "1" ||
    ingredients.some((i) => i.ingredientName.trim() || i.quantity || i.inventoryItemId)
  );

  const attemptClose = () => {
    if (isSaving) return; // never close mid-save
    if (isDirty && !window.confirm("Discard this recipe? Your unsaved changes will be lost.")) return;
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) attemptClose(); }}>
      <DialogContent
        className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => { if (isDirty) { e.preventDefault(); attemptClose(); } }}
      >
        <DialogHeader>
          <DialogTitle>{initialRecipe ? "Edit Recipe" : "New Recipe / BOM"}</DialogTitle>
          <DialogDescription>
            Define ingredients and quantities. Link to a restaurant location for par-level tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="recipe-name">Recipe Name <span className="text-red-500">*</span></Label>
              <Input id="recipe-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Caesar Salad" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recipe-category">Category</Label>
              <Input id="recipe-category" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g., Salads, Burgers" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recipe-desc">Description</Label>
            <Textarea id="recipe-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief description..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="recipe-location">Location (optional)</Label>
              <Select value={locationId || "_none"} onValueChange={v => setLocationId(v === "_none" ? "" : v)}>
                <SelectTrigger id="recipe-location">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">All locations</SelectItem>
                  {restaurantLocations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prep-time">Prep Time (min)</Label>
              <Input id="prep-time" type="number" min={0} value={prepTime} onChange={e => setPrepTime(e.target.value)} placeholder="15" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cook-time">Cook Time (min)</Label>
              <Input id="cook-time" type="number" min={0} value={cookTime} onChange={e => setCookTime(e.target.value)} placeholder="30" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="serving-size">Serving Size</Label>
              <Input id="serving-size" value={servingSize} onChange={e => setServingSize(e.target.value)} placeholder="e.g., 1 plate, 250g" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="output-qty">Output Quantity</Label>
              <Input id="output-qty" type="number" min={0} step={0.01} value={outputQty} onChange={e => setOutputQty(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="output-unit">Output Unit</Label>
              <Select
                value={outputUnitId || "_none"}
                onValueChange={v => {
                  if (v === "_new") { setOutputAddUnitOpen(true); return; }
                  setOutputUnitId(v === "_none" ? "" : v);
                }}
              >
                <SelectTrigger id="output-unit">
                  <SelectValue placeholder="Unit..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No unit</SelectItem>
                  {units.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>
                  ))}
                  <SelectItem value="_new" className="text-primary font-medium">+ New unit…</SelectItem>
                </SelectContent>
              </Select>
              <AddUnitDialog
                open={outputAddUnitOpen}
                onClose={() => setOutputAddUnitOpen(false)}
                onCreated={(u) => setOutputUnitId(u.id)}
              />
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Ingredients</Label>
              {units.length === 0 && (
                <Button type="button" variant="link" size="sm" className="text-xs h-auto p-0" onClick={seedDefaultUnits}>
                  + Seed default units
                </Button>
              )}
            </div>
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-2">
              <span className="col-span-4">Ingredient / Item</span>
              <span className="col-span-2">Qty</span>
              <span className="col-span-3">Unit</span>
              <span className="col-span-2">Notes</span>
              <span className="col-span-1"></span>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {ingredients.map((ing, idx) => (
                <IngredientRow
                  key={idx}
                  ing={ing}
                  index={idx}
                  onChange={handleIngredientChange}
                  onRemove={handleIngredientRemove}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIngredients(prev => [...prev, emptyIngredient()])}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Ingredient
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recipe-notes">Notes</Label>
            <Textarea id="recipe-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Preparation notes, allergens, etc." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={attemptClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initialRecipe ? "Save Changes" : "Create Recipe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Recipe card ────────────────────────────────────────────────────────────
interface RecipeCardProps {
  recipe: Recipe;
  onEdit: (r: Recipe) => void;
  onDelete: (r: Recipe) => void;
  canManage: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onEdit, onDelete, canManage }) => {
  const [expanded, setExpanded] = useState(false);
  const { inventoryFolders } = useOnboarding();
  const location = recipe.locationId ? inventoryFolders.find(f => f.id === recipe.locationId) : null;

  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">{recipe.name}</CardTitle>
            {recipe.category && <p className="text-xs text-muted-foreground mt-0.5">{recipe.category}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!recipe.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
            {canManage && (
              <>
                <Button variant="ghost" size="sm" onClick={() => onEdit(recipe)}><Edit className="h-4 w-4 text-primary" /></Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(recipe)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {recipe.description && <p className="text-sm text-muted-foreground line-clamp-2">{recipe.description}</p>}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {location && (
            <span className="flex items-center gap-1"><Package className="h-3 w-3" />{location.name}</span>
          )}
          {totalTime > 0 && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{totalTime} min</span>
          )}
          {recipe.servingSize && <span>Serves: {recipe.servingSize}</span>}
          {recipe.outputQuantity && <span>Yield: {recipe.outputQuantity}</span>}
        </div>
        <Button variant="ghost" size="sm" className="text-xs h-7 px-2 w-full justify-start" onClick={() => setExpanded(e => !e)}>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
          Ingredients
        </Button>
        {expanded && recipe.ingredients && (
          <div className="space-y-1 pl-2 border-l-2 border-border">
            {recipe.ingredients.length === 0 ? (
              <p className="text-xs text-muted-foreground">No ingredients yet.</p>
            ) : recipe.ingredients.map(ing => (
              <div key={ing.id} className="flex items-center justify-between text-xs">
                <span>{ing.ingredientName}</span>
                <span className="text-muted-foreground">{ing.quantity} {ing.unitName || ''}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────
const RecipesPage = () => {
  const { recipes, isLoading, deleteRecipe, fetchRecipeWithIngredients } = useRecipes();
  const { profile } = useProfile();
  const { inventoryFolders } = useOnboarding();

  const canManage = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  // Cache full recipes (with ingredients) when expanded
  const [fullRecipes, setFullRecipes] = useState<Record<string, Recipe>>({});

  const restaurantLocations = inventoryFolders.filter(f => f.locationType === 'restaurant');

  const filtered = recipes.filter(r => {
    const matchesSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.category?.toLowerCase().includes(search.toLowerCase());
    const matchesLocation = filterLocation === 'all' || r.locationId === filterLocation || (!r.locationId && filterLocation === 'global');
    return matchesSearch && matchesLocation;
  });

  const handleEdit = async (recipe: Recipe) => {
    const full = fullRecipes[recipe.id] || await fetchRecipeWithIngredients(recipe.id);
    if (full) setFullRecipes(prev => ({ ...prev, [recipe.id]: full }));
    setRecipeToEdit(full || recipe);
    setIsFormOpen(true);
  };

  const handleDelete = (recipe: Recipe) => {
    setRecipeToDelete(recipe);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (recipeToDelete) await deleteRecipe(recipeToDelete.id);
    setIsConfirmOpen(false);
    setRecipeToDelete(null);
  };

  // Attach ingredients to recipes for card display
  const recipesWithIngredients = filtered.map(r => fullRecipes[r.id] || r);

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Utensils className="h-7 w-7 text-primary" /> Recipes & BOM
          </h1>
          <p className="text-muted-foreground mt-1">
            Define recipes (restaurants) or bills of materials (warehouses) with ingredient quantities.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" asChild>
              <Link to="/units"><Ruler className="h-4 w-4 mr-2" /> Manage units</Link>
            </Button>
            <Button onClick={() => { setRecipeToEdit(null); setIsFormOpen(true); }}>
              <PlusCircle className="h-4 w-4 mr-2" /> New Recipe
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={filterLocation} onValueChange={setFilterLocation}>
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            <SelectItem value="global">Org-wide (no location)</SelectItem>
            {restaurantLocations.map(loc => (
              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="self-center px-3 py-1">
          {filtered.length} recipe{filtered.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Recipe grid */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading recipes...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Utensils className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">
            {recipes.length === 0
              ? "No recipes yet. Create your first recipe or bill of materials."
              : "No recipes match your filters."}
          </p>
          {canManage && recipes.length === 0 && (
            <Button className="mt-4" onClick={() => { setRecipeToEdit(null); setIsFormOpen(true); }}>
              <PlusCircle className="h-4 w-4 mr-2" /> Create First Recipe
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipesWithIngredients.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      <RecipeForm
        open={isFormOpen}
        onClose={() => { setIsFormOpen(false); setRecipeToEdit(null); }}
        initialRecipe={recipeToEdit}
      />

      {recipeToDelete && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Recipe"
          description={`Are you sure you want to delete "${recipeToDelete.name}"? This cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </div>
  );
};

export default RecipesPage;
