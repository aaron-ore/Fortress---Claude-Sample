import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, MapPin } from "lucide-react";
import { showError } from "@/utils/toast";
import { useProfile } from "@/context/ProfileContext";
import { formatPhoneNumber } from "@/utils/formatters";

const MyProfile: React.FC = () => {
  const { profile, updateProfile } = useProfile();

  const [fullName, setFullName] = useState(profile?.fullName || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [phone, setPhone] = useState(profile?.phone ? formatPhoneNumber(profile.phone) : "");
  const [address, setAddress] = useState(profile?.address || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || "");

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setEmail(profile.email || "");
      setPhone(profile.phone ? formatPhoneNumber(profile.phone) : "");
      setAddress(profile.address || "");
      setAvatarUrl(profile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.fullName || 'User'}`);
    }
  }, [profile]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const handleSaveProfile = async () => {
    if (!profile) {
      showError("User profile not loaded.");
      return;
    }
    if (!fullName.trim()) {
      showError("Full Name cannot be empty.");
      return;
    }

    const updatedProfileData = {
      fullName: fullName.trim(),
      phone: phone.replace(/[^\d]/g, ''),
      address: address.trim(),
    };

    try {
      await updateProfile(updatedProfileData);
    } catch (error: any) {
      // Error handling is already in updateProfile context function
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Profile</h1>
      <p className="text-muted-foreground">View and update your personal profile information.</p>

      <Card className="bg-card border-border rounded-lg shadow-sm p-6">
        <CardHeader className="pb-4 flex flex-row items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarUrl} alt={fullName} />
            <AvatarFallback>{fullName.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl font-semibold">{fullName}</CardTitle>
            <p className="text-muted-foreground">{email}</p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" /> Full Name
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" /> Email
            </Label>
            <Input id="email" type="email" value={email} disabled />
            <p className="text-xs text-muted-foreground">
              Your email is tied to your authentication and cannot be changed directly here.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" /> Phone Number
            </Label>
            <Input
              id="phone"
              type="text"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="e.g., 555-123-4567"
              maxLength={12}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" /> Address
            </Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={handleSaveProfile}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyProfile;