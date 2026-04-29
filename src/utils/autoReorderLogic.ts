import { InventoryItem } from "@/context/InventoryContext";
import { OrderItem, POItem } from "@/context/OrdersContext";
import { Vendor } from "@/context/VendorContext";
import { showSuccess, showError } from "@/utils/toast";
import { generateSequentialNumber } from "@/utils/numberGenerator";
import { AppNotification } from "@/context/NotificationContext";
import { supabase } from "@/lib/supabaseClient";
import { UserProfile } from "@/context/ProfileContext";

// Simple debounce to prevent multiple orders for the same item in a short period
const lastReorderAttempt: { [itemId: string]: number } = {};
const REORDER_DEBOUNCE_MS = 24 * 60 * 60 * 1000; // 24 hours

export const processAutoReorder = async (
  inventoryItems: InventoryItem[],
  addOrder: (order: Omit<OrderItem, "id" | "organizationId">) => Promise<void>,
  vendors: Vendor[],
  profile: UserProfile | null,
  addNotification: (message: string, type?: AppNotification['type']) => void
) => {
  if (!profile?.organizationId || !profile?.companyProfile?.enableAutoReorder) {
    console.warn("[Auto-Reorder] Cannot process auto-reorder: Auto-reorder is not globally enabled or organization ID is missing.");
    return;
  }

  const itemsToReorder = inventoryItems.filter(item =>
    item.autoReorderEnabled &&
    item.quantity <= item.reorderLevel &&
    item.autoReorderQuantity > 0 &&
    item.vendorId // Must have a vendor to auto-reorder
  );

  if (itemsToReorder.length === 0) {
    return;
  }

  console.log(`[Auto-Reorder] Processing ${itemsToReorder.length} item(s) for auto-reorder.`);

  for (const item of itemsToReorder) {
    const now = Date.now();
    if (lastReorderAttempt[item.id] && (now - lastReorderAttempt[item.id] < REORDER_DEBOUNCE_MS)) {
      console.log(`[Auto-Reorder] Skipping ${item.name}: already attempted recently.`);
      continue;
    }

    const vendor = vendors.find(v => v.id === item.vendorId);
    if (!vendor) {
      addNotification(`Auto-reorder failed for ${item.name}.`, "error");
      showError(`Auto-reorder failed for ${item.name}.`);
      continue;
    }

    const poItems: POItem[] = [{
      id: Date.now(), // Unique ID within the order
      itemName: item.name,
      quantity: item.autoReorderQuantity,
      unitPrice: item.unitCost,
      inventoryItemId: item.id,
    }];

    const newPoNumber = generateSequentialNumber("PO");
    const totalAmount = poItems.reduce((sum, poItem) => sum + poItem.quantity * poItem.unitPrice, 0);

    const newPurchaseOrder: Omit<OrderItem, "id" | "organizationId"> = {
      type: "Purchase",
      customerSupplier: vendor.name,
      date: new Date().toISOString().split("T")[0],
      status: "New Order",
      totalAmount: totalAmount,
      dueDate: new Date().toISOString().split("T")[0],
      itemCount: poItems.length,
      notes: `Auto-generated reorder for low stock of ${item.name}.`,
      orderType: "Wholesale",
      shippingMethod: "Standard",
      items: poItems,
      terms: "Net 30", // Default terms
    };

    try {
      await addOrder(newPurchaseOrder);
      lastReorderAttempt[item.id] = now; // Mark as attempted
      addNotification(`Auto-reorder placed for ${item.name}.`, "success");
      showSuccess(`Auto-reorder placed for ${item.name}.`);
      
      if (profile?.companyProfile?.enableAutoReorderNotifications && vendor.email) {
        const emailSubject = `New Purchase Order: ${newPoNumber} for ${item.name}`;
        const emailHtmlContent = `
          <p>Dear ${vendor.contactPerson || vendor.name},</p>
          <p>This is an automated purchase order from Fortress Inventory for the following item:</p>
          <ul>
            <li><strong>Item:</strong> ${item.name} (SKU: ${item.sku})</li>
            <li><strong>Quantity:</strong> ${item.autoReorderQuantity} units</li>
            <li><strong>Unit Cost:</strong> $${item.unitCost.toFixed(2)}</li>
          </ul>
          <p>Total amount: $${totalAmount.toFixed(2)}</p>
          <p>Please process this order (PO: ${newPoNumber}) by ${newPurchaseOrder.dueDate}.</p>
          <p>Thank you,<br>Fortress Inventory</p>
        `;

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          console.error("Failed to get session for sending email:", sessionError);
          addNotification(`Failed to send reorder email.`, "error");
        } else {
          const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-email', {
            body: JSON.stringify({
              to: vendor.email,
              subject: emailSubject,
              htmlContent: emailHtmlContent,
            }),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionData.session.access_token}`,
            },
          });

          if (emailError) {
            console.error('Error invoking send-email Edge Function:', emailError);
            addNotification(`Failed to send reorder email.`, "error");
          } else if (emailResponse.error) {
            console.error('send-email Edge Function returned error:', emailResponse.error);
            addNotification(`Failed to send reorder email.`, "error");
          } else {
            console.log('Reorder email sent successfully via Brevo:', emailResponse);
            addNotification(`Reorder email sent to ${vendor.email}.`, "info");
          }
        }
      } else if (profile?.companyProfile?.enableAutoReorderNotifications && !vendor.email) {
        addNotification(`No email for vendor ${vendor.name}.`, "warning");
      }
    } catch (error: any) {
      addNotification(`Failed to auto-reorder ${item.name}.`, "error");
      showError(`Failed to auto-reorder ${item.name}.`);
    }
  }
};