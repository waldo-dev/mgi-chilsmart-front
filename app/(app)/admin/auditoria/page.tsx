"use client";

import { ViewPrintButton } from "@/components/ViewPrintButton";
import { useAuth } from "@/context/AuthContext";
import {
  adminClientesApi,
  auditoriaApi,
  ApiClientError,
  isSuperadmin,
} from "@/lib/api";
import {
  labelOrganizacion,
  necesitaSelectorOrgAuditoria,
} from "@/lib/orgScope";
import type { AuditoriaEntry, Cliente } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

const LIMIT_OPTIONS = [50, 100, 200] as const;

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EntradaAuditoria({
  entry,
  showOrg,
}: {
  entry: AuditoriaEntry;
  showOrg: boolean;
}) {
  return (
    <>
      <td className="whitespace-nowrap px-4 py-3 text-zinc-700">
        {formatFecha(entry.creadoEn)}
      </td>
      {showOrg ? (
        <td className="px-4 py-3 text-zinc-700">
          {entry.nombreEmpresa ?? "—"}
        </td>
      ) : null}
      <td className="px-4 py-3">
        <div className="font-medium text-zinc-900">
          {entry.usuario.nombreCompleto}
        </div>
        <div className="ui-meta">{entry.usuario.email}</div>
      </td>
      <td className="px-4 py-3 text-zinc-800">{entry.accion}</td>
      <td className="px-4 py-3 font-mono text-xs text-zinc-600">
        {entry.direccionIp || "—"}
      </td>
    </>
  );
}

function TarjetaAuditoria({
  entry,
  showOrg,
}: {
  entry: AuditoriaEntry;
  showOrg: boolean;
}) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900">
            {entry.usuario.nombreCompleto}
          </p>
          <p className="ui-meta mt-0.5 truncate">{entry.usuario.email}</p>
          {showOrg && entry.nombreEmpresa ? (
            <p className="ui-meta mt-1">{entry.nombreEmpresa}</p>
          ) : null}
        </div>
        <time className="ui-meta shrink-0 text-right">
          {formatFecha(entry.creadoEn)}
        </time>
      </div>
      <p className="mt-3 text-sm text-zinc-800">{entry.accion}</p>
      <p className="ui-meta mt-2 font-mono">
        IP: {entry.direccionIp || "—"}
      </p>
    </article>
  );
}

export default function AdminAuditoriaPage() {
  const { token, usuario } = useAuth();
  const esSuperadmin = Boolean(usuario && isSuperadmin(usuario.rol));
  const conSelectorOrg = Boolean(
    usuario && necesitaSelectorOrgAuditoria(usuario.rol),
  );

  const [organizaciones, setOrganizaciones] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [entries, setEntries] = useState<AuditoriaEntry[]>([]);
  const [limit, setLimit] = useState<number>(100);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !conSelectorOrg) return;
    adminClientesApi
      .list(token)
      .then((list) => {
        setOrganizaciones(list);
        setClienteId("");
      })
      .catch(() => setOrganizaciones([]));
  }, [token, conSelectorOrg]);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    auditoriaApi
      .list(token, {
        limit,
        cliente_id: clienteId || undefined,
      })
      .then(setEntries)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [token, limit, clienteId]);

  useEffect(() => {
    load();
  }, [load]);

  const showOrgColumn = conSelectorOrg;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="ui-page-title">Auditoría</h1>
          <p className="ui-page-desc">
            {conSelectorOrg
              ? esSuperadmin
                ? "Registro de acciones por organización."
                : "Registro de tu partner y empresas a tu cargo."
              : "Últimas acciones registradas en tu empresa"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            Mostrar
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="ui-select py-1.5"
              disabled={loading}
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} registros
                </option>
              ))}
            </select>
          </label>
          <ViewPrintButton />
        </div>
      </header>

      {conSelectorOrg ? (
        <section className="ui-card">
          <h2 className="ui-section-title">Filtrar por organización</h2>
          <p className="ui-muted mt-1">
            Deja en “Todas en mi scope” para ver el historial completo permitido.
          </p>
          <div className="mt-4">
            <label className="ui-label" htmlFor="auditoria-org">
              Organización
            </label>
            <select
              id="auditoria-org"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="ui-select mt-1.5 w-full sm:max-w-md"
            >
              <option value="">Todas en mi scope</option>
              {organizaciones.map((o) => (
                <option key={o.id} value={o.id}>
                  {labelOrganizacion(o)}
                </option>
              ))}
            </select>
          </div>
        </section>
      ) : null}

      {error ? <p className="ui-alert-error">{error}</p> : null}

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        {loading ? (
          <p className="ui-muted px-4 py-12 text-center">Cargando auditoría…</p>
        ) : entries.length === 0 ? (
          <p className="ui-muted m-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-12 text-center">
            Sin registros para este filtro
          </p>
        ) : (
          <>
            <ul className="space-y-3 p-3 md:hidden">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <TarjetaAuditoria entry={entry} showOrg={showOrgColumn} />
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Fecha</th>
                    {showOrgColumn ? (
                      <th className="px-4 py-3 font-semibold">Organización</th>
                    ) : null}
                    <th className="px-4 py-3 font-semibold">Usuario</th>
                    <th className="px-4 py-3 font-semibold">Acción</th>
                    <th className="px-4 py-3 font-semibold">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <EntradaAuditoria entry={entry} showOrg={showOrgColumn} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="border-t border-zinc-200 px-4 py-3">
              <p className="ui-meta text-center sm:text-left">
                Mostrando {entries.length} registro
                {entries.length === 1 ? "" : "s"}
                {entries.length >= limit
                  ? `. Puede haber más; aumenta el límite arriba.`
                  : "."}
              </p>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
