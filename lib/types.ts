export type Rol = "lector" | "admin_cliente" | "superadmin";

export interface Usuario {
  id: string;
  email: string;
  nombreCompleto: string;
  rol: Rol;
  clienteId?: string;
  activo: boolean;
}

export interface Empresa {
  nombreEmpresa: string;
  slugUrl: string;
  logoUrl: string | null;
  colorPrimario: string | null;
  colorSecundario: string | null;
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
  empresa: Empresa;
}

/** GET /api/auth/me — no devuelve token */
export interface MeResponse {
  usuario: Usuario;
  empresa: Empresa;
}

export interface Dashboard {
  id: string;
  nombre: string;
  powerbiReportId: string;
}

export interface DashboardCatalogo extends Dashboard {
  orden: number;
}

export interface EmbedToken {
  embedUrl: string;
  accessToken: string;
  expiry: string;
}

export interface UsuarioAdmin {
  id: string;
  email: string;
  nombreCompleto: string;
  rol: Rol;
  activo: boolean;
}

export interface CrearUsuarioBody {
  email: string;
  password: string;
  nombre_completo: string;
  rol: "lector" | "admin_cliente";
}

export interface ActualizarUsuarioBody {
  nombre_completo?: string;
  rol?: "lector" | "admin_cliente";
  activo?: boolean;
}

export interface AuditoriaEntry {
  id: string;
  accion: string;
  direccionIp: string;
  agenteUsuario: string;
  creadoEn: string;
  usuario: {
    id: string;
    email: string;
    nombreCompleto: string;
  };
}

export interface PowerBiWorkspace {
  id: string;
  nombre: string;
  origen?: "powerbi" | "cliente";
  accesibleApi?: boolean;
  clienteId?: string;
  slugUrl?: string;
}

export interface PowerBiWorkspacesResponse {
  workspaces: PowerBiWorkspace[];
  aviso: string | null;
}

/** Reporte en vivo desde Power BI (sin id en DB) */
export interface PowerBiReporte {
  nombre: string;
  powerbiReportId: string;
  powerbiWorkspaceId: string;
  orden: number;
}

export interface Cliente {
  id: string;
  nombreEmpresa: string;
  slugUrl: string;
  powerbiWorkspaceId?: string | null;
}

export interface DashboardCliente {
  id: string;
  nombre: string;
  powerbiWorkspaceId: string;
  powerbiReportId: string;
  orden: number;
}

export interface ClienteDashboardsResponse {
  cliente: Cliente;
  dashboards: DashboardCliente[];
}

export interface AsignarDashboardClienteResponse {
  message: string;
  clienteId: string;
  dashboard: {
    id: string;
    nombre: string;
    powerbiWorkspaceId: string;
    powerbiReportId: string;
  };
}

export interface ApiError {
  message?: string;
  error?: string;
}
