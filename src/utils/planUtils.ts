export type PlanLevel = 'free' | 'standard' | 'premium' | 'enterprise';

const planHierarchy: Record<PlanLevel, number> = {
  'free': 0,
  'standard': 1,
  'premium': 2,
  'enterprise': 3,
};

/**
 * Checks if the user's current plan meets or exceeds the required plan level for a feature.
 * @param userPlan The user's current plan (e.g., 'free', 'standard', 'premium').
 * @param requiredPlan The minimum plan level required for the feature.
 * @returns True if the user's plan meets or exceeds the required plan, false otherwise.
 */
export const hasRequiredPlan = (userPlan: string | undefined | null, requiredPlan: PlanLevel): boolean => {
  const currentPlanLevel = userPlan ? planHierarchy[userPlan.toLowerCase() as PlanLevel] : planHierarchy['free'];
  const requiredLevel = planHierarchy[requiredPlan];

  return currentPlanLevel >= requiredLevel;
};