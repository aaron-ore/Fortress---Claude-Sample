import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOnboarding } from "@/context/OnboardingContext";
import { showError, showSuccess } from "@/utils/toast";
import { uploadFileToSupabase } from "@/integrations/supabase/storage";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import { useProfile } from "@/context/ProfileContext";

export interface CompanyProfileStepProps {
  onNext: () => void;
  onBack?: () => void;
}

const CompanyProfileStep: React.FC<CompanyProfileStepProps> = ({ onNext, onBack }) => {
  const { setCompanyProfile } = useOnboarding();
  const { profile } = useProfile();

  const [companyName, setCompanyName] = useState(profile?.companyProfile?.companyName || "");
  const [currency, setCurrency] = useState(profile?.companyProfile?.companyCurrency || "USD");
  const [address, setAddress] = useState(profile?.companyProfile?.companyAddress || "");
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [companyLogoUrlPreview, setCompanyLogoUrlPreview] = useState<string | undefined>(profile?.companyProfile?.companyLogoUrl || undefined);
  const [isSaving, setIsSaving] = useState(false); // New state for overall saving process

  useEffect(() => {
    if (profile?.companyProfile) {
      setCompanyName(profile.companyProfile.companyName || "");
      setCurrency(profile.companyProfile.companyCurrency || "USD");
      setAddress(profile.companyProfile.companyAddress || "");
      setCompanyLogoUrlPreview(profile.companyProfile.companyLogoUrl || undefined);
    }
  }, [profile?.companyProfile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (file.type.startsWith("image/")) {
        setCompanyLogoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setCompanyLogoUrlPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        showError("Please select an image file (PNG, JPG, GIF, SVG).");
        setCompanyLogoFile(null);
        setCompanyLogoUrlPreview(profile?.companyProfile?.companyLogoUrl || undefined);
      }
    } else {
      setCompanyLogoFile(null);
      setCompanyLogoUrlPreview(profile?.companyProfile?.companyLogoUrl || undefined);
    }
  };

  const handleClearLogo = () => {
    setCompanyLogoFile(null);
    setCompanyLogoUrlPreview(undefined);
    showSuccess("Logo cleared. Save changes to apply.");
  };

  const handleSave = async () => {
    setIsSaving(true); // Start saving process

    if (!companyName.trim()) {
      showError("Company Name is required.");
      setIsSaving(false);
      return;
    }
    if (!currency.trim()) {
      showError("Default Currency is required.");
      setIsSaving(false);
      return;
    }
    if (!address.trim()) {
      showError("Company Address is required.");
      setIsSaving(false);
      return;
    }

    let finalCompanyLogoUrl: string | undefined = companyLogoUrlPreview;

    if (companyLogoFile) {
      // isUploadingLogo is not used here, but the logic for uploading is still valid
      try {
        finalCompanyLogoUrl = await uploadFileToSupabase(companyLogoFile, 'company-logos', 'logos/');
        showSuccess("Company logo uploaded successfully!");
      } catch (error: any) {
        console.error("Error uploading company logo:", error);
        showError(`Failed to upload company logo: ${error.message}`);
        setIsSaving(false);
        return;
      }
    } else if (companyLogoUrlPreview === undefined || companyLogoUrlPreview === "") {
      finalCompanyLogoUrl = undefined;
    }

    try {
      await setCompanyProfile({ name: companyName, currency, address, companyLogoUrl: finalCompanyLogoUrl });
      onNext(); // Call onNext only after successful profile update
    } catch (error: any) {
      showError(`Failed to set up/update organization: ${error.message}`);
    } finally {
      setIsSaving(false); // End saving process
    }
  };

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold text-foreground">Company Profile</h2>
      <p className="text-muted-foreground">Let's start by setting up your basic company information.</p>

      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name <span className="text-red-500">*</span></Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g., Acme Corp"
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Default Currency <span className="text-red-500">*</span></Label>
          <Select value={currency} onValueChange={setCurrency} disabled={isSaving}>
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($) - United States Dollar</SelectItem>
              <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
              <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
              <SelectItem value="CAD">CAD ($) - Canadian Dollar</SelectItem>
              <SelectItem value="AUD">AUD ($) - Australian Dollar</SelectItem>
              <SelectItem value="JPY">JPY (¥) - Japanese Yen</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Company Address <span className="text-red-500">*</span></Label>
          <Textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Business Rd, Suite 100, City, State, Zip"
            rows={3}
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="companyLogoFile">Company Logo (Optional)</Label>
          <Input
            id="companyLogoFile"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isSaving}
          />
          {companyLogoUrlPreview ? (
            <div className="mt-2 p-2 border border-border rounded-md flex items-center justify-between bg-muted/20">
              <img src={companyLogoUrlPreview} alt="Company Logo Preview" className="max-h-24 object-contain" />
              <Button variant="ghost" size="icon" onClick={handleClearLogo} aria-label="Clear logo" disabled={isSaving}>
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <div className="mt-2 p-4 border border-dashed border-muted-foreground/50 rounded-md flex items-center justify-center text-muted-foreground text-sm">
              <ImageIcon className="h-5 w-5 mr-2" /> No logo selected
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-between">
        {onBack && <Button variant="outline" onClick={onBack} disabled={isSaving}>Back</Button>}
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            "Next"
          )}
        </Button>
      </div>
    </div>
  );
};

export default CompanyProfileStep;