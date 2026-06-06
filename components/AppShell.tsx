"use client";

import { DualBrandLogos } from "@/components/DualBrandLogos";
import { useAuth } from "@/context/AuthContext";
import { isAdmin, isSuperadmin } from "@/lib/api";
import { resolveClientName, resolvePrimary, resolveSecondary } from "@/lib/branding";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const navLinkBase =
  "block rounded-lg px-3 py-2 text-sm font-medium transition-colors";

function formatRol(rol: string) {
  if (rol === "superadmin") return "Superadmin";
  if (rol === "admin_partner") return "Partner";
  if (rol === "admin_cliente") return "Administrador";
  if (rol === "lector") return "Lector";
  return rol;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { usuario, empresa, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const primary = resolvePrimary(empresa?.colorPrimario);
  const secondary = resolveSecondary(empresa?.colorSecundario);
  const clientName = resolveClientName(empresa?.nombreEmpresa);

  const navItems = [
    { href: "/dashboards", label: "Dashboards", show: true },
    {
      href: "/admin/clientes",
      label: "Organizaciones",
      show: Boolean(usuario && isSuperadmin(usuario.rol)),
    },
    {
      href: "/admin/usuarios",
      label: "Usuarios",
      show: Boolean(usuario && isAdmin(usuario.rol)),
    },
    {
      href: "/admin/accesos",
      label: "Accesos",
      show: Boolean(usuario && isAdmin(usuario.rol)),
    },
    {
      href: "/admin/auditoria",
      label: "Auditoría",
      show: Boolean(usuario && isAdmin(usuario.rol)),
    },
    { href: "/perfil", label: "Mi perfil", show: Boolean(usuario) },
  ].filter((item) => item.show);

  const linkClass = (href: string, mobile = false) => {
    const active = pathname.startsWith(href);
    if (mobile) {
      return `${navLinkBase} ${
        active
          ? "bg-white/15 text-white"
          : "text-white/85 hover:bg-white/10 hover:text-white"
      }`;
    }
    return `${navLinkBase} ${
      active
        ? "bg-white/20 text-white shadow-sm"
        : "text-white/85 hover:bg-white/10 hover:text-white"
    }`;
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
  }

  const userInitial =
    usuario?.nombreCompleto?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900">
      <header
        className="sticky top-0 z-40 text-white shadow-md"
        style={{
          background: `linear-gradient(135deg, ${primary}, ${secondary})`,
        }}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6">
          <Link
            href="/dashboards"
            className="flex min-w-0 flex-1 items-center gap-2 transition-opacity hover:opacity-90 sm:gap-3 lg:flex-initial"
          >
            <DualBrandLogos variant="header" />
            <div className="min-w-0 hidden sm:block">
              <p className="truncate text-sm font-semibold leading-tight sm:text-base">
                {clientName}
              </p>
              {usuario ? (
                <p className="hidden truncate text-xs text-white/70 sm:block">
                  {usuario.nombreCompleto}
                </p>
              ) : null}
            </div>
          </Link>

          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Navegación principal"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={linkClass(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            {usuario ? (
              <Link
                href="/perfil"
                className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1 transition-colors hover:bg-white/15"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">
                  {userInitial}
                </span>
                <div className="pr-1 text-right">
                  <p className="max-w-[140px] truncate text-xs font-medium leading-tight">
                    {usuario.nombreCompleto}
                  </p>
                  <p className="text-[11px] text-white/70">
                    {formatRol(usuario.rol)}
                  </p>
                </div>
              </Link>
            ) : null}
            <button
              type="button"
              onClick={handleLogout}
              className={`${navLinkBase} text-white/85 hover:bg-white/10 hover:text-white`}
            >
              Salir
            </button>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/90 transition-colors hover:bg-white/10 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </header>

      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside
        id="mobile-nav"
        className={`fixed inset-y-0 right-0 z-40 flex w-[min(100%,280px)] flex-col shadow-xl transition-transform duration-200 ease-out lg:hidden ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          background: `linear-gradient(180deg, ${primary}, ${secondary})`,
        }}
        aria-hidden={!menuOpen}
      >
        {usuario ? (
          <div className="flex items-center gap-3 border-b border-white/15 px-5 py-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
              {userInitial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {usuario.nombreCompleto}
              </p>
              <p className="text-xs text-white/70">{formatRol(usuario.rol)}</p>
            </div>
          </div>
        ) : null}

        <nav
          className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
          aria-label="Navegación móvil"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={linkClass(item.href, true)}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/15 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className={`${navLinkBase} w-full text-left text-white/85 hover:bg-white/10 hover:text-white`}
          >
            Salir
          </button>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 text-zinc-900 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
