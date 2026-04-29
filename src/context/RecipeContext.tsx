"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  organizationId: string;
  inventoryItemId?: string;
  ingredientName: string;
  quantity: number;
  unitId?: string;
  unitName?: string;
  notes?: string;
  sortOrder: number;
  createdAt: string;
}

export interface Recipe {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  description?: string;
  category?: string;
  outputItemId?: string;
  outputQuantity: number;
  outputUnitId?: string;
  locationId?: string;
  servingSize?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ingredients?: RecipeIngredient[];
}

export type RecipeIngredientInput = Omit<RecipeIngredient, 'id' | 'recipeId' | 'organizationId' | 'createdAt'>;

export type RecipeInput = Omit<Recipe, 'id' | 'organizationId' | 'userId' | 'createdAt' | 'updatedAt' | 'ingredients'> & {
  ingredients: RecipeIngredientInput[];
};

interface RecipeContextType {
  recipes: Recipe[];
  isLoading: boolean;
  createRecipe: (recipe: RecipeInput) => Promise<Recipe | null>;
  updateRecipe: (id: string, recipe: Partial<RecipeInput>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  fetchRecipeWithIngredients: (id: string) => Promise<Recipe | null>;
  refreshRecipes: () => Promise<void>;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

const mapRecipeRow = (row: any): Recipe => ({
  id: row.id,
  organizationId: row.organization_id,
  userId: row.user_id,
  name: row.name,
  description: row.description || undefined,
  category: row.category || undefined,
  outputItemId: row.output_item_id || undefined,
  outputQuantity: parseFloat(row.output_quantity) || 1,
  outputUnitId: row.output_unit_id || undefined,
  locationId: row.location_id || undefined,
  servingSize: row.serving_size || undefined,
  prepTimeMinutes: row.prep_time_minutes || undefined,
  cookTimeMinutes: row.cook_time_minutes || undefined,
  notes: row.notes || undefined,
  isActive: row.is_active !== false,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapIngredientRow = (row: any): RecipeIngredient => ({
  id: row.id,
  recipeId: row.recipe_id,
  organizationId: row.organization_id,
  inventoryItemId: row.inventory_item_id || undefined,
  ingredientName: row.ingredient_name,
  quantity: parseFloat(row.quantity) || 0,
  unitId: row.unit_id || undefined,
  unitName: row.unit_name || undefined,
  notes: row.notes || undefined,
  sortOrder: row.sort_order || 0,
  createdAt: row.created_at,
});

export const RecipeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile, isLoadingProfile } = useProfile();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecipes = useCallback(async () => {
    setIsLoading(true);
    if (!profile?.organizationId) {
      setRecipes([]);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("name");

    if (error) {
      console.error("Error fetching recipes:", error);
      showError("Failed to load recipes.");
      setRecipes([]);
    } else {
      setRecipes(data.map(mapRecipeRow));
    }
    setIsLoading(false);
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!isLoadingProfile && profile?.organizationId) {
      fetchRecipes();
    } else if (!isLoadingProfile) {
      setRecipes([]);
      setIsLoading(false);
    }
  }, [isLoadingProfile, profile?.organizationId, fetchRecipes]);

  const createRecipe = async (recipeInput: RecipeInput): Promise<Recipe | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login required to create recipes.");
      return null;
    }

    const { ingredients, ...recipeFields } = recipeInput;

    const { data: recipeData, error: recipeError } = await supabase
      .from("recipes")
      .insert({
        organization_id: profile.organizationId,
        user_id: session.user.id,
        name: recipeFields.name,
        description: recipeFields.description,
        category: recipeFields.category,
        output_item_id: recipeFields.outputItemId || null,
        output_quantity: recipeFields.outputQuantity,
        output_unit_id: recipeFields.outputUnitId || null,
        location_id: recipeFields.locationId || null,
        serving_size: recipeFields.servingSize,
        prep_time_minutes: recipeFields.prepTimeMinutes || null,
        cook_time_minutes: recipeFields.cookTimeMinutes || null,
        notes: recipeFields.notes,
        is_active: recipeFields.isActive !== false,
      })
      .select()
      .single();

    if (recipeError) {
      showError(`Failed to create recipe: ${recipeError.message}`);
      return null;
    }

    const newRecipe = mapRecipeRow(recipeData);

    if (ingredients.length > 0) {
      const ingredientRows = ingredients.map((ing, idx) => ({
        recipe_id: newRecipe.id,
        organization_id: profile.organizationId,
        inventory_item_id: ing.inventoryItemId || null,
        ingredient_name: ing.ingredientName,
        quantity: ing.quantity,
        unit_id: ing.unitId || null,
        unit_name: ing.unitName || null,
        notes: ing.notes || null,
        sort_order: ing.sortOrder ?? idx,
      }));

      const { error: ingError } = await supabase.from("recipe_ingredients").insert(ingredientRows);
      if (ingError) {
        showError(`Recipe created but failed to save ingredients: ${ingError.message}`);
      }
    }

    setRecipes(prev => [...prev, newRecipe].sort((a, b) => a.name.localeCompare(b.name)));
    showSuccess(`Recipe "${newRecipe.name}" created.`);
    return newRecipe;
  };

