import type { Role, User } from "@/types";

const roleRoutes: Record<Role, string> = {
  admin: "/panel/admin",
  coordinator: "/panel/cohortes",
  teacher: "/panel/cursos",
  student: "/panel/mis-cursos"
};

export function resolveDashboardRoute(role: Role | null | undefined) {
  if (!role) return "/panel/cursos";
  return roleRoutes[role] ?? "/panel/cursos";
}

export function shouldCompleteOnboarding(user: Pick<User, "role"> | null | undefined) {
  return !user?.role;
}

export function resolvePostAuthDestination(user: User | null, options?: { onboardingCompleted?: boolean }) {
  if (!user) return "/autenticacion";
  if (!options?.onboardingCompleted || shouldCompleteOnboarding(user)) return "/onboarding";
  return resolveDashboardRoute(user.role);
}
