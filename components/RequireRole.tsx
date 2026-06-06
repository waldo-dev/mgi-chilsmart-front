"use client";

import { useAuth } from "@/context/AuthContext";
import { isAdmin, isOrgManager, isSuperadmin } from "@/lib/api";
import type { Rol } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

type RequireRoleProps = {
  children: ReactNode;
  /** Requiere rol admin_cliente o superadmin */
  admin?: boolean;
  /** Requiere rol superadmin */
  superadmin?: boolean;
  /** Requiere rol admin_partner o superadmin (gestión de organizaciones) */
  orgManager?: boolean;
  /** Roles explícitos */
  roles?: Rol[];
  redirectTo?: string;
};

function hasAccess(
  rol: Rol | undefined,
  {
    admin,
    superadmin,
    orgManager,
    roles,
  }: Omit<RequireRoleProps, "children" | "redirectTo">,
): boolean {
  if (!rol) return false;
  if (superadmin) return isSuperadmin(rol);
  if (orgManager) return isOrgManager(rol);
  if (admin) return isAdmin(rol);
  if (roles?.length) return roles.includes(rol);
  return true;
}

export function RequireRole({
  children,
  admin,
  superadmin,
  orgManager,
  roles,
  redirectTo = "/dashboards",
}: RequireRoleProps) {
  const { usuario, loading, sessionValidated } = useAuth();
  const router = useRouter();

  const allowed = hasAccess(usuario?.rol, {
    admin,
    superadmin,
    orgManager,
    roles,
  });

  useEffect(() => {
    if (!loading && sessionValidated && !allowed) {
      router.replace(redirectTo);
    }
  }, [loading, sessionValidated, allowed, router, redirectTo]);

  if (loading || !sessionValidated) {
    return (
      <div className="py-8 text-center text-zinc-500">Verificando permisos…</div>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
