"use client";

import { useAuth } from "@/context/AuthContext";
import { adminClientesApi, adminUsuariosApi, ApiClientError, isSuperadmin } from "@/lib/api";
import {
  labelOrganizacion,
  necesitaSelectorOrgUsuarios,
  rolesPermitidosCrear,
  type RolCrearUsuario,
} from "@/lib/orgScope";
import type { Cliente, UsuarioAdmin } from "@/lib/types";
import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react";

const PAGE_SIZES = [10, 20, 50] as const;

function formatRol(rol: string) {
  if (rol === "superadmin") return "Superadmin";
  if (rol === "admin_partner") return "Partner";
  if (rol === "admin_cliente") return "Administrador";
  if (rol === "lector") return "Lector";
  return rol;
}

function EstadoBadge({ activo }: { activo: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        activo
          ? "bg-green-100 text-green-800"
          : "bg-zinc-200 text-zinc-700 line-through"
      }`}
    >
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "default",
  disabled,
  fullWidth,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const base =
    "cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";
  const width = fullWidth ? "w-full text-center" : "";
  const styles =
    variant === "danger"
      ? "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
      : "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${width} ${styles}`}
    >
      {children}
    </button>
  );
}

function UsuarioAcciones({
  u,
  isSelf,
  layout,
  onToggleActivo,
  onReset,
  onDelete,
}: {
  u: UsuarioAdmin;
  isSelf: boolean;
  layout: "row" | "stack";
  onToggleActivo: () => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  const stack = layout === "stack";

  return (
    <div
      className={
        stack
          ? "grid grid-cols-1 gap-2 sm:grid-cols-2"
          : "flex flex-wrap gap-1"
      }
    >
      <ActionButton onClick={onToggleActivo} fullWidth={stack}>
        {u.activo ? "Desactivar" : "Activar"}
      </ActionButton>
      <ActionButton onClick={onReset} fullWidth={stack}>
        Restablecer clave
      </ActionButton>
      <ActionButton
        variant="danger"
        disabled={isSelf}
        onClick={onDelete}
        fullWidth={stack}
      >
        Eliminar
      </ActionButton>
    </div>
  );
}

function ListaVacia({ mensaje }: { mensaje: string }) {
  return (
    <p className="ui-muted rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center">
      {mensaje}
    </p>
  );
}

export default function AdminUsuariosPage() {
  const { token, usuario } = useAuth();
  const esSuperadmin = Boolean(usuario && isSuperadmin(usuario.rol));
  const conSelectorOrg = Boolean(
    usuario && necesitaSelectorOrgUsuarios(usuario.rol),
  );

  const [organizaciones, setOrganizaciones] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<RolCrearUsuario>("lector");

  const [resetTarget, setResetTarget] = useState<UsuarioAdmin | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UsuarioAdmin | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token || !conSelectorOrg) return;
    adminClientesApi
      .list(token)
      .then((list) => {
        setOrganizaciones(list);
        if (list.length > 0) {
          const first = list[0];
          setClienteId(first.id);
          setRol(rolesPermitidosCrear(first.tipo)[0]);
        }
      })
      .catch(() => setOrganizaciones([]));
  }, [token, conSelectorOrg]);

  const orgActual = organizaciones.find((o) => o.id === clienteId);
  const rolesCrear = rolesPermitidosCrear(orgActual?.tipo);

  function seleccionarOrganizacion(id: string) {
    setClienteId(id);
    const org = organizaciones.find((o) => o.id === id);
    const permitidos = rolesPermitidosCrear(org?.tipo);
    setRol((actual) => (permitidos.includes(actual) ? actual : permitidos[0]));
  }

  const load = useCallback(() => {
    if (!token) return;
    if (conSelectorOrg && !clienteId) return;
    setLoading(true);
    setError(null);
    adminUsuariosApi
      .list(token, {
        page,
        limit,
        cliente_id: conSelectorOrg ? clienteId : undefined,
      })
      .then((res) => {
        setUsuarios(res.usuarios ?? []);
        setTotal(res.total ?? 0);
        setTotalPages(Math.max(1, res.totalPages ?? 1));
        if (res.page != null && res.page !== page) setPage(res.page);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [token, page, limit, conSelectorOrg, clienteId]);

  useEffect(() => {
    setPage(1);
  }, [clienteId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (conSelectorOrg && !clienteId) {
      setError("Selecciona una organización");
      return;
    }
    setError(null);
    try {
      await adminUsuariosApi.create(token, {
        email,
        password,
        nombre_completo: nombre,
        rol,
        ...(conSelectorOrg ? { cliente_id: clienteId } : {}),
      });
      setShowForm(false);
      setEmail("");
      setPassword("");
      setNombre("");
      setRol("lector");
      if (page === 1) load();
      else setPage(1);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Error al crear");
    }
  }

  async function toggleActivo(u: UsuarioAdmin) {
    if (!token) return;
    setError(null);
    try {
      await adminUsuariosApi.update(token, u.id, { activo: !u.activo });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Error");
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!token || !resetTarget) return;
    setResetting(true);
    setError(null);
    try {
      await adminUsuariosApi.resetPassword(token, resetTarget.id, newPassword);
      setResetTarget(null);
      setNewPassword("");
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Error al restablecer",
      );
    } finally {
      setResetting(false);
    }
  }

  async function handleDelete() {
    if (!token || !deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await adminUsuariosApi.remove(token, deleteTarget.id);
      setDeleteTarget(null);
      if ((usuarios?.length ?? 0) === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);
  const list = usuarios ?? [];
  const colSpan = conSelectorOrg ? 6 : 5;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="ui-page-title">Usuarios</h1>
          <p className="ui-page-desc">
            {conSelectorOrg
              ? esSuperadmin
                ? "Gestiona usuarios por organización."
                : "Usuarios de tu partner y empresas a tu cargo."
              : "Gestión de usuarios de tu empresa"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          disabled={conSelectorOrg && !clienteId}
          className="ui-btn-primary w-full sm:w-auto"
        >
          {showForm ? "Cancelar" : "Nuevo usuario"}
        </button>
      </header>

      {conSelectorOrg ? (
        <section className="ui-card">
          <h2 className="ui-section-title">Organización</h2>
          <p className="ui-muted mt-1">
            Elige la organización cuyos usuarios quieres ver o crear.
          </p>
          <div className="mt-4">
            <label className="ui-label" htmlFor="usuarios-org">
              Organización
            </label>
            <select
              id="usuarios-org"
              value={clienteId}
              onChange={(e) => seleccionarOrganizacion(e.target.value)}
              className="ui-select mt-1.5 w-full sm:max-w-md"
            >
              {organizaciones.length === 0 ? (
                <option value="">Sin organizaciones</option>
              ) : (
                organizaciones.map((o) => (
                  <option key={o.id} value={o.id}>
                    {labelOrganizacion(o)}
                  </option>
                ))
              )}
            </select>
            {orgActual ? (
              <p className="ui-meta mt-2">Slug: {orgActual.slugUrl}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {error ? <p className="ui-alert-error">{error}</p> : null}

      {showForm ? (
        <form
          onSubmit={handleCreate}
          className="ui-card grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className="ui-label" htmlFor="new-email">
              Email
            </label>
            <input
              id="new-email"
              placeholder="usuario@empresa.com"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ui-input mt-1.5 w-full"
            />
          </div>
          <div>
            <label className="ui-label" htmlFor="new-password">
              Contraseña
            </label>
            <input
              id="new-password"
              placeholder="Contraseña inicial"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ui-input mt-1.5 w-full"
            />
          </div>
          <div>
            <label className="ui-label" htmlFor="new-rol">
              Rol
            </label>
            <select
              id="new-rol"
              value={rol}
              onChange={(e) => setRol(e.target.value as RolCrearUsuario)}
              className="ui-select mt-1.5 w-full"
            >
              {rolesCrear.includes("lector") ? (
                <option value="lector">Lector</option>
              ) : null}
              {rolesCrear.includes("admin_cliente") ? (
                <option value="admin_cliente">Administrador</option>
              ) : null}
              {rolesCrear.includes("admin_partner") ? (
                <option value="admin_partner">Administrador partner</option>
              ) : null}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="ui-label" htmlFor="new-nombre">
              Nombre completo
            </label>
            <input
              id="new-nombre"
              placeholder="Nombre y apellido"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="ui-input mt-1.5 w-full"
            />
          </div>
          <button type="submit" className="ui-btn-accent w-full sm:col-span-2">
            Crear usuario
          </button>
        </form>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        {/* Mobile: tarjetas */}
        <div className="space-y-3 p-3 md:hidden">
          {loading ? (
            <p className="ui-muted py-8 text-center">Cargando usuarios…</p>
          ) : list.length === 0 ? (
            <ListaVacia mensaje="No hay usuarios en esta página" />
          ) : (
            list.map((u) => {
              const isSelf = u.id === usuario?.id;
              return (
                <article
                  key={u.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-zinc-900">
                        {u.nombreCompleto}
                      </h3>
                      <p className="mt-0.5 truncate text-sm text-zinc-600">
                        {u.email}
                      </p>
                      <p className="ui-meta mt-2">{formatRol(u.rol)}</p>
                      {conSelectorOrg && u.nombreEmpresa ? (
                        <p className="ui-meta mt-1">{u.nombreEmpresa}</p>
                      ) : null}
                    </div>
                    <EstadoBadge activo={u.activo} />
                  </div>
                  <div className="mt-4 border-t border-zinc-200 pt-4">
                    <UsuarioAcciones
                      u={u}
                      isSelf={isSelf}
                      layout="stack"
                      onToggleActivo={() => toggleActivo(u)}
                      onReset={() => setResetTarget(u)}
                      onDelete={() => setDeleteTarget(u)}
                    />
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Desktop: tabla */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                {conSelectorOrg ? (
                  <th className="px-4 py-3 font-semibold">Organización</th>
                ) : null}
                <th className="px-4 py-3 font-semibold">Rol</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="ui-muted px-4 py-8 text-center">
                    Cargando usuarios…
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="ui-muted px-4 py-8 text-center">
                    {esSuperadmin && !clienteId
                      ? "Selecciona una organización"
                      : conSelectorOrg && !clienteId
                        ? "Selecciona una organización"
                        : "No hay usuarios en esta página"}
                  </td>
                </tr>
              ) : (
                list.map((u) => {
                  const isSelf = u.id === usuario?.id;
                  return (
                    <tr key={u.id} className="border-b border-zinc-100">
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {u.nombreCompleto}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{u.email}</td>
                      {conSelectorOrg ? (
                        <td className="px-4 py-3 text-zinc-600">
                          {u.nombreEmpresa ?? orgActual?.nombreEmpresa ?? "—"}
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-zinc-800">
                        {formatRol(u.rol)}
                      </td>
                      <td className="px-4 py-3">
                        <EstadoBadge activo={u.activo} />
                      </td>
                      <td className="px-4 py-3">
                        <UsuarioAcciones
                          u={u}
                          isSelf={isSelf}
                          layout="row"
                          onToggleActivo={() => toggleActivo(u)}
                          onReset={() => setResetTarget(u)}
                          onDelete={() => setDeleteTarget(u)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-4 border-t border-zinc-200 px-3 py-4 sm:px-4">
          <p className="ui-muted text-center sm:text-left">
            {total === 0
              ? "Sin resultados"
              : `${rangeStart}–${rangeEnd} de ${total} usuarios`}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <label className="flex items-center justify-between gap-2 text-sm font-medium text-zinc-700 sm:justify-start">
              Por página
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="ui-select py-1.5"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="ui-btn-secondary py-2"
              >
                Anterior
              </button>
              <span className="text-center text-sm font-medium text-zinc-700">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="ui-btn-secondary py-2"
              >
                Siguiente
              </button>
            </div>
          </div>
        </footer>
      </section>

      {resetTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-labelledby="reset-title"
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-md sm:rounded-xl"
          >
            <h2 id="reset-title" className="text-lg font-semibold text-zinc-900">
              Restablecer contraseña
            </h2>
            <p className="ui-muted mt-1">
              Nueva contraseña para{" "}
              <span className="font-semibold text-zinc-900">
                {resetTarget.nombreCompleto}
              </span>
            </p>
            <form onSubmit={handleResetPassword} className="mt-4 space-y-4">
              <input
                type="password"
                required
                minLength={6}
                placeholder="Nueva contraseña"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="ui-input w-full"
                autoFocus
              />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setResetTarget(null);
                    setNewPassword("");
                  }}
                  className="ui-btn-secondary w-full sm:w-auto"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="ui-btn-accent w-full sm:w-auto"
                >
                  {resetting ? "Guardando…" : "Restablecer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-labelledby="delete-title"
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-md sm:rounded-xl"
          >
            <h2 id="delete-title" className="text-lg font-semibold text-zinc-900">
              Eliminar usuario
            </h2>
            <p className="ui-muted mt-2">
              ¿Eliminar a{" "}
              <span className="font-semibold text-zinc-900">
                {deleteTarget.nombreCompleto}
              </span>{" "}
              ({deleteTarget.email})? Se borrarán también sus accesos a
              dashboards. Esta acción no se puede deshacer.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="ui-btn-secondary w-full sm:w-auto"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="w-full rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60 sm:w-auto"
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
