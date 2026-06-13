import { Warehouse, UtensilsCrossed, Store } from "lucide-react";

/**
 * Business modes ("industry profiles"). One inventory engine, three tailored
 * experiences. The selected mode is stored on the organization's `industry`
 * field (see ProfileContext / CompanyProfile) — this module is the single
 * source of truth for what each mode shows.
 */
export type BusinessMode = "warehouse" | "restaurant" | "retail";

export const BUSINESS_MODES: BusinessMode[] = ["warehouse", "restaurant", "retail"];

/** Foundation of the app; also the safe default for orgs with no industry set. */
export const DEFAULT_BUSINESS_MODE: BusinessMode = "warehouse";

/** Normalize the raw `industry` value from the org profile into a known mode. */
export function normalizeBusinessMode(industry?: string | null): BusinessMode {
  switch (industry) {
    case "warehouse":
    case "restaurant":
    case "retail":
      return industry;
    default:
      return DEFAULT_BUSINESS_MODE;
  }
}

/**
 * Capability flags. Pages, nav items, and form fields opt in to a feature; the
 * mode decides whether that feature is on. Keeps mode policy in one table
 * instead of scattered `industry === 'x'` checks.
 */
export type ModeFeature =
  | "foodVariance"   // Food-cost variance pages + POS sales import (restaurant)
  | "recipes"        // Recipes / bill of materials (restaurant)
  | "usageUnits"     // Per-item usage unit, used by recipes & variance (restaurant)
  | "warehouseOps"   // Warehouse Operations tools: picking, putaway, shipping (warehouse)
  | "pickingBins"    // Split picking-bin / overstock quantities on items (warehouse)
  | "margin"         // Margin / markup analytics (retail)
  | "serialTracking"; // Serial / lot tracking (retail/hardware) — Phase 2 data model

const FEATURES_BY_MODE: Record<BusinessMode, ModeFeature[]> = {
  warehouse: ["warehouseOps", "pickingBins"],
  restaurant: ["foodVariance", "recipes", "usageUnits"],
  retail: ["margin", "serialTracking"],
};

export function modeHasFeature(mode: BusinessMode, feature: ModeFeature): boolean {
  return FEATURES_BY_MODE[mode].includes(feature);
}

export interface BusinessModeMeta {
  value: BusinessMode;
  label: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
}

export const BUSINESS_MODE_META: Record<BusinessMode, BusinessModeMeta> = {
  warehouse: {
    value: "warehouse",
    label: "Warehouse / Distribution",
    tagline: "Picking, putaway, shipping & fulfillment",
    description:
      "Bin-level stock with picking and overstock quantities, warehouse operations tools, and a fulfillment-focused dashboard.",
    icon: Warehouse,
  },
  restaurant: {
    value: "restaurant",
    label: "Restaurant / Food Service",
    tagline: "Recipes & food-cost variance",
    description:
      "Recipes (bill of materials), usage units, POS sales import, and theoretical-vs-actual food-cost variance.",
    icon: UtensilsCrossed,
  },
  retail: {
    value: "retail",
    label: "Retail / Hardware",
    tagline: "SKUs, margins & stock valuation",
    description:
      "Clean SKU- and barcode-first product inventory with margin and stock-valuation reporting — none of the food or heavy-warehouse machinery.",
    icon: Store,
  },
};

/** Dashboard heading per mode. */
export const BUSINESS_MODE_DASHBOARD_TITLE: Record<BusinessMode, string> = {
  warehouse: "Warehouse Dashboard",
  restaurant: "Restaurant Dashboard",
  retail: "Retail Dashboard",
};
