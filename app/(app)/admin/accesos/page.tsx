"use client";

import { useAuth } from "@/context/AuthContext";
import {
  adminAccesosApi,
  adminClientesApi,
  adminUsuariosApi,
  ApiClientError,
  isPartnerAdmin,
  isSuperadmin,
} from "@/lib/api";
import {
  agruparOrganizaciones,
  labelOrganizacion,
  necesitaSelectorOrgAccesos,
  organizacionesParaAccesos,
} from "@/lib/orgScope";
import type { Cliente, DashboardCatalogo, Rol, UsuarioAdmin } from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

function SelectorOrganizacionAccesos({
  id,
  rol,
  organizaciones,
  value,
  onChange,
}: {
  id: string;
  rol: Rol;
  organizaciones: Cliente[];
  value: string;
  onChange: (id: string) => void;
}) {
  const esSuperadmin = rol === "superadmin";

  if (!esSuperadmin) {
    return (
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ui-select mt-1.5 w-full sm:max-w-md"
      >
        {organizaciones.map((o) => (
          <option key={o.id} value={o.id}>
            {labelOrganizacion(o)}
          </option>
        ))}
      </select>
    );
  }

  const { plataforma, partners, empresas } = agruparOrganizaciones(organizaciones);

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="ui-select mt-1.5 w-full sm:max-w-md"
    >
      {plataforma.length > 0 ? (
        <optgroup label="Plataforma (Chilsmart)">
          {plataforma.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombreEmpresa}
            </option>
          ))}
        </optgroup>
      ) : null}
      {partners.length > 0 ? (
        <optgroup label="Partners">
          {partners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombreEmpresa}
            </option>
          ))}
        </optgroup>
      ) : null}
      {empresas.length > 0 ? (
        <optgroup label="Empresas / clientes">
          {empresas.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombreEmpresa}
              {o.parentNombreEmpresa ? ` · ${o.parentNombreEmpresa}` : ""}
            </option>
          ))}
        </optgroup>
      ) : null}
      {plataforma.length === 0 &&
      partners.length === 0 &&
      empresas.length === 0
        ? organizaciones.map((o) => (
            <option key={o.id} value={o.id}>
              {labelOrganizacion(o)}
            </option>
          ))
        : null}
    </select>
  );
}

