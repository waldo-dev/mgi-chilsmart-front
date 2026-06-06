"use client";

import { useAuth } from "@/context/AuthContext";
import { getSafeRedirectPath } from "@/lib/security";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { token, loading, sessionValidated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && sessionValidated && !token) {
      const safePath = getSafeRedirectPath(pathname, "/dashboards");
      router.replace(`/login?redirect=${encodeURIComponent(safePath)}`);
    }
  }, [loading, sessionValidated, token, router, pathname]);

  if (loading || !sessionValidated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        Verificando sesión…
      </div>
    );
  }

  if (!token) return null;

  return <>{children}</>;
}
