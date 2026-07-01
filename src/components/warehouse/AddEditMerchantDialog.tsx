import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle } from "lucide-react";
import { showError } from "@/utils/toast";
import { useMerchants, Merchant, PaymentStatus } from "@/context/MerchantsContext";
import { usePartners, Partner } from "@/context/PartnersContext";
import AddEditPartnerDialog from "@/components/warehouse/AddEditPartnerDialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  merchantToEdit?: Merchant | null;
  onCreated?: (merchant: Merchant) => void;
}

const NO_PARTNER = "none";

const AddEditMerchantDialog: React.FC<Props> = ({ isOpen, onClose, merchantToEdit, onCreated }) => {
  const { addMerchant, updateMerchant } = useMerchants();
  const { partners } = usePartners();
  const isEdit = !!merchantToEdit;

  const [name, setName] = useState("");
  const [partnerId, setPartnerId] = useState(NO_PARTNER);
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(merchantToEdit?.name || "");
      setPartnerId(merchantToEdit?.partnerId || NO_PARTNER);
      setContactName(merchantToEdit?.contactName || "");
      setEmail(merchantToEdit?.email || "");
      setPhone(merchantToEdit?.phone || "");
      setShippingAddress(merchantToEdit?.shippingAddress || "");
      setPaymentStatus(merchantToEdit?.paymentStatus || "pending");
      setNotes(merchantToEdit?.notes || "");
      setSaving(false);
    }
  }, [isOpen, merchantToEdit]);

  const handleSave = async () => {
    if (!name.trim()) {
      showError("Merchant name is required.");
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      partnerId: partnerId === NO_PARTNER ? undefined : partnerId,
      contactName: contactName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      shippingAddress: shippingAddress.trim() || undefined,
      paymentStatus,
      notes: notes.trim() || undefined,
    };
    if (isEdit && merchantToEdit) {
      await updateMerchant({ ...merchantToEdit, ...payload });
      setSaving(false);
      onClose();
    } else {
      const created = await addMerchant(payload);
      setSaving(false);
      if (created) {
        onCreated?.(created);
        onClose();
      }
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Merchant" : "Add Merchant"}</DialogTitle>
            <DialogDescription>End customers who receive terminals, linked to their partner.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="mName">Name <span className="text-red-500">*</span></Label>
              <Input id="mName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Joe's Diner" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Partner (ISO / ISV)</Label>
                <div className="flex gap-2">
                  <Select value={partnerId} onValueChange={setPartnerId}>
                    <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PARTNER}>No partner</SelectItem>
                      {partners.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.partnerType.toUpperCase()})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => setPartnerDialogOpen(true)} title="New partner">
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Payment status</Label>
                <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as PaymentStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mShip">Shipping address</Label>
              <Textarea id="mShip" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} rows={2} placeholder="Street, city, state, ZIP" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mContact">Contact</Label>
                <Input id="mContact" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mEmail">Email</Label>
                <Input id="mEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mPhone">Phone</Label>
                <Input id="mPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mNotes">Notes</Label>
              <Textarea id="mNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : isEdit ? "Save" : "Add Merchant"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddEditPartnerDialog
        isOpen={partnerDialogOpen}
        onClose={() => setPartnerDialogOpen(false)}
        onCreated={(p: Partner) => setPartnerId(p.id)}
      />
    </>
  );
};

export default AddEditMerchantDialog;
