"use client";

import { useAuth } from "@/context/AuthContext";
import { auditoriaApi, isAdmin } from "@/lib/api";
import type { AuditoriaEntry } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminAuditoriaPage() {
  const { token, usuario } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<AuditoriaEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (usuario && !isAdmin(usuario.rol)) {
      router.replace("/dashboards");
    }
  }, [usuario, router]);

  useEffect(() => {
    if (!token) return;
    auditoriaApi
      .list(token, 100)
      .then(setEntries)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="text-zinc-500">Cargando auditoría…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">Auditoría</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Últimas acciones registradas en tu empresa
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Acción</th>
              <th className="px-4 py-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-zinc-100">
                <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                  {new Date(e.creadoEn).toLocaleString("es-CL")}
                </td>
                <td className="px-4 py-3">
                  <div>{e.usuario.nombreCompleto}</div>
                  <div className="text-xs text-zinc-400">{e.usuario.email}</div>
                </td>
                <td className="px-4 py-3">{e.accion}</td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  {e.direccionIp}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 ? (
          <p className="p-8 text-center text-zinc-500">Sin registros aún</p>
        ) : null}
      </div>
    </div>
  );
}
