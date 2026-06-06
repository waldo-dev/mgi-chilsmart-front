"use client";

import { useAuth } from "@/context/AuthContext";
import { authApi, ApiClientError } from "@/lib/api";
import { FormEvent, useEffect, useState } from "react";

export default function PerfilPage() {
  const { token, usuario, refresh } = useAuth();
  const [nombre, setNombre] = useState("");
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNuevo, setPasswordNuevo] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (usuario) setNombre(usuario.nombreCompleto);
  }, [usuario]);

  async function handleProfile(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setProfileError(null);
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      await authApi.updateProfile(token, { nombre_completo: nombre.trim() });
      await refresh();
      setProfileMsg("Perfil actualizado");
    } catch (err) {
      setProfileError(
        err instanceof ApiClientError ? err.message : "Error al guardar",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setPasswordError(null);
    setPasswordMsg(null);

    if (passwordNuevo !== passwordConfirm) {
      setPasswordError("Las contraseñas nuevas no coinciden");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authApi.changePassword(token, {
        password_actual: passwordActual,
        password_nuevo: passwordNuevo,
      });
      setPasswordMsg(res.message ?? "Contraseña actualizada");
      setPasswordActual("");
      setPasswordNuevo("");
      setPasswordConfirm("");
    } catch (err) {
      setPasswordError(
        err instanceof ApiClientError ? err.message : "Error al cambiar clave",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-zinc-900">Mi perfil</h1>
      <p className="mt-1 text-sm text-zinc-500">{usuario?.email}</p>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Datos personales</h2>
        <form onSubmit={handleProfile} className="mt-4 space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-sm text-zinc-600">
              Nombre completo
            </label>
            <input
              id="nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>
          {profileError ? (
            <p className="text-sm text-red-600">{profileError}</p>
          ) : null}
          {profileMsg ? (
            <p className="text-sm text-green-700">{profileMsg}</p>
          ) : null}
          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {savingProfile ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-zinc-900">
          Cambiar contraseña
        </h2>
        <form onSubmit={handlePassword} className="mt-4 space-y-4">
          <div>
            <label htmlFor="actual" className="block text-sm text-zinc-600">
              Contraseña actual
            </label>
            <input
              id="actual"
              type="password"
              required
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="nueva" className="block text-sm text-zinc-600">
              Contraseña nueva
            </label>
            <input
              id="nueva"
              type="password"
              required
              minLength={6}
              value={passwordNuevo}
              onChange={(e) => setPasswordNuevo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm text-zinc-600">
              Confirmar contraseña nueva
            </label>
            <input
              id="confirm"
              type="password"
              required
              minLength={6}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </div>
          {passwordError ? (
            <p className="text-sm text-red-600">{passwordError}</p>
          ) : null}
          {passwordMsg ? (
            <p className="text-sm text-green-700">{passwordMsg}</p>
          ) : null}
          <button
            type="submit"
            disabled={savingPassword}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {savingPassword ? "Actualizando…" : "Cambiar contraseña"}
          </button>
        </form>
      </section>
    </div>
  );
}
