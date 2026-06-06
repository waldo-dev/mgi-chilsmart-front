export type Rol = "lector" | "admin_cliente" | "admin_partner" | "superadmin";

export type TipoOrganizacion = "plataforma" | "partner" | "empresa";

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
  clienteId?: string;
  nombreEmpresa?: string;
}

export interface CrearUsuarioBody {
  email: string;
  password: string;
  nombre_completo: string;
  rol: "lector" | "admin_cliente" | "admin_partner";
  /** Obligatorio para superadmin y admin_partner; inferido del token para admin_cliente */
  cliente_id?: string;
}

export interface ActualizarUsuarioBody {
  nombre_completo?: string;
  rol?: "lector" | "admin_cliente";
  activo?: boolean;
}

export interface PaginatedUsuariosResponse {
  usuarios: UsuarioAdmin[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActualizarPerfilBody {
  nombre_completo: string;
}

export interface CambiarPasswordBody {
  password_actual: string;
  password_nuevo: string;
}

export interface MessageResponse {
  message: string;
}

export interface AuditoriaEntry {
  id: string;
  accion: string;
  direccionIp: string;
  agenteUsuario: string;
  creadoEn: string;
  clienteId?: string;
  nombreEmpresa?: string;
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
  tipo?: TipoOrganizacion;
  parentClienteId?: string | null;
  parentNombreEmpresa?: string | null;
  logoUrl?: string | null;
  colorPrimario?: string | null;
  colorSecundario?: string | null;
}

export interface CrearClienteBody {
  nombre_empresa: string;
  slug_url: string;
  tipo: "partner" | "empresa";
  parent_cliente_id?: string;
}

export interface ActualizarClienteBody {
  nombre_empresa?: string;
  slug_url?: string;
  logo_url?: string | null;
  color_primario?: string | null;
  color_secundario?: string | null;
}

export interface AsignarPartnerBody {
  parent_cliente_id: string;
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
