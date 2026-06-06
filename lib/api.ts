import type {
  ActualizarPerfilBody,
  ActualizarUsuarioBody,
  AsignarDashboardClienteResponse,
  ActualizarClienteBody,
  AuditoriaEntry,
  AuthResponse,
  CambiarPasswordBody,
  MeResponse,
  Cliente,
  ClienteDashboardsResponse,
  CrearClienteBody,
  CrearUsuarioBody,
  Dashboard,
  DashboardCatalogo,
  EmbedToken,
  MessageResponse,
  PaginatedUsuariosResponse,
  PowerBiReporte,
  PowerBiWorkspacesResponse,
  UsuarioAdmin,
} from "./types";
import type { Rol } from "./types";
import { assertSecureApiBaseInProduction, sanitizeApiErrorMessage } from "./security";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
const API_PREFIX = "/api";
const REQUEST_TIMEOUT_MS = 30_000;

assertSecureApiBaseInProduction(API_BASE);

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${API_PREFIX}${path}`, {
      ...rest,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiClientError("La solicitud tardó demasiado", 408);
    }
    throw new ApiClientError("No se pudo conectar con el servidor", 0);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? body.error ?? message;
    } catch {
      /* ignore */
    }
    throw new ApiClientError(
      sanitizeApiErrorMessage(res.status, message),
      res.status,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function normalizeUsuario(raw: unknown): UsuarioAdmin | null {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  if (u.id == null || u.email == null) return null;
  const nombre =
    u.nombreCompleto ?? u.nombre_completo ?? u.nombre ?? "";
  const clienteRaw = u.clienteId ?? u.cliente_id;
  const empresaRaw = u.nombreEmpresa ?? u.nombre_empresa;
  return {
    id: String(u.id),
    email: String(u.email),
    nombreCompleto: String(nombre),
    rol: String(u.rol ?? "lector") as Rol,
    activo: u.activo !== false && u.active !== false,
    clienteId: clienteRaw != null ? String(clienteRaw) : undefined,
    nombreEmpresa: empresaRaw != null ? String(empresaRaw) : undefined,
  };
}

function normalizeCliente(raw: unknown): Cliente | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (c.id == null) return null;
  const parentRaw = c.parentClienteId ?? c.parent_cliente_id;
  const parentNombre =
    c.parentNombreEmpresa ?? c.parent_nombre_empresa;
  return {
    id: String(c.id),
    nombreEmpresa: String(c.nombreEmpresa ?? c.nombre_empresa ?? ""),
    slugUrl: String(c.slugUrl ?? c.slug_url ?? ""),
    powerbiWorkspaceId:
      (c.powerbiWorkspaceId ?? c.powerbi_workspace_id) != null
        ? String(c.powerbiWorkspaceId ?? c.powerbi_workspace_id)
        : null,
    tipo: (c.tipo as Cliente["tipo"]) ?? undefined,
    parentClienteId: parentRaw != null ? String(parentRaw) : null,
    parentNombreEmpresa: parentNombre != null ? String(parentNombre) : null,
    logoUrl:
      (c.logoUrl ?? c.logo_url) != null
        ? String(c.logoUrl ?? c.logo_url)
        : null,
    colorPrimario:
      (c.colorPrimario ?? c.color_primario) != null
        ? String(c.colorPrimario ?? c.color_primario)
        : null,
    colorSecundario:
      (c.colorSecundario ?? c.color_secundario) != null
        ? String(c.colorSecundario ?? c.color_secundario)
        : null,
  };
}

function normalizeClientesList(data: unknown): Cliente[] {
  if (!Array.isArray(data)) return [];
  return data
    .map(normalizeCliente)
    .filter((c): c is Cliente => c != null);
}

function normalizeAuditoriaEntry(raw: unknown): AuditoriaEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const u = e.usuario;
  if (e.id == null || !u || typeof u !== "object") return null;
  const usr = u as Record<string, unknown>;
  const clienteRaw = e.clienteId ?? e.cliente_id;
  const empresaRaw = e.nombreEmpresa ?? e.nombre_empresa;
  return {
    id: String(e.id),
    accion: String(e.accion ?? ""),
    direccionIp: String(e.direccionIp ?? e.direccion_ip ?? ""),
    agenteUsuario: String(e.agenteUsuario ?? e.agente_usuario ?? ""),
    creadoEn: String(e.creadoEn ?? e.creado_en ?? ""),
    clienteId: clienteRaw != null ? String(clienteRaw) : undefined,
    nombreEmpresa: empresaRaw != null ? String(empresaRaw) : undefined,
    usuario: {
      id: String(usr.id),
      email: String(usr.email ?? ""),
      nombreCompleto: String(
        usr.nombreCompleto ?? usr.nombre_completo ?? "",
      ),
    },
  };
}

function normalizeUsuariosList(
  data: unknown,
  fallbackPage: number,
  fallbackLimit: number,
): PaginatedUsuariosResponse {
  if (Array.isArray(data)) {
    const usuarios = data
      .map(normalizeUsuario)
      .filter((u): u is UsuarioAdmin => u != null);
    const total = usuarios.length;
    return {
      usuarios,
      total,
      page: fallbackPage,
      limit: fallbackLimit,
      totalPages: Math.max(1, Math.ceil(total / fallbackLimit)),
    };
  }

  if (!data || typeof data !== "object") {
    return {
      usuarios: [],
      total: 0,
      page: fallbackPage,
      limit: fallbackLimit,
      totalPages: 1,
    };
  }

  const obj = data as Record<string, unknown>;
  const rawList = obj.usuarios ?? obj.data ?? obj.items;
  const usuarios = Array.isArray(rawList)
    ? rawList
        .map(normalizeUsuario)
        .filter((u): u is UsuarioAdmin => u != null)
    : [];
  const total = Number(obj.total ?? obj.totalCount ?? usuarios.length) || 0;
  const page = Number(obj.page ?? obj.currentPage ?? fallbackPage) || fallbackPage;
  const limit =
    Number(obj.limit ?? obj.perPage ?? obj.per_page ?? fallbackLimit) ||
    fallbackLimit;
  const totalPages =
    Number(obj.totalPages ?? obj.total_pages) ||
    Math.max(1, Math.ceil(total / limit));

  return { usuarios, total, page, limit, totalPages };
}

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: (token: string) => request<MeResponse>("/auth/me", { token }),

  updateProfile: (token: string, body: ActualizarPerfilBody) =>
    request<MeResponse>("/auth/me", {
      method: "PUT",
      token,
      body: JSON.stringify(body),
    }),

  changePassword: (token: string, body: CambiarPasswordBody) =>
    request<MessageResponse>("/auth/password", {
      method: "PUT",
      token,
      body: JSON.stringify(body),
    }),

  logout: (token: string) =>
    request<MessageResponse>("/auth/logout", {
      method: "POST",
      token,
    }),
};

export const dashboardsApi = {
  list: (token: string) =>
    request<Dashboard[]>("/dashboards", { token }),

  embedToken: (token: string, id: string) =>
    request<EmbedToken>(`/dashboards/${id}/embed-token`, { token }),
};

export const adminUsuariosApi = {
  list: async (
    token: string,
    params: { page?: number; limit?: number; cliente_id?: string } = {},
  ) => {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const search = new URLSearchParams();
    search.set("page", String(page));
    search.set("limit", String(limit));
    if (params.cliente_id) search.set("cliente_id", params.cliente_id);
    const raw = await request<unknown>(`/admin/usuarios?${search.toString()}`, {
      token,
    });
    return normalizeUsuariosList(raw, page, limit);
  },

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

  remove: (token: string, id: string) =>
    request<MessageResponse>(`/admin/usuarios/${id}`, {
      method: "DELETE",
      token,
    }),

  resetPassword: (token: string, id: string, password: string) =>
    request<MessageResponse>(`/admin/usuarios/${id}/password`, {
      method: "PUT",
      token,
      body: JSON.stringify({ password }),
    }),
};

export const adminAccesosApi = {
  dashboardsDisponibles: async (token: string, cliente_id?: string) => {
    const qs = cliente_id
      ? `?cliente_id=${encodeURIComponent(cliente_id)}`
      : "";
    const raw = await request<unknown>(
      `/admin/accesos/dashboards-disponibles${qs}`,
      { token },
    );
    return normalizeCatalogoList(raw);
  },

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

function normalizeCatalogoList(data: unknown): DashboardCatalogo[] {
  if (Array.isArray(data)) return data as DashboardCatalogo[];
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  const raw =
    obj.catalogo ??
    obj.dashboards ??
    obj.items ??
    obj.data;
  return Array.isArray(raw) ? (raw as DashboardCatalogo[]) : [];
}

export const adminClientesApi = {
  list: async (token: string) => {
    const raw = await request<unknown>("/admin/clientes", { token });
    return normalizeClientesList(raw);
  },

  get: async (token: string, id: string) => {
    const raw = await request<unknown>(`/admin/clientes/${id}`, { token });
    const c = normalizeCliente(raw);
    if (!c) throw new ApiClientError("Organización no encontrada", 404);
    return c;
  },

  create: async (token: string, body: CrearClienteBody) => {
    const raw = await request<unknown>("/admin/clientes", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
    const c = normalizeCliente(raw);
    if (!c) throw new ApiClientError("Respuesta inválida al crear org", 500);
    return c;
  },

  update: async (token: string, id: string, body: ActualizarClienteBody) => {
    const raw = await request<unknown>(`/admin/clientes/${id}`, {
      method: "PUT",
      token,
      body: JSON.stringify(body),
    });
    const c = normalizeCliente(raw);
    if (!c) throw new ApiClientError("Respuesta inválida al actualizar org", 500);
    return c;
  },

  partners: async (token: string) => {
    const raw = await request<unknown>("/admin/clientes/partners", { token });
    return normalizeClientesList(raw);
  },

  miCatalogo: async (token: string) => {
    const raw = await request<unknown>("/admin/clientes/mi-catalogo", {
      token,
    });
    return normalizeCatalogoList(raw);
  },

  asignarPartner: (
    token: string,
    empresaId: string,
    parent_cliente_id: string,
  ) =>
    request<MessageResponse>(`/admin/clientes/${empresaId}/partner`, {
      method: "PUT",
      token,
      body: JSON.stringify({ parent_cliente_id }),
    }),

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

  list: async (
    token: string,
    params: { limit?: number; cliente_id?: string } = {},
  ) => {
    const limit = params.limit ?? 100;
    const search = new URLSearchParams();
    search.set("limit", String(limit));
    if (params.cliente_id) search.set("cliente_id", params.cliente_id);
    const raw = await request<unknown>(
      `/admin/auditoria?${search.toString()}`,
      { token },
    );
    const list = Array.isArray(raw) ? raw : [];
    return list
      .map(normalizeAuditoriaEntry)
      .filter((e): e is AuditoriaEntry => e != null);
  },
};

export function isAdmin(rol: string) {
  return (
    rol === "admin_cliente" ||
    rol === "admin_partner" ||
    rol === "superadmin"
  );
}

export function isPartnerAdmin(rol: string) {
  return rol === "admin_partner";
}

export function isOrgManager(rol: string) {
  return rol === "superadmin" || rol === "admin_partner";
}

export function isSuperadmin(rol: string) {
  return rol === "superadmin";
}
