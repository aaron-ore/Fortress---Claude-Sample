/**
 * Lifecycle statuses for serialized warehouse units (payment terminals, etc.).
 * These are PER-UNIT states — distinct from the quantity-derived In/Low/Out
 * "stock status" on inventory_items. Single source of truth for the value set,
 * labels, and badge styling so the enum, DB CHECK constraint, and UI agree.
 *
 * Keep in sync with the CHECK constraint in
 * supabase/migrations/create_inventory_units_table.sql.
 */

export type UnitStatus =
  | "available"
  | "allocated"
  | "shipped"
  | "deployed"
  | "demo"
  | "returned"
  | "defective";

/** Ordered for display (roughly the lifecycle order). */
export const UNIT_STATUSES: UnitStatus[] = [
  "available",
  "allocated",
  "shipped",
  "deployed",
  "demo",
  "returned",
  "defective",
];

export type BadgeVariant = "success" | "warning" | "destructive" | "info" | "muted";

interface UnitStatusMeta {
  label: string;
  /** Maps to the app's <Badge variant="..."> options. */
  variant: BadgeVariant;
  description: string;
}

export const UNIT_STATUS_META: Record<UnitStatus, UnitStatusMeta> = {
  available: { label: "Available", variant: "success", description: "In stock, not assigned." },
  allocated: { label: "Allocated", variant: "info", description: "Assigned to a merchant, not yet shipped." },
  shipped: { label: "Shipped", variant: "info", description: "In transit with tracking." },
  deployed: { label: "Deployed", variant: "success", description: "Active with the merchant." },
  demo: { label: "Demo", variant: "warning", description: "Given to a partner as a demo unit." },
  returned: { label: "Returned", variant: "muted", description: "Returned to the warehouse." },
  defective: { label: "Defective", variant: "destructive", description: "Faulty / removed from stock." },
};

export const DEFAULT_UNIT_STATUS: UnitStatus = "available";

export const unitStatusLabel = (status: string): string =>
  (UNIT_STATUS_META as Record<string, UnitStatusMeta>)[status]?.label ?? status;

export const unitStatusVariant = (status: string): BadgeVariant =>
  (UNIT_STATUS_META as Record<string, UnitStatusMeta>)[status]?.variant ?? "muted";
