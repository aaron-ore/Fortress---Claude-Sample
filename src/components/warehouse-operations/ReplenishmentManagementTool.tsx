import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Truck, Package, ArrowRight, CheckCircle, User } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useInventory, InventoryItem } from "@/context/InventoryContext";
import { useReplenishment, ReplenishmentTask } from "@/context/ReplenishmentContext";
import { useProfile } from "@/context/ProfileContext";
import { formatDistanceToNowStrict } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useOnboarding } from "@/context/OnboardingContext";

const ReplenishmentManagementTool: React.FC = () => {
  const { inventoryItems, updateInventoryItem, refreshInventory } = useInventory();
  const { replenishmentTasks, addReplenishmentTask, updateReplenishmentTask } = useReplenishment();
  const { allProfiles } = useProfile();
  const { inventoryFolders } = useOnboarding();
  const { profile } = useProfile();

  const canManageReplenishment = profile?.role === 'admin' || profile?.role === 'inventory_manager';

  const [selectedTaskStatus, setSelectedTaskStatus] = useState<ReplenishmentTask['status'] | "all">("Pending");
  const [selectedTask, setSelectedTask] = useState<ReplenishmentTask | null>(null);
  const [assignedTo, setAssignedTo] = useState<string | "unassigned">("unassigned");

  const itemsNeedingReplenishment = useMemo(() => {
    return inventoryItems.filter(item =>
      item.pickingBinQuantity <= item.pickingReorderLevel &&
      item.overstockQuantity > 0
    ).sort((a, b) => a.folderId.localeCompare(b.folderId));
  }, [inventoryItems]);

  const filteredTasks = useMemo(() => {
    return replenishmentTasks.filter(task =>
      selectedTaskStatus === "all" || task.status === selectedTaskStatus
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [replenishmentTasks, selectedTaskStatus]);

  useEffect(() => {
    if (selectedTask) {
      setAssignedTo(selectedTask.assignedTo || "unassigned");
    } else {
      setAssignedTo("unassigned");
    }
  }, [selectedTask]);

  const getFolderName = (folderId: string) => {
    const folder = inventoryFolders.find(f => f.id === folderId);
    return folder?.name || "Unknown Folder";
  };

  const handleCreateTask = async (item: InventoryItem) => {
    if (!canManageReplenishment) {
      showError("No permission to create tasks.");
      return;
    }
    if (item.overstockQuantity <= 0) {
      showError(`No overstock for ${item.name}.`);
      return;
    }

    const quantityToMove = Math.min(
      item.overstockQuantity,
      item.pickingReorderLevel + 10 - item.pickingBinQuantity
    );

    if (quantityToMove <= 0) {
      showError(`No quantity needed for ${item.name}.`);
      return;
    }

    await addReplenishmentTask({
      itemId: item.id,
      itemName: item.name,
      fromFolderId: item.folderId,
      toFolderId: item.folderId,
      quantity: quantityToMove,
    });
  };

  const handleAssignTask = async () => {
    if (!canManageReplenishment) {
      showError("No permission to assign tasks.");
      return;
    }
    if (!selectedTask || assignedTo === "unassigned") {
      showError("Select task and operator.");
      return;
    }

    const operator = allProfiles.find((p) => p.id === assignedTo);
    if (!operator) {
      showError("Assigned operator not found.");
      return;
    }

    const updatedTask: ReplenishmentTask = {
      ...selectedTask,
      status: "Assigned",
      assignedTo: operator.id,
    };
    await updateReplenishmentTask(updatedTask);
    setSelectedTask(null);
    showSuccess(`Task ${selectedTask.id} assigned to ${operator.fullName}.`);
  };

  const handleCompleteTask = async () => {
    if (!canManageReplenishment) {
      showError("No permission to complete tasks.");
      return;
    }
    if (!selectedTask) {
      showError("No task selected to complete.");
      return;
    }

    const item = inventoryItems.find(inv => inv.id === selectedTask.itemId);
    if (!item) {
      showError(`Item for task ${selectedTask.id} not found.`);
      return;
    }

    const updatedItem = {
      ...item,
      pickingBinQuantity: item.pickingBinQuantity + selectedTask.quantity,
      overstockQuantity: item.overstockQuantity - selectedTask.quantity,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    await updateInventoryItem(updatedItem);

    const updatedTask: ReplenishmentTask = {
      ...selectedTask,
      status: "Completed",
      completedAt: new Date().toISOString(),
    };
    await updateReplenishmentTask(updatedTask);

    await refreshInventory();
    setSelectedTask(null);
    showSuccess(`Task ${selectedTask.id} completed. Units moved.`);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-xl font-bold text-center">Replenishment Management</h2>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-destructive" /> Items Needing Replenishment
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <ScrollArea className="h-40 border border-border rounded-md p-3 bg-muted/20">
            {itemsNeedingReplenishment.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">No items currently need replenishment.</p>
            ) : (
              <div className="space-y-2">
                {itemsNeedingReplenishment.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-1 text-sm">
                    <span>{item.name} (SKU: {item.sku})</span>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400">Picking: {item.pickingBinQuantity}/{item.pickingReorderLevel}</span>
                      <Button variant="outline" size="sm" onClick={() => handleCreateTask(item)} disabled={!canManageReplenishment}>
                        Create Task
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> Replenishment Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="taskStatusFilter" className="font-semibold">Filter by Status</Label>
            <Select value={selectedTaskStatus} onValueChange={(value: ReplenishmentTask['status'] | "all") => setSelectedTaskStatus(value)} disabled={!canManageReplenishment}>
              <SelectTrigger id="taskStatusFilter">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Assigned">Assigned</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-60 border border-border rounded-md p-3 bg-muted/20">
            {filteredTasks.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">No tasks found for this status.</p>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map(task => {
                  let taskStatusVariant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "muted" = "info";
                  switch (task.status) {
                    case "Pending":
                      taskStatusVariant = "warning";
                      break;
                    case "Assigned":
                      taskStatusVariant = "secondary";
                      break;
                    case "Completed":
                      taskStatusVariant = "success";
                      break;
                    case "Cancelled":
                      taskStatusVariant = "destructive";
                      break;
                  }

                  return (
                    <div
                      key={task.id}
                      className={`flex flex-col p-2 rounded-md cursor-pointer ${selectedTask?.id === task.id ? "bg-primary/20" : "hover:bg-muted/30"}`}
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold">{task.itemName} ({task.quantity} units)</span>
                        <Badge variant={taskStatusVariant}>
                          {task.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        <ArrowRight className="h-3 w-3 inline-block mr-1" /> {getFolderName(task.fromFolderId)} to {getFolderName(task.toFolderId)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {formatDistanceToNowStrict(new Date(task.createdAt), { addSuffix: true })}
                        {task.assignedTo && ` | Assigned to: ${allProfiles.find((p) => p.id === task.assignedTo)?.fullName || 'Unknown'}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {selectedTask && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <h3 className="text-lg font-semibold">Task Details: {selectedTask.id}</h3>
              <p className="text-sm text-muted-foreground">Item: {selectedTask.itemName} ({selectedTask.quantity} units)</p>
              <p className="text-sm text-muted-foreground">Move from: {getFolderName(selectedTask.fromFolderId)} to {getFolderName(selectedTask.toFolderId)}</p>
              <p className="text-sm text-muted-foreground">Status: <Badge variant={
                selectedTask.status === "Pending" ? "warning" :
                selectedTask.status === "Assigned" ? "secondary" :
                selectedTask.status === "Completed" ? "success" : "destructive"
              }>{selectedTask.status}</Badge></p>

              {selectedTask.status === "Pending" && (
                <div className="space-y-2">
                  <Label htmlFor="assignTo">Assign To</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo} disabled={!canManageReplenishment}>
                    <SelectTrigger id="assignTo">
                      <SelectValue placeholder="Select operator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {allProfiles.filter((p) => p.role !== 'admin').map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAssignTask} className="w-full" disabled={assignedTo === "unassigned" || !canManageReplenishment}>
                    <User className="h-4 w-4 mr-2" /> Assign Task
                  </Button>
                </div>
              )}

              {selectedTask.status === "Assigned" && (
                <Button onClick={handleCompleteTask} className="w-full bg-green-600 hover:bg-green-700" disabled={!canManageReplenishment}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Mark as Completed
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReplenishmentManagementTool;