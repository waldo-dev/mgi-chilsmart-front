"use client";

import { DualBrandLogos } from "@/components/DualBrandLogos";
import { useAuth } from "@/context/AuthContext";
import { ApiClientError } from "@/lib/api";
import { resolvePrimary, PLATFORM_PRIMARY } from "@/lib/branding";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  getSafeRedirectPath,
  recordLoginFailure,
  sanitizeLoginError,
} from "@/lib/security";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState, type CSSProperties } from "react";

export default function LoginPage() {
  const { login, token, loading, empresa } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = getSafeRedirectPath(searchParams.get("redirect"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && token) {
      router.replace(redirect);
    }
  }, [loading, token, router, redirect]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const rate = checkLoginRateLimit();
    if (!rate.allowed) {
      setError(`Demasiados intentos. Espera ${rate.waitSeconds} segundos.`);
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      clearLoginFailures();
      router.replace(redirect);
    } catch (err) {
      recordLoginFailure();
      const status = err instanceof ApiClientError ? err.status : 0;
      setError(sanitizeLoginError(status));
    } finally {
      setSubmitting(false);
      setPassword("");
    }
  }

  const primary = empresa?.colorPrimario
    ? resolvePrimary(empresa.colorPrimario)
    : PLATFORM_PRIMARY;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-500" />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-white px-4 py-12"
      style={{ "--brand": primary } as CSSProperties}
    >
      <div className="flex w-full max-w-[480px] flex-col items-center">
        <DualBrandLogos priority variant="login" />

        <h1 className="mt-10 text-center text-xl font-semibold text-zinc-900">
          Iniciar sesión
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 w-full space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-zinc-600">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-zinc-600">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: primary }}
          >
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
