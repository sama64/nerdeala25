"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { Spinner } from "@/components/ui/spinner";

interface ProtectedProps {
  children: React.ReactNode;
}

export function Protected({ children }: ProtectedProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const redirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
      router.replace(`/autenticacion${redirect}`);
    }
  }, [loading, pathname, router, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Spinner label="Validando sesión" />
      </div>
    );
  }

  return <>{children}</>;
}
