"use client";

import { useAuth } from "@/context/AuthContext";
import {
  adminClientesApi,
  adminPowerBiApi,
  ApiClientError,
  isSuperadmin,
} from "@/lib/api";
import type {
  Cliente,
  DashboardCliente,
  PowerBiReporte,
  PowerBiWorkspace,
} from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function reportKey(r: PowerBiReporte) {
  return `${r.powerbiWorkspaceId}:${r.powerbiReportId}`;
}

export default function AdminClientesPage() {
  const { token, usuario } = useAuth();
  const router = useRouter();

  const [workspaces, setWorkspaces] = useState<PowerBiWorkspace[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [powerBiAviso, setPowerBiAviso] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [reportes, setReportes] = useState<PowerBiReporte[]>([]);
  const [selectedReportes, setSelectedReportes] = useState<Set<string>>(
    new Set(),
  );
  const [clienteDashboards, setClienteDashboards] = useState<
    DashboardCliente[]
  >([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReportes, setLoadingReportes] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (usuario && !isSuperadmin(usuario.rol)) {
      router.replace("/dashboards");
    }
  }, [usuario, router]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      adminPowerBiApi.workspaces(token),
      adminClientesApi.list(token),
    ])
      .then(([wsRes, c]) => {
        setWorkspaces(wsRes.workspaces);
        setPowerBiAviso(wsRes.aviso);
        setClientes(c);
        if (wsRes.workspaces.length > 0) setWorkspaceId(wsRes.workspaces[0].id);
        if (c.length > 0) setClienteId(c[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [token]);

  const loadClienteDashboards = useCallback(async () => {
    if (!token || !clienteId) return;
    try {
      const data = await adminClientesApi.dashboards(token, clienteId);
      setClienteDashboards(data.dashboards);
    } catch {
      setClienteDashboards([]);
    }
  }, [token, clienteId]);

  useEffect(() => {
    loadClienteDashboards();
  }, [loadClienteDashboards]);

  useEffect(() => {
    if (!token || !workspaceId) return;
    setLoadingReportes(true);
    setSelectedReportes(new Set());
    adminPowerBiApi
      .reportes(token, workspaceId)
      .then(setReportes)
      .catch((e) => {
        setReportes([]);
        setError(e instanceof Error ? e.message : "Error al cargar reportes");
      })
      .finally(() => setLoadingReportes(false));
  }, [token, workspaceId]);

  function toggleReporte(r: PowerBiReporte) {
    const key = reportKey(r);
    setSelectedReportes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function asignarSeleccionados() {
    if (!token || !clienteId || selectedReportes.size === 0) return;
    setAssigning(true);
    setError(null);
    const toAssign = reportes.filter((r) => selectedReportes.has(reportKey(r)));
    try {
      for (const r of toAssign) {
        await adminClientesApi.asignarDashboard(token, clienteId, {
          powerbi_workspace_id: r.powerbiWorkspaceId,
          powerbi_report_id: r.powerbiReportId,
          nombre: r.nombre,
        });
      }
      setSelectedReportes(new Set());
      await loadClienteDashboards();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Error al asignar");
    } finally {
      setAssigning(false);
    }
  }

  async function importarCatalogoGlobal() {
    if (!token || !workspaceId) return;
    setSyncing(true);
    setError(null);
    try {
      await adminPowerBiApi.sync(token, [workspaceId]);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Error sync");
    } finally {
      setSyncing(false);
    }
  }

  async function quitarDashboard(dashboardId: string) {
    if (!token || !clienteId) return;
    setError(null);
    try {
      await adminClientesApi.removerDashboard(token, clienteId, dashboardId);
      await loadClienteDashboards();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Error");
    }
  }

  if (loading) return <p className="text-zinc-500">Cargando…</p>;

  const clienteActual = clientes.find((c) => c.id === clienteId);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Empresas y Power BI
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Asigna reportes de Power BI a clientes (superadmin)
        </p>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {powerBiAviso ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {powerBiAviso}
        </p>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold text-zinc-900">
          Paso 1–2: Workspace y reportes
        </h2>
        <div className="mt-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Workspace Power BI
            </label>
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="mt-1 min-w-[220px] rounded-lg border border-zinc-300 px-3 py-2"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              disabled={syncing || !workspaceId}
              onClick={importarCatalogoGlobal}
              className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              {syncing
                ? "Importando…"
                : "Importar workspace al catálogo global"}
            </button>
          </div>
        </div>

        {loadingReportes ? (
          <p className="mt-4 text-sm text-zinc-500">Cargando reportes…</p>
        ) : (
          <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
            {reportes.length === 0 ? (
              <li className="text-sm text-zinc-500">
                Sin reportes en este workspace
              </li>
            ) : (
              reportes.map((r) => (
                <li
                  key={reportKey(r)}
                  className="flex items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedReportes.has(reportKey(r))}
                    onChange={() => toggleReporte(r)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm font-medium text-zinc-800">
                    {r.nombre}
                  </span>
                  <span className="text-xs text-zinc-400">
                    orden {r.orden}
                  </span>
                </li>
              ))
            )}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold text-zinc-900">
          Paso 3–5: Asignar a empresa
        </h2>
        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-700">
            Cliente / empresa
          </label>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="mt-1 min-w-[280px] rounded-lg border border-zinc-300 px-3 py-2"
          >
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombreEmpresa} ({c.slugUrl})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={
            assigning || selectedReportes.size === 0 || !clienteId
          }
          onClick={asignarSeleccionados}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {assigning
            ? "Asignando…"
            : `Asignar ${selectedReportes.size} reporte(s) a ${clienteActual?.nombreEmpresa ?? "cliente"}`}
        </button>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold text-zinc-900">
          Dashboards del cliente
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Contratados para{" "}
          <strong>{clienteActual?.nombreEmpresa ?? "—"}</strong>. El
          admin_cliente los asigna a usuarios en Accesos.
        </p>
        <ul className="mt-4 space-y-2">
          {clienteDashboards.length === 0 ? (
            <li className="text-sm text-zinc-500">
              Este cliente aún no tiene dashboards
            </li>
          ) : (
            clienteDashboards.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-zinc-100 px-4 py-3"
              >
                <div>
                  <span className="font-medium text-zinc-800">{d.nombre}</span>
                  <p className="text-xs text-zinc-400">
                    Report ID: {d.powerbiReportId.slice(0, 8)}…
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => quitarDashboard(d.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Quitar
                </button>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