export default function AdminAccesosPage() {
  const { token, usuario } = useAuth();
  const rol = usuario?.rol;
  const esSuperadmin = Boolean(rol && isSuperadmin(rol));
  const esPartner = Boolean(rol && isPartnerAdmin(rol));
  const conSelectorOrg = Boolean(rol && necesitaSelectorOrgAccesos(rol));

  const [organizaciones, setOrganizaciones] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [catalogo, setCatalogo] = useState<DashboardCatalogo[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [asignados, setAsignados] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAccesos, setLoadingAccesos] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !conSelectorOrg || !rol) return;
    adminClientesApi
      .list(token)
      .then((list) => {
        const scoped = organizacionesParaAccesos(list, rol);
        setOrganizaciones(scoped);
        if (scoped.length > 0) setClienteId(scoped[0].id);
      })
      .catch(() => setOrganizaciones([]));
  }, [token, conSelectorOrg, rol]);

  const loadOrgData = useCallback(async () => {
    if (!token) return;
    if (conSelectorOrg && !clienteId) {
      setUsuarios([]);
      setCatalogo([]);
      setSelectedUserId("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [res, cat] = await Promise.all([
        adminUsuariosApi.list(token, {
          page: 1,
          limit: 500,
          cliente_id: conSelectorOrg ? clienteId : undefined,
        }),
        adminAccesosApi.dashboardsDisponibles(
          token,
          conSelectorOrg ? clienteId : undefined,
        ),
      ]);
      const list = res.usuarios ?? [];
      setUsuarios(list);
      setCatalogo(Array.isArray(cat) ? cat : []);
      setSelectedUserId(list.length > 0 ? list[0].id : "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setUsuarios([]);
      setCatalogo([]);
      setSelectedUserId("");
    } finally {
      setLoading(false);
    }
  }, [token, conSelectorOrg, clienteId]);

  useEffect(() => {
    loadOrgData();
  }, [loadOrgData]);

  useEffect(() => {
    if (!token || !selectedUserId) return;
    setLoadingAccesos(true);
    adminAccesosApi
      .porUsuario(token, selectedUserId)
      .then(setAsignados)
      .catch(() => setAsignados([]))
      .finally(() => setLoadingAccesos(false));
  }, [token, selectedUserId]);

  const selectedUser = useMemo(
    () => usuarios.find((u) => u.id === selectedUserId),
    [usuarios, selectedUserId],
  );

  const orgActual = organizaciones.find((o) => o.id === clienteId);
  const asignadosCount = asignados.length;
  const totalCount = catalogo.length;

  async function toggleDashboard(dashboardId: string) {
    if (!token || !selectedUserId || togglingId) return;
    setError(null);
    setTogglingId(dashboardId);
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
    } finally {
      setTogglingId(null);
    }
  }

  if (loading) {
    return <p className="ui-muted">Cargando accesos…</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="ui-page-title">Accesos a dashboards</h1>
        <p className="ui-page-desc">
          {esSuperadmin
            ? "Elige la organización (Chilsmart, partner o cliente), luego asigna dashboards a cada usuario."
            : esPartner
              ? "Solo puedes gestionar usuarios de MGI y empresas a tu cargo."
              : "Asigna dashboards contratados de tu empresa a usuarios finales"}
        </p>
      </header>

      {conSelectorOrg && rol ? (
        <section className="ui-card">
          <h2 className="ui-section-title">Organización</h2>
          <p className="ui-muted mt-1">
            {esSuperadmin
              ? "Usuarios y dashboards disponibles dependen de la org seleccionada."
              : "Selecciona MGI o una empresa cliente bajo tu partner."}
          </p>
          <div className="mt-4">
            <label className="ui-label" htmlFor="accesos-org">
              Organización
            </label>
            <SelectorOrganizacionAccesos
              id="accesos-org"
              rol={rol}
              organizaciones={organizaciones}
              value={clienteId}
              onChange={setClienteId}
            />
            {orgActual ? (
              <p className="ui-meta mt-2">
                {orgActual.slugUrl}
                {orgActual.tipo ? ` · ${orgActual.tipo}` : ""}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {esSuperadmin ? (
        <p className="ui-alert-info">
          Los dashboards deben estar contratados para la org en{" "}
          <Link
            href="/admin/clientes"
            className="font-semibold underline underline-offset-2"
          >
            Organizaciones
          </Link>
          . Luego asígnalos aquí usuario por usuario.
        </p>
      ) : esPartner ? (
        <p className="ui-alert-info">
          Solo ves organizaciones y usuarios de tu partner. Chilsmart configura
          qué dashboards tiene cada empresa.
        </p>
      ) : null}

      {error ? <p className="ui-alert-error">{error}</p> : null}

      {conSelectorOrg && !clienteId ? (
        <p className="ui-muted rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center">
          Selecciona una organización para gestionar accesos.
        </p>
      ) : usuarios.length === 0 ? (
        <p className="ui-muted rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center">
          No hay usuarios en{" "}
          {conSelectorOrg ? orgActual?.nombreEmpresa ?? "esta organización" : "tu empresa"}
          . Crea usuarios en{" "}
          <Link href="/admin/usuarios" className="font-semibold text-zinc-900 underline">
            Usuarios
          </Link>{" "}
          antes de asignar accesos.
        </p>
      ) : (
        <>
          <section className="ui-card">
            <h2 className="ui-section-title">Seleccionar usuario</h2>
            <p className="ui-muted mt-1">
              Usuarios de{" "}
              <span className="font-medium text-zinc-800">
                {conSelectorOrg ? orgActual?.nombreEmpresa : "tu empresa"}
              </span>
              . Solo se listan los de la organización elegida.
            </p>
            <div className="mt-4">
              <label className="ui-label" htmlFor="accesos-usuario">
                Usuario
              </label>
              <select
                id="accesos-usuario"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="ui-select mt-1.5 w-full sm:max-w-md"
              >
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombreCompleto} ({u.email})
                    {u.rol ? ` · ${u.rol}` : ""}
                  </option>
                ))}
              </select>
            </div>
            {selectedUser ? (
              <p className="ui-meta mt-3">
                Editando accesos de{" "}
                <span className="font-medium text-zinc-700">
                  {selectedUser.nombreCompleto}
                </span>
                {selectedUser.nombreEmpresa
                  ? ` · ${selectedUser.nombreEmpresa}`
                  : ""}
              </p>
            ) : null}
          </section>

          <section className="ui-card">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="ui-section-title">Dashboards disponibles</h2>
                <p className="ui-muted mt-1">
                  Dashboards contratados para{" "}
                  {orgActual?.nombreEmpresa ?? "esta organización"}.
                </p>
              </div>
              {!loadingAccesos && catalogo.length > 0 ? (
                <span className="inline-flex w-fit rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-800">
                  {asignadosCount} / {totalCount} asignados
                </span>
              ) : null}
            </div>

            {catalogo.length === 0 ? (
              <p className="ui-muted mt-5 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center">
                {esSuperadmin ? (
                  <>
                    No hay dashboards para esta organización. Contráctalos en{" "}
                    <Link
                      href="/admin/clientes"
                      className="font-semibold text-zinc-900 underline"
                    >
                      Organizaciones
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    No hay dashboards para esta empresa. Chilsmart debe
                    asignarlos antes de dar accesos aquí.
                  </>
                )}
              </p>
            ) : loadingAccesos ? (
              <p className="ui-muted mt-5 py-8 text-center">
                Cargando accesos del usuario…
              </p>
            ) : (
              <ul className="mt-5 space-y-2">
                {catalogo.map((d) => {
                  const checked = asignados.includes(d.id);
                  const busy = togglingId === d.id;
                  return (
                    <li key={d.id}>
                      <label
                        className={`flex cursor-pointer flex-col gap-3 rounded-xl border px-4 py-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                          checked
                            ? "border-blue-300 bg-blue-50"
                            : "border-zinc-200 bg-zinc-50 hover:bg-white"
                        } ${busy ? "opacity-60" : ""}`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block font-medium text-zinc-900">
                            {d.nombre}
                          </span>
                          {d.orden != null ? (
                            <span className="ui-meta mt-0.5 block">
                              Orden {d.orden}
                            </span>
                          ) : null}
                        </div>
                        <span className="flex items-center gap-2.5 self-start sm:self-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={busy}
                            onChange={() => toggleDashboard(d.id)}
                            className="h-4 w-4 rounded border-zinc-400 text-blue-700 focus:ring-blue-600 disabled:cursor-wait"
                            aria-label={`Asignar ${d.nombre}`}
                          />
                          <span
                            className={`text-sm font-medium ${
                              checked ? "text-blue-900" : "text-zinc-600"
                            }`}
                          >
                            {busy
                              ? "Guardando…"
                              : checked
                                ? "Asignado"
                                : "Sin acceso"}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