  const updateRecipe = async (id: string, updates: Partial<RecipeInput>) => {
    if (!profile?.organizationId) return;

    const { ingredients, ...recipeFields } = updates;

    const updatePayload: Record<string, any> = {};
    if (recipeFields.name !== undefined) updatePayload.name = recipeFields.name;
    if (recipeFields.description !== undefined) updatePayload.description = recipeFields.description;
    if (recipeFields.category !== undefined) updatePayload.category = recipeFields.category;
    if (recipeFields.outputItemId !== undefined) updatePayload.output_item_id = recipeFields.outputItemId || null;
    if (recipeFields.outputQuantity !== undefined) updatePayload.output_quantity = recipeFields.outputQuantity;
    if (recipeFields.outputUnitId !== undefined) updatePayload.output_unit_id = recipeFields.outputUnitId || null;
    if (recipeFields.locationId !== undefined) updatePayload.location_id = recipeFields.locationId || null;
    if (recipeFields.servingSize !== undefined) updatePayload.serving_size = recipeFields.servingSize;
    if (recipeFields.prepTimeMinutes !== undefined) updatePayload.prep_time_minutes = recipeFields.prepTimeMinutes;
    if (recipeFields.cookTimeMinutes !== undefined) updatePayload.cook_time_minutes = recipeFields.cookTimeMinutes;
    if (recipeFields.notes !== undefined) updatePayload.notes = recipeFields.notes;
    if (recipeFields.isActive !== undefined) updatePayload.is_active = recipeFields.isActive;
    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("recipes")
      .update(updatePayload)
      .eq("id", id)
      .eq("organization_id", profile.organizationId)
      .select()
      .single();

    if (error) {
      showError(`Failed to update recipe: ${error.message}`);
      return;
    }

    if (ingredients !== undefined) {
      await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
      if (ingredients.length > 0) {
        const ingredientRows = ingredients.map((ing, idx) => ({
          recipe_id: id,
          organization_id: profile.organizationId,
          inventory_item_id: ing.inventoryItemId || null,
          ingredient_name: ing.ingredientName,
          quantity: ing.quantity,
          unit_id: ing.unitId || null,
          unit_name: ing.unitName || null,
          notes: ing.notes || null,
          sort_order: ing.sortOrder ?? idx,
        }));
        await supabase.from("recipe_ingredients").insert(ingredientRows);
      }
    }

    setRecipes(prev => prev.map(r => r.id === id ? mapRecipeRow(data) : r));
    showSuccess(`Recipe "${data.name}" updated.`);
  };

  const deleteRecipe = async (id: string) => {
    if (!profile?.organizationId) return;

    const { error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", id)
      .eq("organization_id", profile.organizationId);

    if (error) {
      showError(`Failed to delete recipe: ${error.message}`);
      return;
    }

    setRecipes(prev => prev.filter(r => r.id !== id));
    showSuccess("Recipe deleted.");
  };

  const fetchRecipeWithIngredients = async (id: string): Promise<Recipe | null> => {
    if (!profile?.organizationId) return null;

    const [{ data: recipeData, error: recipeError }, { data: ingData, error: ingError }] = await Promise.all([
      supabase.from("recipes").select("*").eq("id", id).single(),
      supabase.from("recipe_ingredients").select("*").eq("recipe_id", id).order("sort_order"),
    ]);

    if (recipeError || !recipeData) {
      showError("Failed to load recipe.");
      return null;
    }

    return {
      ...mapRecipeRow(recipeData),
      ingredients: ingError ? [] : (ingData || []).map(mapIngredientRow),
    };
  };

  return (
    <RecipeContext.Provider value={{
      recipes,
      isLoading,
      createRecipe,
      updateRecipe,
      deleteRecipe,
      fetchRecipeWithIngredients,
      refreshRecipes: fetchRecipes,
    }}>
      {children}
    </RecipeContext.Provider>
  );
};

export const useRecipes = () => {
  const ctx = useContext(RecipeContext);
  if (!ctx) throw new Error("useRecipes must be used within RecipeProvider");
  return ctx;
};
