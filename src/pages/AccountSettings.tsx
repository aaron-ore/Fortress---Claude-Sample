import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Lock, Globe, Palette } from "lucide-react";
import { showSuccess } from "@/utils/toast";
import { useProfile } from "@/context/ProfileContext";

const AccountSettings: React.FC = () => {
  const { profile } = useProfile();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState("en");

  useEffect(() => {
    setSelectedLanguage("en");
  }, []);

  const handleChangePassword = () => {
    if (newPassword !== confirmNewPassword) {
      showSuccess("Passwords do not match.");
      return;
    }
    showSuccess("Password changed!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const handleSaveGeneralSettings = () => {
    showSuccess("Settings saved!");
  };

  const handleToggleTwoFactorAuth = (checked: boolean) => {
    setTwoFactorAuth(checked);
    showSuccess(`2FA ${checked ? "enabled" : "disabled"}!`);
  };

  const hasGeneralSettingsChanges = selectedLanguage !== "en";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Account Settings</h1>
      <p className="text-muted-foreground">Manage your personal account preferences and security.</p>

      <Card className="bg-card border-border rounded-lg shadow-sm p-6">
        <CardHeader className="pb-4 flex flex-row items-center gap-4">
          <SettingsIcon className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl font-semibold">General Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="language" className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" /> Language
            </Label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger id="language">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="theme" className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" /> Theme
            </Label>
            <Input
              id="theme"
              value={profile?.companyProfile?.organizationTheme ? profile.companyProfile.organizationTheme.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : "Loading..."}
              disabled
              className="capitalize"
            />
            <p className="text-xs text-muted-foreground">
              Theme is set by your organization administrator.
            </p>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={handleSaveGeneralSettings} disabled={!hasGeneralSettingsChanges}>
              Save General Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border rounded-lg shadow-sm p-6">
        <CardHeader className="pb-4 flex flex-row items-center gap-4">
          <Lock className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl font-semibold">Password & Security</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
            <Input
              id="confirmNewPassword"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={handleChangePassword}>Change Password</Button>
          </div>

          <div className="md:col-span-2 border-t border-border pt-4 mt-4 flex items-center justify-between">
            <Label htmlFor="twoFactorAuth" className="flex items-center gap-2">
              Two-Factor Authentication
            </Label>
            <Switch
              id="twoFactorAuth"
              checked={twoFactorAuth}
              onCheckedChange={handleToggleTwoFactorAuth}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSettings;