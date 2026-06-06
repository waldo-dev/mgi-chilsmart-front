"use client";

import { DashboardExportActions } from "@/components/DashboardExportActions";
import { PowerBiEmbed } from "@/components/PowerBiEmbed";
import { useAuth } from "@/context/AuthContext";
import { auditoriaApi, dashboardsApi } from "@/lib/api";
import type { EmbedToken } from "@/lib/types";
import type { Report } from "powerbi-client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

function formatExpiry(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [embed, setEmbed] = useState<EmbedToken | null>(null);
  const [report, setReport] = useState<Report | null>(null);
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
    return (
      <div className="space-y-4">
        <div className="h-5 w-24 animate-pulse rounded bg-zinc-200" />
        <div className="h-8 w-2/3 max-w-sm animate-pulse rounded bg-zinc-200" />
        <div className="h-[calc(100dvh-10.5rem)] min-h-[420px] animate-pulse rounded-xl bg-zinc-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboards"
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-700 hover:text-zinc-900"
        >
          <span aria-hidden>←</span> Volver a dashboards
        </Link>
        <p className="ui-alert-error">{error}</p>
      </div>
    );
  }

  if (!embed) return null;

  const titulo = nombre || "Dashboard";

  return (
    <div className="flex flex-col gap-4">
      {/* Cabecera */}
      <header className="shrink-0">
        <Link
          href="/dashboards"
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50"
        >
          <span aria-hidden>←</span>
          <span className="hidden sm:inline">Dashboards</span>
          <span className="sm:hidden">Volver</span>
        </Link>

        <div className="mt-3 flex flex-col gap-3 sm:mt-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="ui-page-title text-xl sm:text-2xl">{titulo}</h1>
            <p className="ui-meta mt-2 rounded-full bg-zinc-100 px-3 py-1 sm:inline-block">
              Sesión del reporte hasta {formatExpiry(embed.expiry)}
            </p>
          </div>
          <DashboardExportActions
            report={report}
            reportName={titulo}
            reportReady={report !== null}
          />
        </div>
      </header>

      {/* Embed a ancho completo en móvil (sale del padding del main) */}
      <div className="relative min-h-0 flex-1 max-sm:-mx-4 max-sm:w-[calc(100%+2rem)] sm:mx-0 sm:w-full">
        <PowerBiEmbed
          embed={embed}
          onReportReady={setReport}
          className="h-[calc(100dvh-10.5rem)] min-h-[480px] w-full overflow-hidden border-zinc-200 bg-zinc-100 shadow-sm max-sm:rounded-none max-sm:border-x-0 sm:rounded-xl sm:border"
        />
      </div>

      <p className="ui-meta text-center sm:hidden">
        Desliza y pellizca para explorar el reporte
      </p>
    </div>
  );
}
