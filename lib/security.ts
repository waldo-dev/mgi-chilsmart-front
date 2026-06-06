const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const POWERBI_HOST_SUFFIXES = [
  "powerbi.com",
  "analysis.windows.net",
  "microsoftonline.com",
  "microsoft.com",
];

const LOGIN_RATE_KEY = "chilsmart_login_rate";
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 60_000;

interface LoginRateState {
  failures: number;
  lockedUntil: number;
}

/** Solo rutas internas relativas (evita open redirect). */
export function isSafeInternalPath(path: string | null | undefined): boolean {
  if (!path || typeof path !== "string") return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("\\")) return false;
  if (/[\0\r\n]/.test(path)) return false;
  return true;
}

export function getSafeRedirectPath(
  path: string | null | undefined,
  fallback = "/dashboards",
): string {
  return isSafeInternalPath(path) ? path! : fallback;
}

export function isSafeBrandColor(value: string | null | undefined): value is string {
  return typeof value === "string" && HEX_COLOR.test(value);
}

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

/** URLs https para logos de empresa (bloquea javascript:, data:, etc.). */
export function isAllowedLogoUrl(
  value: string | null | undefined,
): value is string {
  if (!value || typeof value !== "string") return false;
  const url = parseHttpUrl(value);
  if (!url) return false;
  if (url.protocol !== "https:") return false;
  return true;
}

/** Valida embedUrl de Power BI antes de pasarlo al SDK. */
export function isAllowedPowerBiEmbedUrl(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  const url = parseHttpUrl(value);
  if (!url) return false;
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return POWERBI_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

/** Mensajes de error seguros para mostrar al usuario. */
export function sanitizeApiErrorMessage(status: number, message: string): string {
  const trimmed = (message ?? "").trim();
  if (status === 401) return "Credenciales incorrectas o sesión expirada";
  if (status === 403) return "No tienes permiso para realizar esta acción";
  if (status === 404) return "Recurso no encontrado";
  if (status === 429) return "Demasiadas solicitudes. Espera un momento.";
  if (status >= 500) return "Error del servidor. Intenta más tarde.";

  if (!trimmed || trimmed.length > 180) return "Solicitud inválida";
  if (/stack|trace|exception|sql|prisma|mongodb|internal server/i.test(trimmed)) {
    return "Solicitud inválida";
  }
  return trimmed;
}

/** Mensaje genérico en login para dificultar enumeración de cuentas. */
export function sanitizeLoginError(status: number): string {
  if (status === 429) return "Demasiados intentos. Espera un momento.";
  return "Email o contraseña incorrectos";
}

function readLoginRateState(): LoginRateState {
  if (typeof window === "undefined") {
    return { failures: 0, lockedUntil: 0 };
  }
  try {
    const raw = sessionStorage.getItem(LOGIN_RATE_KEY);
    if (!raw) return { failures: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw) as LoginRateState;
    return {
      failures: Number(parsed.failures) || 0,
      lockedUntil: Number(parsed.lockedUntil) || 0,
    };
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
}

function writeLoginRateState(state: LoginRateState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(LOGIN_RATE_KEY, JSON.stringify(state));
}

export function checkLoginRateLimit(): {
  allowed: boolean;
  waitSeconds: number;
} {
  const state = readLoginRateState();
  const now = Date.now();
  if (state.lockedUntil > now) {
    return {
      allowed: false,
      waitSeconds: Math.ceil((state.lockedUntil - now) / 1000),
    };
  }
  if (state.lockedUntil > 0 && state.lockedUntil <= now) {
    writeLoginRateState({ failures: 0, lockedUntil: 0 });
  }
  return { allowed: true, waitSeconds: 0 };
}

export function recordLoginFailure() {
  const state = readLoginRateState();
  const failures = state.failures + 1;
  if (failures >= LOGIN_MAX_ATTEMPTS) {
    writeLoginRateState({ failures: 0, lockedUntil: Date.now() + LOGIN_LOCKOUT_MS });
    return;
  }
  writeLoginRateState({ failures, lockedUntil: 0 });
}

export function clearLoginFailures() {
  writeLoginRateState({ failures: 0, lockedUntil: 0 });
}

/** Valida estructura mínima del objeto guardado en localStorage. */
export function isValidStoredAuth(data: unknown): data is {
  token: string;
  usuario: { id: string; email: string; nombreCompleto: string; rol: string; activo: boolean };
  empresa: { nombreEmpresa: string; slugUrl: string };
} {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (typeof d.token !== "string" || d.token.length < 10) return false;
  if (!d.usuario || typeof d.usuario !== "object") return false;
  if (!d.empresa || typeof d.empresa !== "object") return false;
  const u = d.usuario as Record<string, unknown>;
  const e = d.empresa as Record<string, unknown>;
  return (
    typeof u.id === "string" &&
    typeof u.email === "string" &&
    typeof u.nombreCompleto === "string" &&
    typeof u.rol === "string" &&
    typeof e.nombreEmpresa === "string" &&
    typeof e.slugUrl === "string"
  );
}

export function assertSecureApiBaseInProduction(apiBase: string) {
  if (process.env.NODE_ENV !== "production") return;
  if (apiBase.startsWith("http://") && !apiBase.includes("localhost")) {
    console.error(
      "[seguridad] NEXT_PUBLIC_API_URL debe usar HTTPS en producción.",
    );
  }
}
