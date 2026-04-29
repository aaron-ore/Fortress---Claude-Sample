"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store } from "lucide-react";
import { showError } from "@/utils/toast"; // Import showError

interface ShopifyStoreUrlDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (storeUrl: string) => void;
  isLoading?: boolean;
}

const ShopifyStoreUrlDialog: React.FC<ShopifyStoreUrlDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [storeUrl, setStoreUrl] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStoreUrl(""); // Clear input when dialog opens
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const formattedUrl = storeUrl.trim();

    if (!formattedUrl) {
      showError("Shopify Store URL cannot be empty.");
      return;
    }

    // Validate that the URL starts with http:// or https://
    if (!/^https?:\/\//i.test(formattedUrl)) {
      showError("Please include 'https://' or 'http://' in your Shopify store URL.");
      return;
    }

    // Basic validation for .myshopify.com domain, now allowing for an optional trailing slash
    if (!/\.myshopify\.com\/?$/i.test(formattedUrl)) {
      showError("Please enter a valid Shopify store URL (e.g., https://your-store.myshopify.com).");
      return;
    }

    // Extract just the domain part (e.g., "your-store.myshopify.com")
    try {
        const urlObj = new URL(formattedUrl);
        // Remove trailing slash from hostname if present
        const domainOnly = urlObj.hostname.replace(/\/$/, '');
        onConfirm(domainOnly); // Pass only the domain
    } catch (e) {
        console.error("Error parsing URL in ShopifyStoreUrlDialog:", e);
        showError("Invalid URL format. Please ensure it's a complete and valid URL.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" /> Enter Shopify Store URL
          </DialogTitle>
          <DialogDescription>
            Please enter your **full** Shopify store URL, including `https://` (e.g., `https://your-store.myshopify.com`).
            This is required to connect Fortress to your Shopify account.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="shopifyStoreUrl">Shopify Store URL <span className="text-red-500">*</span></Label>
            <Input
              id="shopifyStoreUrl"
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              placeholder="e.g., https://your-store.myshopify.com"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!storeUrl.trim() || isLoading}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShopifyStoreUrlDialog;