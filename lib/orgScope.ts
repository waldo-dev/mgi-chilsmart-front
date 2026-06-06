import type { Cliente, Rol, TipoOrganizacion } from "./types";

export type RolCrearUsuario = "lector" | "admin_cliente" | "admin_partner";

export function filtrarEmpresas(list: Cliente[]): Cliente[] {
  return list.filter(
    (c) => c.tipo === "empresa" || (c.tipo !== "partner" && c.tipo !== "plataforma"),
  );
}

export function rolesPermitidosCrear(
  tipo?: TipoOrganizacion,
): RolCrearUsuario[] {
  if (tipo === "partner") return ["lector", "admin_partner"];
  return ["lector", "admin_cliente"];
}

export function necesitaSelectorOrgUsuarios(rol: Rol): boolean {
  return rol === "superadmin" || rol === "admin_partner";
}

/** Accesos y dashboards-disponibles requieren cliente_id para superadmin y partner */
export function necesitaSelectorOrgAccesos(rol: Rol): boolean {
  return rol === "superadmin" || rol === "admin_partner";
}

export function necesitaSelectorOrgAuditoria(rol: Rol): boolean {
  return rol === "superadmin" || rol === "admin_partner";
}

export function labelOrganizacion(c: Cliente): string {
  const tipo = c.tipo ? ` (${c.tipo})` : "";
  return `${c.nombreEmpresa}${tipo}`;
}

/** Organizaciones mostradas en Accesos según rol (el scope real lo valida el backend). */
export function organizacionesParaAccesos(list: Cliente[], rol: Rol): Cliente[] {
  if (rol === "superadmin") return list;
  if (rol === "admin_partner") return list;
  return list;
}

export function agruparOrganizaciones(list: Cliente[]) {
  const plataforma = list.filter((c) => c.tipo === "plataforma");
  const partners = list.filter((c) => c.tipo === "partner");
  const empresas = list.filter(
    (c) =>
      c.tipo === "empresa" ||
      (c.tipo !== "partner" &&
        c.tipo !== "plataforma" &&
        !partners.some((p) => p.id === c.id)),
  );
  const sinTipo = list.filter(
    (c) =>
      !c.tipo &&
      !plataforma.some((p) => p.id === c.id) &&
      !partners.some((p) => p.id === c.id) &&
      !empresas.some((e) => e.id === c.id),
  );
  return { plataforma, partners, empresas: [...empresas, ...sinTipo] };
}
