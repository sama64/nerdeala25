import { apiGet, apiPost } from "@/lib/api-client";
import type { OnboardingState, Role } from "@/types";

export type OnboardingUpdatePayload = {
  role?: Role | null;
  whatsapp_opt_in?: boolean;
  phone_e164?: string | null;
  completed?: boolean;
};

export async function fetchOnboardingState() {
  return apiGet<OnboardingState>("/api/v1/onboarding/");
}

export async function updateOnboardingState(payload: OnboardingUpdatePayload) {
  return apiPost<OnboardingState>("/api/v1/onboarding/", payload);
}

// Onboarding state helpers
const ONBOARDING_STORAGE_KEY = "nerdeala_onboarding_completed";

/**
 * Check if user has completed onboarding
 * Logic: 
 * - First time users: Always show onboarding
 * - Returning users: Completed if they have phone number OR marked as completed in localStorage
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  
  try {
    // Check if marked as completed in localStorage (for immediate client-side routing)
    const completedUsers = JSON.parse(
      localStorage.getItem(ONBOARDING_STORAGE_KEY) || "[]"
    ) as string[];
    
    if (completedUsers.includes(userId)) {
      return true;
    }

    // Check server state - if user has phone number, they completed onboarding
    const onboardingState = await fetchOnboardingState();
    return onboardingState.completed || !!onboardingState.phone_e164;
  } catch {
    return false;
  }
}

/**
 * Synchronous version for immediate UI updates
 * Only checks localStorage - use for routing decisions after completing onboarding
 */
export function hasCompletedOnboardingSync(userId: string): boolean {
  if (typeof window === "undefined") return false;
  
  try {
    const completedUsers = JSON.parse(
      localStorage.getItem(ONBOARDING_STORAGE_KEY) || "[]"
    ) as string[];
    return completedUsers.includes(userId);
  } catch {
    return false;
  }
}

export function markOnboardingCompleted(userId: string): void {
  if (typeof window === "undefined") return;
  
  try {
    const completedUsers = JSON.parse(
      localStorage.getItem(ONBOARDING_STORAGE_KEY) || "[]"
    ) as string[];
    
    if (!completedUsers.includes(userId)) {
      completedUsers.push(userId);
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(completedUsers));
    }
  } catch (error) {
    console.warn("Failed to mark onboarding as completed:", error);
  }
}
