import type {
  ActualizarUsuarioBody,
  AsignarDashboardClienteResponse,
  AuditoriaEntry,
  AuthResponse,
  MeResponse,
  Cliente,
  ClienteDashboardsResponse,
  CrearUsuarioBody,
  Dashboard,
  DashboardCatalogo,
  EmbedToken,
  PowerBiReporte,
  PowerBiWorkspacesResponse,
  UsuarioAdmin,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const API_PREFIX = "/api";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${API_PREFIX}${path}`, {
    ...rest,
    headers,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? body.error ?? message;
    } catch {
      /* ignore */
    }
    throw new ApiClientError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: (token: string) => request<MeResponse>("/auth/me", { token }),
};

export const dashboardsApi = {
  list: (token: string) =>
    request<Dashboard[]>("/dashboards", { token }),

  embedToken: (token: string, id: string) =>
    request<EmbedToken>(`/dashboards/${id}/embed-token`, { token }),
};

export const adminUsuariosApi = {
  list: (token: string) =>
    request<UsuarioAdmin[]>("/admin/usuarios", { token }),

  create: (token: string, body: CrearUsuarioBody) =>
    request<UsuarioAdmin>("/admin/usuarios", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    }),

  update: (token: string, id: string, body: ActualizarUsuarioBody) =>
    request<UsuarioAdmin>(`/admin/usuarios/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(body),
    }),
};

export const adminAccesosApi = {
  dashboardsDisponibles: (token: string) =>
    request<DashboardCatalogo[]>("/admin/accesos/dashboards-disponibles", {
      token,
    }),

  porUsuario: (token: string, usuarioId: string) =>
    request<string[]>(`/admin/accesos/usuario/${usuarioId}`, { token }),

  asignar: (token: string, usuario_id: string, dashboard_id: string) =>
    request<{ message: string; usuarioId: string; dashboardId: string }>(
      "/admin/accesos/asignar",
      {
        method: "POST",
        token,
        body: JSON.stringify({ usuario_id, dashboard_id }),
      },
    ),

  remover: (token: string, usuario_id: string, dashboard_id: string) =>
    request<void>("/admin/accesos/remover", {
      method: "DELETE",
      token,
      body: JSON.stringify({ usuario_id, dashboard_id }),
    }),
};

export const adminPowerBiApi = {
  workspaces: (token: string) =>
    request<PowerBiWorkspacesResponse>("/admin/powerbi/workspaces", { token }),

  reportes: (token: string, workspaceId: string) =>
    request<PowerBiReporte[]>(
      `/admin/powerbi/workspaces/${workspaceId}/reportes`,
      { token },
    ),

  sync: (token: string, workspaceIds: string[]) =>
    request<unknown>("/admin/powerbi/sync", {
      method: "POST",
      token,
      body: JSON.stringify({ workspace_ids: workspaceIds }),
    }),
};

export const adminClientesApi = {
  list: (token: string) => request<Cliente[]>("/admin/clientes", { token }),

  dashboards: (token: string, clienteId: string) =>
    request<ClienteDashboardsResponse>(
      `/admin/clientes/${clienteId}/dashboards`,
      { token },
    ),

  asignarDashboard: (
    token: string,
    clienteId: string,
    body:
      | { dashboard_id: string }
      | {
          powerbi_workspace_id: string;
          powerbi_report_id: string;
          nombre: string;
        },
  ) =>
    request<AsignarDashboardClienteResponse>(
      `/admin/clientes/${clienteId}/dashboards/asignar`,
      {
        method: "POST",
        token,
        body: JSON.stringify(body),
      },
    ),

  removerDashboard: (
    token: string,
    clienteId: string,
    dashboard_id: string,
  ) =>
    request<{ message: string; clienteId: string; dashboardId: string }>(
      `/admin/clientes/${clienteId}/dashboards/remover`,
      {
        method: "DELETE",
        token,
        body: JSON.stringify({ dashboard_id }),
      },
    ),
};

export const auditoriaApi = {
  log: (token: string, accion: string) =>
    request<void>("/admin/auditoria/log", {
      method: "POST",
      token,
      body: JSON.stringify({ accion }),
    }),

  list: (token: string, limit = 100) =>
    request<AuditoriaEntry[]>(`/admin/auditoria?limit=${limit}`, { token }),
};

export function isAdmin(rol: string) {
  return rol === "admin_cliente" || rol === "superadmin";
}

export function isSuperadmin(rol: string) {
  return rol === "superadmin";
}
