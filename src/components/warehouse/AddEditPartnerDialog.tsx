import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showError } from "@/utils/toast";
import { usePartners, Partner, PartnerType } from "@/context/PartnersContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  partnerToEdit?: Partner | null;
  /** Called with the created partner when adding a new one (e.g. from the merchant dialog). */
  onCreated?: (partner: Partner) => void;
}

const AddEditPartnerDialog: React.FC<Props> = ({ isOpen, onClose, partnerToEdit, onCreated }) => {
  const { addPartner, updatePartner } = usePartners();
  const isEdit = !!partnerToEdit;

  const [name, setName] = useState("");
  const [partnerType, setPartnerType] = useState<PartnerType>("iso");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(partnerToEdit?.name || "");
      setPartnerType(partnerToEdit?.partnerType || "iso");
      setContactName(partnerToEdit?.contactName || "");
      setEmail(partnerToEdit?.email || "");
      setPhone(partnerToEdit?.phone || "");
      setNotes(partnerToEdit?.notes || "");
      setSaving(false);
    }
  }, [isOpen, partnerToEdit]);

  const handleSave = async () => {
    if (!name.trim()) {
      showError("Partner name is required.");
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      partnerType,
      contactName: contactName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    if (isEdit && partnerToEdit) {
      await updatePartner({ ...partnerToEdit, ...payload });
      setSaving(false);
      onClose();
    } else {
      const created = await addPartner(payload);
      setSaving(false);
      if (created) {
        onCreated?.(created);
        onClose();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Partner" : "Add Partner"}</DialogTitle>
          <DialogDescription>ISOs and ISVs you sell terminals through.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pName">Name <span className="text-red-500">*</span></Label>
              <Input id="pName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme ISO" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={partnerType} onValueChange={(v) => setPartnerType(v as PartnerType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="iso">ISO</SelectItem>
                  <SelectItem value="isv">ISV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pContact">Contact name</Label>
            <Input id="pContact" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pEmail">Email</Label>
              <Input id="pEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pPhone">Phone</Label>
              <Input id="pPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pNotes">Notes</Label>
            <Textarea id="pNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : isEdit ? "Save" : "Add Partner"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditPartnerDialog;
