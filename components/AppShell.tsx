"use client";

import { useAuth } from "@/context/AuthContext";
import { isAdmin, isSuperadmin } from "@/lib/api";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navLink =
  "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10";

export function AppShell({ children }: { children: ReactNode }) {
  const { usuario, empresa, logout } = useAuth();
  const pathname = usePathname();
  const primary = empresa?.colorPrimario ?? "#1e3a5f";
  const secondary = empresa?.colorSecundario ?? "#2563eb";

  const linkClass = (href: string) =>
    `${navLink} ${pathname.startsWith(href) ? "bg-white/15" : "text-white/80"}`;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header
        className="text-white shadow-md"
        style={{
          background: `linear-gradient(135deg, ${primary}, ${secondary})`,
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            {empresa?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={empresa.logoUrl}
                alt={empresa.nombreEmpresa}
                className="h-9 w-auto max-w-[120px] object-contain"
              />
            ) : null}
            <div>
              <p className="text-lg font-semibold leading-tight">
                {empresa?.nombreEmpresa ?? "Chilsmart"}
              </p>
              {usuario ? (
                <p className="text-xs text-white/70">
                  {usuario.nombreCompleto} · {usuario.rol}
                </p>
              ) : null}
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            <Link href="/dashboards" className={linkClass("/dashboards")}>
              Dashboards
            </Link>
            {usuario && isSuperadmin(usuario.rol) ? (
              <Link
                href="/admin/clientes"
                className={linkClass("/admin/clientes")}
              >
                Empresas
              </Link>
            ) : null}
            {usuario && isAdmin(usuario.rol) ? (
              <>
                <Link
                  href="/admin/usuarios"
                  className={linkClass("/admin/usuarios")}
                >
                  Usuarios
                </Link>
                <Link
                  href="/admin/accesos"
                  className={linkClass("/admin/accesos")}
                >
                  Accesos
                </Link>
                <Link
                  href="/admin/auditoria"
                  className={linkClass("/admin/auditoria")}
                >
                  Auditoría
                </Link>
              </>
            ) : null}
            <button
              type="button"
              onClick={logout}
              className={`${navLink} text-white/80`}
            >
              Salir
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
