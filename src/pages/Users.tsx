import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Users as UsersIcon, Trash2, Copy, Settings as SettingsIcon, Loader2, ArrowRightLeft } from "lucide-react"; // Added ArrowRightLeft
import { useProfile, UserProfile } from "@/context/ProfileContext";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabaseClient";
import ManageCustomRolesDialog from "@/components/ManageCustomRolesDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import TransferAdminDialog from "@/components/TransferAdminDialog"; // NEW: Import TransferAdminDialog

const Users: React.FC = () => {
  const { profile, allProfiles, updateUserRole, fetchAllProfiles, isLoadingProfile } = useProfile();
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isManageCustomRolesDialogOpen, setIsManageCustomRolesDialogOpen] = useState(false);
  const [isTransferAdminDialogOpen, setIsTransferAdminDialogOpen] = useState(false); // NEW: State for TransferAdminDialog

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAllProfiles();
    }
  }, [profile?.role, fetchAllProfiles]);

  const handleDeleteUserClick = (user: UserProfile) => {
    if (profile?.role !== 'admin') {
      showError("You do not have permission to delete users.");
      return;
    }
    setUserToDelete(user);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete || !profile?.organizationId || profile?.role !== 'admin') {
      showError("Cannot delete user: Missing permissions or user data.");
      setIsConfirmDeleteDialogOpen(false);
      setUserToDelete(null);
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        showError("Authentication session expired. Please log in again.");
        return;
      }

      const payload = JSON.stringify({ targetUserId: userToDelete.id });
      console.log("[Users.tsx] Sending payload to delete-user Edge Function:", payload);

      const edgeFunctionUrl = `https://nojumocxivfjsbqnnkqe.supabase.co/functions/v1/delete-user`;
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: payload,
      });

      if (!response.ok) {
        let errorDetail = `Edge Function failed with status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.error || JSON.stringify(errorData);
        } catch (jsonError) {
          console.error("Failed to parse error response JSON from Edge Function:", jsonError);
          errorDetail = `Edge Function failed with status: ${response.status}. Response was not valid JSON. Raw response: ${await response.text()}`;
        }
        throw new Error(errorDetail);
      }

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      showSuccess(`User ${userToDelete.fullName || userToDelete.email} deleted.`);
      fetchAllProfiles();
    } catch (error: any) {
      console.error("Error deleting user via Edge Function:", error);
      showError(`Failed to delete user: ${error.message}`);
    } finally {
      setIsConfirmDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    if (profile?.role !== 'admin') {
      showError("You do not have permission to update roles.");
      return;
    }
    if (!profile?.organizationId) {
      showError("Organization ID not found for role update.");
      return;
    }

    // Prevent an admin from demoting themselves if they are the only admin
    if (userId === profile.id && newRole !== 'admin') {
      const otherAdminsCount = allProfiles.filter(u => u.role === 'admin' && u.id !== profile.id).length;
      if (otherAdminsCount === 0) {
        showError("You are the only administrator. Please transfer your role to another user before changing your own role.");
        return;
      }
    }

    try {
      await updateUserRole(userId, newRole, profile.organizationId);
    } catch (error: any) {
      // Error handling is already in updateUserRole in ProfileContext
    }
  };

  const handleCopyOrganizationCode = () => {
    if (profile?.companyProfile?.organizationCode) {
      navigator.clipboard.writeText(profile.companyProfile.organizationCode);
      showSuccess("Organization Code copied!");
    } else {
      showError("No Organization Code available.");
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border">
          <CardTitle className="text-2xl font-bold mb-4">Loading Users...</CardTitle>
          <CardContent>
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border">
          <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
          <CardContent>
            <p className="text-muted-foreground">You do not have administrative privileges to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col flex-grow">
      <h1 className="text-3xl font-bold">User Management</h1>
      <p className="text-muted-foreground">Manage user accounts and assign roles within Fortress.</p>

      <Card className="bg-card border-border rounded-lg shadow-sm p-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-primary" /> Your Organization Code
          </CardTitle>
          <CardDescription>
            Share this code with new users to allow them to join your organization during sign-up.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Input
            value={profile?.companyProfile?.organizationCode || "Not available"}
            readOnly
            className="font-mono text-lg flex-grow"
          />
          <Button onClick={handleCopyOrganizationCode} disabled={!profile?.companyProfile?.organizationCode}>
            <Copy className="h-4 w-4 mr-2" /> Copy
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={() => setIsManageCustomRolesDialogOpen(true)} disabled={!isAdmin}>
          <SettingsIcon className="h-4 w-4 mr-2" /> Manage Custom Roles
        </Button>
        <Button onClick={() => setIsTransferAdminDialogOpen(true)} disabled={!isAdmin || allProfiles.filter(u => u.role !== 'admin').length === 0}>
          <ArrowRightLeft className="h-4 w-4 mr-2" /> Transfer Admin Role
        </Button>
      </div>

      <Card className="bg-card border-border rounded-lg shadow-sm p-6 flex flex-col flex-grow">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">All Users ({allProfiles.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          {allProfiles.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No users found.</p>
          ) : (
            <ScrollArea className="flex-grow border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-center w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allProfiles.map((user: UserProfile) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.fullName || "N/A"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.id === profile?.id ? (
                          <span className="font-semibold">{user.role === 'admin' ? 'Admin (Full Access)' : user.role === 'inventory_manager' ? 'Manager (Inventory & Orders)' : 'Viewer (Warehouse/Sales Associate)'}</span>
                        ) : (
                          <Select
                            value={user.role}
                            onValueChange={(newRole) => handleUpdateUserRole(user.id, newRole)}
                            disabled={!isAdmin}
                          >
                            <SelectTrigger className="w-[250px]">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer (Warehouse/Sales Associate)</SelectItem>
                              <SelectItem value="inventory_manager">Manager (Inventory & Orders)</SelectItem>
                              <SelectItem value="admin">Admin (Full Access)</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-center">
                        {user.id !== profile?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUserClick(user)}
                            disabled={!isAdmin}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {userToDelete && (
        <ConfirmDialog
          isOpen={isConfirmDeleteDialogOpen}
          onClose={() => setIsConfirmDeleteDialogOpen(false)}
          onConfirm={confirmDeleteUser}
          title="Confirm User Deletion"
          description={`Are you sure you want to delete the user "${userToDelete.fullName || userToDelete.email}"? This will permanently delete the user and all their associated data.`}
          confirmText="Delete User"
          cancelText="Cancel"
        />
      )}

      <ManageCustomRolesDialog
        isOpen={isManageCustomRolesDialogOpen}
        onClose={() => setIsManageCustomRolesDialogOpen(false)}
      />

      <TransferAdminDialog
        isOpen={isTransferAdminDialogOpen}
        onClose={() => setIsTransferAdminDialogOpen(false)}
      />
    </div>
  );
};

export default Users;