"use client";

import { useAuth } from "@/context/AuthContext";
import {
  adminClientesApi,
  adminPowerBiApi,
  ApiClientError,
} from "@/lib/api";
import type {
  Cliente,
  DashboardCliente,
  PowerBiReporte,
  PowerBiWorkspace,
  TipoOrganizacion,
} from "@/lib/types";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

function reportKey(r: PowerBiReporte) {
  return `${r.powerbiWorkspaceId}:${r.powerbiReportId}`;
}

function formatTipo(tipo?: TipoOrganizacion) {
  if (tipo === "partner") return "Partner";
  if (tipo === "empresa") return "Empresa";
  if (tipo === "plataforma") return "Plataforma";
  return "Organización";
}

function isPartner(c: Cliente) {
  return c.tipo === "partner";
}

function isEmpresa(c: Cliente) {
  return c.tipo === "empresa" || (!c.tipo && !isPartner(c));
}

export default function AdminClientesPage() {
  const { token } = useAuth();
  return <SuperadminOrganizacionesView token={token} />;
}

function SuperadminOrganizacionesView({ token }: { token: string | null }) {
  const [workspaces, setWorkspaces] = useState<PowerBiWorkspace[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [partners, setPartners] = useState<Cliente[]>([]);
  const [powerBiAviso, setPowerBiAviso] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [reportes, setReportes] = useState<PowerBiReporte[]>([]);
  const [selectedReportes, setSelectedReportes] = useState<Set<string>>(
    new Set(),
  );
  const [targetDashboards, setTargetDashboards] = useState<DashboardCliente[]>(
    [],
  );
  const [empresaVinculoId, setEmpresaVinculoId] = useState("");
  const [partnerVinculoId, setPartnerVinculoId] = useState("");
  const [vinculando, setVinculando] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [nuevaNombre, setNuevaNombre] = useState("");
  const [nuevaSlug, setNuevaSlug] = useState("");
  const [nuevaTipo, setNuevaTipo] = useState<"partner" | "empresa">("empresa");
  const [nuevaParentId, setNuevaParentId] = useState("");
  const [creating, setCreating] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReportes, setLoadingReportes] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const empresas = useMemo(
    () => clientes.filter(isEmpresa),
    [clientes],
  );

  const reloadOrganizaciones = useCallback(async () => {
    if (!token) return;
    const [list, partnerList] = await Promise.all([
      adminClientesApi.list(token),
      adminClientesApi.partners(token),
    ]);
    setClientes(list);
    setPartners(partnerList);
    return { list, partnerList };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      adminPowerBiApi.workspaces(token),
      reloadOrganizaciones(),
    ])
      .then(([wsRes, orgs]) => {
        setWorkspaces(wsRes.workspaces);
        setPowerBiAviso(wsRes.aviso);
        if (wsRes.workspaces.length > 0) {
          setWorkspaceId(wsRes.workspaces[0].id);
        }
        const all = orgs?.list ?? [];
        if (all.length > 0) setTargetId(all[0].id);
        const emps = all.filter(isEmpresa);
        const pts = orgs?.partnerList ?? [];
        if (emps.length > 0) setEmpresaVinculoId(emps[0].id);
        if (pts.length > 0) setPartnerVinculoId(pts[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [token, reloadOrganizaciones]);

  const loadTargetDashboards = useCallback(async () => {
    if (!token || !targetId) return;
    try {
      const data = await adminClientesApi.dashboards(token, targetId);
      setTargetDashboards(data.dashboards);
    } catch {
      setTargetDashboards([]);
    }
  }, [token, targetId]);

  useEffect(() => {
    loadTargetDashboards();
  }, [loadTargetDashboards]);

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
    if (!token || !targetId || selectedReportes.size === 0) return;
    setAssigning(true);
    setError(null);
    const toAssign = reportes.filter((r) => selectedReportes.has(reportKey(r)));
    try {
      for (const r of toAssign) {
        await adminClientesApi.asignarDashboard(token, targetId, {
          powerbi_workspace_id: r.powerbiWorkspaceId,
          powerbi_report_id: r.powerbiReportId,
          nombre: r.nombre,
        });
      }
      setSelectedReportes(new Set());
      await loadTargetDashboards();
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
    if (!token || !targetId) return;
    setError(null);
    try {
      await adminClientesApi.removerDashboard(token, targetId, dashboardId);
      await loadTargetDashboards();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Error");
    }
  }

  async function vincularEmpresaPartner() {
    if (!token || !empresaVinculoId || !partnerVinculoId) return;
    setVinculando(true);
    setError(null);
    try {
      await adminClientesApi.asignarPartner(
        token,
        empresaVinculoId,
        partnerVinculoId,
      );
      await reloadOrganizaciones();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Error al vincular",
      );
    } finally {
      setVinculando(false);
    }
  }

  async function crearOrganizacion(e: FormEvent) {
    e.preventDefault();
    if (!token || !nuevaNombre.trim() || !nuevaSlug.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await adminClientesApi.create(token, {
        nombre_empresa: nuevaNombre.trim(),
        slug_url: nuevaSlug.trim(),
        tipo: nuevaTipo,
        ...(nuevaTipo === "empresa" && nuevaParentId
          ? { parent_cliente_id: nuevaParentId }
          : {}),
      });
      setShowCreate(false);
      setNuevaNombre("");
      setNuevaSlug("");
      setNuevaTipo("empresa");
      setNuevaParentId("");
      await reloadOrganizaciones();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Error al crear");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <p className="ui-muted">Cargando organizaciones…</p>;
  }

  const targetActual = clientes.find((c) => c.id === targetId);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="ui-page-title">Organizaciones</h1>
        <p className="ui-page-desc">
          Jerarquía plataforma → partner → empresa. Asigna catálogos a partners
          y dashboards a empresas.
        </p>
      </header>

      {error ? <p className="ui-alert-error">{error}</p> : null}
      {powerBiAviso ? <p className="ui-alert-warn">{powerBiAviso}</p> : null}

      <section className="ui-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="ui-section-title">Crear organización</h2>
            <p className="ui-muted mt-1">
              Alta de partners o empresas en la jerarquía.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="ui-btn-secondary w-full sm:w-auto"
          >
            {showCreate ? "Cancelar" : "Nueva organización"}
          </button>
        </div>
        {showCreate ? (
          <form
            onSubmit={crearOrganizacion}
            className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <div>
              <label className="ui-label" htmlFor="nueva-nombre">
                Nombre
              </label>
              <input
                id="nueva-nombre"
                value={nuevaNombre}
                onChange={(e) => setNuevaNombre(e.target.value)}
                className="ui-input mt-1.5 w-full"
                required
              />
            </div>
            <div>
              <label className="ui-label" htmlFor="nueva-slug">
                Slug URL
              </label>
              <input
                id="nueva-slug"
                value={nuevaSlug}
                onChange={(e) => setNuevaSlug(e.target.value)}
                className="ui-input mt-1.5 w-full"
                placeholder="teck"
                required
              />
            </div>
            <div>
              <label className="ui-label" htmlFor="nueva-tipo">
                Tipo
              </label>
              <select
                id="nueva-tipo"
                value={nuevaTipo}
                onChange={(e) =>
                  setNuevaTipo(e.target.value as "partner" | "empresa")
                }
                className="ui-select mt-1.5 w-full"
              >
                <option value="empresa">Empresa</option>
                <option value="partner">Partner</option>
              </select>
            </div>
            {nuevaTipo === "empresa" ? (
              <div>
                <label className="ui-label" htmlFor="nueva-parent">
                  Partner padre (opcional)
                </label>
                <select
                  id="nueva-parent"
                  value={nuevaParentId}
                  onChange={(e) => setNuevaParentId(e.target.value)}
                  className="ui-select mt-1.5 w-full"
                >
                  <option value="">Sin partner</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombreEmpresa}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <button type="submit" disabled={creating} className="ui-btn-accent">
                {creating ? "Creando…" : "Crear organización"}
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="ui-card">
        <h2 className="ui-section-title">Todas las organizaciones</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Slug</th>
                <th>Partner padre</th>
              </tr>
            </thead>
            <tbody>
              {clientes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ui-muted text-center">
                    Sin organizaciones registradas
                  </td>
                </tr>
              ) : (
                clientes.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-100">
                    <td className="font-medium">{c.nombreEmpresa}</td>
                    <td>{formatTipo(c.tipo)}</td>
                    <td className="ui-meta">{c.slugUrl}</td>
                    <td className="ui-meta">
                      {c.parentNombreEmpresa ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ui-card">
        <h2 className="ui-section-title">Vincular empresa a partner</h2>
        <p className="ui-muted mt-1">
          Asigna una empresa (p. ej. Teck) al partner que la administra (p. ej.
          MGI).
        </p>
        <div className="mt-5 flex flex-wrap items-end gap-4">
          <div>
            <label className="ui-label" htmlFor="empresa-vinculo">
              Empresa
            </label>
            <select
              id="empresa-vinculo"
              value={empresaVinculoId}
              onChange={(e) => setEmpresaVinculoId(e.target.value)}
              className="ui-select mt-1.5 min-w-[240px]"
            >
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombreEmpresa}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ui-label" htmlFor="partner-vinculo">
              Partner
            </label>
            <select
              id="partner-vinculo"
              value={partnerVinculoId}
              onChange={(e) => setPartnerVinculoId(e.target.value)}
              className="ui-select mt-1.5 min-w-[240px]"
            >
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombreEmpresa}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={vinculando || !empresaVinculoId || !partnerVinculoId}
            onClick={vincularEmpresaPartner}
            className="ui-btn-accent"
          >
            {vinculando ? "Vinculando…" : "Vincular empresa"}
          </button>
        </div>
      </section>

      <section className="ui-card">
        <h2 className="ui-section-title">
          Power BI: catálogo y asignación directa
        </h2>
        <p className="ui-muted mt-1">
          Importa reportes al catálogo global y asígnalos a un partner (catálogo
          MGI) o directamente a cualquier empresa.
        </p>

        <div className="mt-5 flex flex-wrap items-end gap-4">
          <div>
            <label className="ui-label" htmlFor="workspace-select">
              Workspace Power BI
            </label>
            <select
              id="workspace-select"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="ui-select mt-1.5 min-w-[240px]"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nombre}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={syncing || !workspaceId}
            onClick={importarCatalogoGlobal}
            className="ui-btn-secondary border-amber-400 text-amber-950 hover:bg-amber-50"
          >
            {syncing ? "Importando…" : "Importar al catálogo global"}
          </button>
        </div>

        {loadingReportes ? (
          <p className="ui-muted mt-5">Cargando reportes…</p>
        ) : (
          <ul className="mt-5 max-h-72 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-2">
            {reportes.length === 0 ? (
              <li className="ui-muted px-2 py-4 text-center">
                Sin reportes en este workspace
              </li>
            ) : (
              reportes.map((r) => {
                const selected = selectedReportes.has(reportKey(r));
                return (
                  <li
                    key={reportKey(r)}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                      selected
                        ? "border-blue-300 bg-blue-50"
                        : "border-zinc-200 bg-white hover:bg-zinc-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleReporte(r)}
                      className="h-4 w-4 rounded border-zinc-400 text-blue-700 focus:ring-blue-600"
                      aria-label={`Seleccionar ${r.nombre}`}
                    />
                    <span className="text-sm font-medium text-zinc-900">
                      {r.nombre}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        )}

        <div className="mt-5">
          <label className="ui-label" htmlFor="target-select">
            Destino (partner o empresa)
          </label>
          <select
            id="target-select"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="ui-select mt-1.5 min-w-[320px]"
          >
            {partners.length > 0 ? (
              <optgroup label="Partners">
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombreEmpresa} (partner)
                  </option>
                ))}
              </optgroup>
            ) : null}
            {empresas.length > 0 ? (
              <optgroup label="Empresas">
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombreEmpresa}
                    {e.parentNombreEmpresa
                      ? ` · ${e.parentNombreEmpresa}`
                      : ""}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {partners.length === 0 && empresas.length === 0
              ? clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombreEmpresa}
                  </option>
                ))
              : null}
          </select>
        </div>

        <button
          type="button"
          disabled={assigning || selectedReportes.size === 0 || !targetId}
          onClick={asignarSeleccionados}
          className="ui-btn-accent mt-5"
        >
          {assigning
            ? "Asignando…"
            : `Asignar ${selectedReportes.size} reporte(s) a ${targetActual?.nombreEmpresa ?? "organización"}`}
        </button>
      </section>

      <section className="ui-card">
        <h2 className="ui-section-title">Dashboards de la organización</h2>
        <p className="ui-muted mt-1">
          Catálogo contratado para{" "}
          <span className="font-semibold text-zinc-900">
            {targetActual?.nombreEmpresa ?? "—"}
          </span>
          {isPartner(targetActual ?? ({} as Cliente))
            ? " (catálogo del partner)"
            : ""}
          .
        </p>

        <ul className="mt-5 space-y-2">
          {targetDashboards.length === 0 ? (
            <li className="ui-muted rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center">
              Esta organización aún no tiene dashboards
            </li>
          ) : (
            targetDashboards.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3"
              >
                <div>
                  <span className="font-medium text-zinc-900">{d.nombre}</span>
                  <p className="ui-meta mt-0.5">
                    Report ID: {d.powerbiReportId.slice(0, 8)}…
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => quitarDashboard(d.id)}
                  className="ui-btn-danger shrink-0"
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
