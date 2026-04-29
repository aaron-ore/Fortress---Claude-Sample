"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showError, showSuccess } from "@/utils/toast";
import { useProfile } from "./ProfileContext";
import { parseAndValidateDate } from "@/utils/dateUtils";

export interface ReplenishmentTask {
  id: string;
  itemId: string;
  itemName: string;
  fromFolderId: string;
  toFolderId: string;
  quantity: number;
  status: "Pending" | "Assigned" | "Completed" | "Cancelled";
  assignedTo?: string;
  createdAt: string;
  completedAt?: string;
  organizationId: string | null;
}

interface ReplenishmentContextType {
  replenishmentTasks: ReplenishmentTask[];
  isLoadingReplenishmentTasks: boolean; // Added missing property
  addReplenishmentTask: (task: Omit<ReplenishmentTask, "id" | "createdAt" | "organizationId" | "status" | "completedAt">) => Promise<void>;
  updateReplenishmentTask: (updatedTask: ReplenishmentTask) => Promise<void>;
  fetchReplenishmentTasks: () => Promise<void>;
}

const ReplenishmentContext = createContext<ReplenishmentContextType | undefined>(undefined);

export const ReplenishmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [replenishmentTasks, setReplenishmentTasks] = useState<ReplenishmentTask[]>([]);
  const [isLoadingReplenishmentTasks, setIsLoadingReplenishmentTasks] = useState(true);
  const { profile, isLoadingProfile } = useProfile();

  const mapSupabaseTaskToReplenishmentTask = (task: any): ReplenishmentTask => {
    const quantity = parseInt(task.quantity || '0');

    const validatedCreatedAt = parseAndValidateDate(task.created_at);
    const createdAtString = validatedCreatedAt ? validatedCreatedAt.toISOString() : new Date().toISOString();

    const validatedCompletedAt = parseAndValidateDate(task.completed_at);
    const completedAtString = validatedCompletedAt ? validatedCompletedAt.toISOString() : undefined;

    return {
      id: task.id || "",
      itemId: task.item_id || "",
      itemName: task.item_name || "",
      fromFolderId: task.from_folder_id || "",
      toFolderId: task.to_folder_id || "",
      quantity: isNaN(quantity) ? 0 : quantity,
      status: task.status || "Pending",
      assignedTo: task.assigned_to || undefined,
      createdAt: createdAtString,
      completedAt: completedAtString,
      organizationId: task.organization_id,
    };
  };

  const fetchReplenishmentTasks = useCallback(async () => {
    setIsLoadingReplenishmentTasks(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      setReplenishmentTasks([]);
      setIsLoadingReplenishmentTasks(false);
      return;
    }

    const { data, error } = await supabase
      .from("replenishment_tasks")
      .select("*")
      .eq("organization_id", profile.organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching replenishment tasks:", error);
      showError("Failed to load tasks.");
      setReplenishmentTasks([]);
    } else {
      const fetchedTasks: ReplenishmentTask[] = data.map(mapSupabaseTaskToReplenishmentTask);
      setReplenishmentTasks(fetchedTasks);
    }
    setIsLoadingReplenishmentTasks(false);
  }, [profile?.organizationId, profile]);

  useEffect(() => {
    if (!isLoadingProfile) {
      fetchReplenishmentTasks();
    }
  }, [fetchReplenishmentTasks, isLoadingProfile]);

  const addReplenishmentTask = async (task: Omit<ReplenishmentTask, "id" | "createdAt" | "organizationId" | "status" | "completedAt">) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login/org ID required.");
      return;
    }

    const { data, error } = await supabase
      .from("replenishment_tasks")
      .insert({
        item_id: task.itemId,
        item_name: task.itemName,
        from_folder_id: task.fromFolderId,
        to_folder_id: task.toFolderId,
        quantity: task.quantity,
        status: "Pending",
        user_id: session.user.id,
        organization_id: profile.organizationId,
      })
      .select();

    if (error) {
      console.error("Error adding replenishment task:", error);
      showError(`Failed to add task: ${error.message}`);
    } else if (data && data.length > 0) {
      const newTask: ReplenishmentTask = mapSupabaseTaskToReplenishmentTask(data[0]);
      setReplenishmentTasks((prev) => [...prev, newTask]);
      showSuccess(`Task for ${task.itemName} created!`);
    }
  };

  const updateReplenishmentTask = async (updatedTask: ReplenishmentTask) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !profile?.organizationId) {
      showError("Login/org ID required.");
      return;
    }

    const { data, error } = await supabase
      .from("replenishment_tasks")
      .update({
        item_id: updatedTask.itemId,
        item_name: updatedTask.itemName,
        from_folder_id: updatedTask.fromFolderId,
        to_folder_id: updatedTask.toFolderId,
        quantity: updatedTask.quantity,
        status: updatedTask.status,
        assigned_to: updatedTask.assignedTo,
        completed_at: updatedTask.completedAt,
      })
      .eq("id", updatedTask.id)
      .eq("organization_id", profile.organizationId)
      .select();

    if (error) {
      console.error("Error updating replenishment task:", error);
      showError(`Failed to update task: ${error.message}`);
    } else if (data && data.length > 0) {
      const updatedTaskFromDB: ReplenishmentTask = mapSupabaseTaskToReplenishmentTask(data[0]);
      setReplenishmentTasks((prev) =>
        prev.map((task) =>
          task.id === updatedTask.id ? updatedTaskFromDB : task,
        ),
      );
      showSuccess(`Task ${updatedTask.id} updated to ${updatedTask.status}.`);
    }
  };

  return (
    <ReplenishmentContext.Provider value={{ replenishmentTasks, isLoadingReplenishmentTasks, addReplenishmentTask, updateReplenishmentTask, fetchReplenishmentTasks }}>
      {children}
    </ReplenishmentContext.Provider>
  );
};

export const useReplenishment = () => {
  const context = useContext(ReplenishmentContext);
  if (context === undefined) {
    throw new Error("useReplenishment must be used within a ReplenishmentProvider");
  }
  return context;
};