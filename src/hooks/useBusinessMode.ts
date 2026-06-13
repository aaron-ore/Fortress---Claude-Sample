import { useProfile } from "@/context/ProfileContext";
import {
  BusinessMode,
  ModeFeature,
  modeHasFeature,
  normalizeBusinessMode,
} from "@/lib/businessModes";

/**
 * Single source of truth for the current org's business mode. Reads the
 * org-level `industry` field so every employee in an org sees the same mode.
 */
export function useBusinessMode() {
  const { profile } = useProfile();
  const mode: BusinessMode = normalizeBusinessMode(profile?.companyProfile?.industry);

  return {
    mode,
    isWarehouse: mode === "warehouse",
    isRestaurant: mode === "restaurant",
    isRetail: mode === "retail",
    hasFeature: (feature: ModeFeature) => modeHasFeature(mode, feature),
  };
}
