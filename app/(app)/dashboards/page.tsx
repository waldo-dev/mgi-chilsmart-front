"use client";

import { useAuth } from "@/context/AuthContext";
import { dashboardsApi } from "@/lib/api";
import type { Dashboard } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardsPage() {
  const { token } = useAuth();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    dashboardsApi
      .list(token)
      .then(setDashboards)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <p className="text-zinc-500">Cargando dashboards…</p>;
  }

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</p>
    );
  }

  if (dashboards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
        <h2 className="text-lg font-semibold text-zinc-800">
          Sin dashboards asignados
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Contacta al administrador de tu empresa para obtener acceso.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">Mis dashboards</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Selecciona un reporte para visualizarlo.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dashboards.map((d) => (
          <li key={d.id}>
            <Link
              href={`/dashboards/${d.id}`}
              className="block rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <h2 className="font-semibold text-zinc-900">{d.nombre}</h2>
              <p className="mt-2 text-xs text-zinc-400">Abrir reporte →</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
