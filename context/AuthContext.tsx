"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authApi, ApiClientError } from "@/lib/api";
import {
  isSafeBrandColor,
  isValidStoredAuth,
} from "@/lib/security";
import type { Empresa, Usuario } from "@/lib/types";

const STORAGE_KEY = "chilsmart_auth";

interface StoredAuth {
  token: string;
  usuario: Usuario;
  empresa: Empresa;
}

interface AuthContextValue {
  token: string | null;
  usuario: Usuario | null;
  empresa: Empresa | null;
  loading: boolean;
  sessionValidated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStored(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidStoredAuth(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as StoredAuth;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function saveStored(data: StoredAuth | null) {
  if (typeof window === "undefined") return;
  if (data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function applyBranding(empresa: Empresa | null) {
  const root = document.documentElement;
  if (empresa?.colorPrimario && isSafeBrandColor(empresa.colorPrimario)) {
    root.style.setProperty("--brand-primary", empresa.colorPrimario);
  } else {
    root.style.removeProperty("--brand-primary");
  }
  if (empresa?.colorSecundario && isSafeBrandColor(empresa.colorSecundario)) {
    root.style.setProperty("--brand-secondary", empresa.colorSecundario);
  } else {
    root.style.removeProperty("--brand-secondary");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionValidated, setSessionValidated] = useState(false);
  const validateGen = useRef(0);

  const setSession = useCallback((data: StoredAuth | null) => {
    if (data) {
      if (data.usuario.activo === false) {
        setToken(null);
        setUsuario(null);
        setEmpresa(null);
        saveStored(null);
        applyBranding(null);
        return;
      }
      setToken(data.token);
      setUsuario(data.usuario);
      setEmpresa(data.empresa);
      saveStored(data);
      applyBranding(data.empresa);
    } else {
      setToken(null);
      setUsuario(null);
      setEmpresa(null);
      saveStored(null);
      applyBranding(null);
    }
  }, []);

  const validateToken = useCallback(
    async (sessionToken: string) => {
      const gen = ++validateGen.current;
      try {
        const data = await authApi.me(sessionToken);
        if (gen !== validateGen.current) return false;
        if (data.usuario.activo === false) {
          setSession(null);
          return false;
        }
        setSession({
          token: sessionToken,
          usuario: data.usuario,
          empresa: data.empresa,
        });
        return true;
      } catch (err) {
        if (gen !== validateGen.current) return false;
        if (err instanceof ApiClientError && err.status === 401) {
          setSession(null);
        }
        return false;
      }
    },
    [setSession],
  );

  const refresh = useCallback(async () => {
    const stored = loadStored();
    if (!stored?.token) {
      setSession(null);
      setSessionValidated(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    await validateToken(stored.token);
    setSessionValidated(true);
    setLoading(false);
  }, [setSession, validateToken]);

  useEffect(() => {
    const stored = loadStored();
    if (!stored) {
      setSessionValidated(true);
      setLoading(false);
      return;
    }
    validateToken(stored.token).finally(() => {
      setSessionValidated(true);
      setLoading(false);
    });
  }, [validateToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await authApi.login(email, password);
      validateGen.current += 1;
      if (data.usuario.activo === false) {
        throw new ApiClientError("Tu cuenta está desactivada", 403);
      }
      setSession({
        token: data.token,
        usuario: data.usuario,
        empresa: data.empresa,
      });
      setSessionValidated(true);
      setLoading(false);
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    validateGen.current += 1;
    const sessionToken = token ?? loadStored()?.token ?? null;

    if (sessionToken) {
      try {
        await authApi.logout(sessionToken);
      } catch {
        /* Siempre limpiamos la sesión local aunque falle la revocación */
      }
    }

    setSession(null);
    setSessionValidated(true);
    setLoading(false);
  }, [setSession, token]);

  const value = useMemo(
    () => ({
      token,
      usuario,
      empresa,
      loading,
      sessionValidated,
      login,
      logout,
      refresh,
    }),
    [token, usuario, empresa, loading, sessionValidated, login, logout, refresh],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
