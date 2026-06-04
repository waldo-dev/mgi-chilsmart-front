"use client";

import { useAuth } from "@/context/AuthContext";
import {
  adminAccesosApi,
  adminUsuariosApi,
  ApiClientError,
  isAdmin,
} from "@/lib/api";
import type { DashboardCatalogo, UsuarioAdmin } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminAccesosPage() {
  const { token, usuario } = useAuth();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [catalogo, setCatalogo] = useState<DashboardCatalogo[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [asignados, setAsignados] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (usuario && !isAdmin(usuario.rol)) {
      router.replace("/dashboards");
    }
  }, [usuario, router]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      adminUsuariosApi.list(token),
      adminAccesosApi.dashboardsDisponibles(token),
    ])
      .then(([u, c]) => {
        setUsuarios(u);
        setCatalogo(c);
        if (u.length > 0) setSelectedUserId(u[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || !selectedUserId) return;
    adminAccesosApi
      .porUsuario(token, selectedUserId)
      .then(setAsignados)
      .catch(() => setAsignados([]));
  }, [token, selectedUserId]);

  async function toggleDashboard(dashboardId: string) {
    if (!token || !selectedUserId) return;
    setError(null);
    const tiene = asignados.includes(dashboardId);
    try {
      if (tiene) {
        await adminAccesosApi.remover(token, selectedUserId, dashboardId);
        setAsignados((prev) => prev.filter((id) => id !== dashboardId));
      } else {
        await adminAccesosApi.asignar(token, selectedUserId, dashboardId);
        setAsignados((prev) => [...prev, dashboardId]);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Error");
    }
  }

  if (loading) return <p className="text-zinc-500">Cargando…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">Accesos a dashboards</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Asigna dashboards contratados de tu empresa a usuarios finales
      </p>

      {usuario?.rol === "superadmin" ? (
        <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-800">
          Como superadmin: primero asigna reportes a la empresa en{" "}
          <a href="/admin/clientes" className="font-medium underline">
            Empresas
          </a>
          , luego asígnalos aquí a cada usuario.
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Usuario
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="mt-1 min-w-[240px] rounded-lg border border-zinc-300 px-3 py-2"
          >
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombreCompleto} ({u.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      {catalogo.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          No hay dashboards disponibles para esta empresa. Un superadmin debe
          asignarlos en Empresas.
        </p>
      ) : (
        <ul className="mt-8 space-y-2">
          {catalogo.map((d) => {
            const checked = asignados.includes(d.id);
            return (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3"
              >
                <span className="font-medium text-zinc-800">{d.nombre}</span>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDashboard(d.id)}
                    className="h-4 w-4 rounded"
                  />
                  Asignado
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
