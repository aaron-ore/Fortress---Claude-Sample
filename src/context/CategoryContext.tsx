import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";

export interface Category {
  id: string;
  name: string;
  organizationId: string | null;
}

interface CategoryContextType {
  categories: Category[];
  isLoadingCategories: boolean;
  addCategory: (name: string) => Promise<Category | null>;
  removeCategory: (id: string) => Promise<void>;
  refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const { profile, isLoadingProfile } = useProfile();

  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      setCategories([]);
      setIsLoadingCategories(false);
      return;
    }

    const { data, error } = await supabase
      .from("categories")
      .select("id, name, organization_id")
      .eq("organization_id", profile.organizationId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      showError("Failed to load categories.");
      setCategories([]);
    } else {
      const fetchedCategories: Category[] = data.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        organizationId: cat.organization_id,
      }));
      setCategories(fetchedCategories);
    }
    setIsLoadingCategories(false);
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!isLoadingProfile) {
      fetchCategories();
    }
  }, [fetchCategories, isLoadingProfile]);

  const addCategory = async (name: string): Promise<Category | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login/org ID required.");
      return null;
    }

    const trimmedName = name.trim();
    const existingCategory = categories.find(cat => cat.name.toLowerCase() === trimmedName.toLowerCase());
    if (existingCategory) {
      return existingCategory;
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({ name: trimmedName, user_id: session.user.id, organization_id: profile.organizationId })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        console.warn(`Category "${trimmedName}" already exists in DB, likely added concurrently.`);
        const { data: existingDbCategory, error: _fetchErrorInner } = await supabase
          .from("categories")
          .select("id, name, organization_id")
          .eq("name", trimmedName)
          .eq("organization_id", profile.organizationId)
          .single();
        if (existingDbCategory) {
          const mappedExistingCategory: Category = {
            id: existingDbCategory.id,
            name: existingDbCategory.name,
            organizationId: existingDbCategory.organization_id,
          };
          setCategories((prev) => Array.from(new Set([...prev, mappedExistingCategory].map(c => JSON.stringify(c)))).map(s => JSON.parse(s)));
          return mappedExistingCategory;
        }
      }
      console.error("Error adding category:", error);
      showError(`Failed to add category: ${error.message}`);
      return null;
    } else if (data) {
      const newCategory: Category = {
        id: data.id,
        name: data.name,
        organizationId: data.organization_id,
      };
      setCategories((prev) => [...prev, newCategory]);
      showSuccess(`Category "${trimmedName}" added.`);
      return newCategory;
    }
    return null;
  };

  const removeCategory = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login/org ID required.");
      return;
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("organization_id", profile.organizationId);

    if (error) {
      console.error("Error removing category:", error);
      showError(`Failed to remove category: ${error.message}`);
    } else {
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
      showSuccess("Category removed.");
    }
  };

  const refreshCategories = async () => {
    await fetchCategories();
  };

  return (
    <CategoryContext.Provider value={{ categories, isLoadingCategories, addCategory, removeCategory, refreshCategories }}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error("useCategories must be used within a CategoryProvider");
  }
  return context;
};