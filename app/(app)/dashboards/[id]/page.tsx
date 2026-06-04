"use client";

import { PowerBiEmbed } from "@/components/PowerBiEmbed";
import { useAuth } from "@/context/AuthContext";
import { auditoriaApi, dashboardsApi } from "@/lib/api";
import type { EmbedToken } from "@/lib/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [embed, setEmbed] = useState<EmbedToken | null>(null);
  const [nombre, setNombre] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;

    let cancelled = false;

    async function load() {
      try {
        const list = await dashboardsApi.list(token!);
        const dash = list.find((d) => d.id === id);
        if (dash) setNombre(dash.nombre);

        const tokenData = await dashboardsApi.embedToken(token!, id);
        if (cancelled) return;
        setEmbed(tokenData);

        const accion = `Visualizó Dashboard ${dash?.nombre ?? id}`;
        auditoriaApi.log(token!, accion).catch(() => {});
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al cargar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  if (loading) {
    return <p className="text-zinc-500">Preparando reporte…</p>;
  }

  if (error) {
    return (
      <div>
        <Link href="/dashboards" className="text-sm text-blue-600 hover:underline">
          ← Volver
        </Link>
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-red-700">
          {error}
        </p>
      </div>
    );
  }

  if (!embed) return null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboards"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Dashboards
          </Link>
          {nombre ? (
            <h1 className="mt-1 text-xl font-bold text-zinc-900">{nombre}</h1>
          ) : null}
        </div>
        <p className="text-xs text-zinc-400">
          Token expira: {new Date(embed.expiry).toLocaleString("es-CL")}
        </p>
      </div>
      <PowerBiEmbed embed={embed} />
    </div>
  );
}
