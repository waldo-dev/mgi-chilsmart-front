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
import type { AuthResponse, Empresa, Usuario } from "@/lib/types";

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
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStored(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed?.token) return null;
    return parsed;
  } catch {
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
  if (empresa?.colorPrimario) {
    root.style.setProperty("--brand-primary", empresa.colorPrimario);
  } else {
    root.style.removeProperty("--brand-primary");
  }
  if (empresa?.colorSecundario) {
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
  const validateGen = useRef(0);

  const setSession = useCallback((data: StoredAuth | null) => {
    if (data) {
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
        if (gen !== validateGen.current) return;
        setSession({
          token: sessionToken,
          usuario: data.usuario,
          empresa: data.empresa,
        });
      } catch (err) {
        if (gen !== validateGen.current) return;
        if (err instanceof ApiClientError && err.status === 401) {
          setSession(null);
        }
      }
    },
    [setSession],
  );

  const refresh = useCallback(async () => {
    const stored = loadStored();
    if (!stored?.token) {
      setSession(null);
      setLoading(false);
      return;
    }
    setSession(stored);
    setLoading(false);
    await validateToken(stored.token);
  }, [setSession, validateToken]);

  useEffect(() => {
    const stored = loadStored();
    if (!stored) {
      setLoading(false);
      return;
    }
    setSession(stored);
    setLoading(false);
    validateToken(stored.token);
  }, [setSession, validateToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await authApi.login(email, password);
      validateGen.current += 1;
      setSession({
        token: data.token,
        usuario: data.usuario,
        empresa: data.empresa,
      });
      setLoading(false);
    },
    [setSession],
  );

  const logout = useCallback(() => {
    validateGen.current += 1;
    setSession(null);
    setLoading(false);
  }, [setSession]);

  const value = useMemo(
    () => ({ token, usuario, empresa, loading, login, logout, refresh }),
    [token, usuario, empresa, loading, login, logout, refresh],
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
