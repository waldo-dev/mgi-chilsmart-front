"use client";

import { useAuth } from "@/context/AuthContext";
import { adminUsuariosApi, ApiClientError, isAdmin } from "@/lib/api";
import type { UsuarioAdmin } from "@/lib/types";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function AdminUsuariosPage() {
  const { token, usuario } = useAuth();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<"lector" | "admin_cliente">("lector");

  useEffect(() => {
    if (usuario && !isAdmin(usuario.rol)) {
      router.replace("/dashboards");
    }
  }, [usuario, router]);

  function load() {
    if (!token) return;
    adminUsuariosApi
      .list(token)
      .then(setUsuarios)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [token]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    try {
      await adminUsuariosApi.create(token, {
        email,
        password,
        nombre_completo: nombre,
        rol,
      });
      setShowForm(false);
      setEmail("");
      setPassword("");
      setNombre("");
      setRol("lector");
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Error al crear");
    }
  }

  async function toggleActivo(u: UsuarioAdmin) {
    if (!token) return;
    try {
      await adminUsuariosApi.update(token, u.id, { activo: !u.activo });
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Error");
    }
  }

  if (loading) return <p className="text-zinc-500">Cargando usuarios…</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Usuarios</h1>
          <p className="text-sm text-zinc-500">Gestión de usuarios de tu empresa</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          {showForm ? "Cancelar" : "Nuevo usuario"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {showForm ? (
        <form
          onSubmit={handleCreate}
          className="mt-6 grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 sm:grid-cols-2"
        >
          <input
            placeholder="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
          <input
            placeholder="Contraseña"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
          <input
            placeholder="Nombre completo"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
          <select
            value={rol}
            onChange={(e) =>
              setRol(e.target.value as "lector" | "admin_cliente")
            }
            className="rounded-lg border border-zinc-300 px-3 py-2"
          >
            <option value="lector">Lector</option>
            <option value="admin_cliente">Admin cliente</option>
          </select>
          <button
            type="submit"
            className="sm:col-span-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Crear usuario
          </button>
        </form>
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-zinc-100">
                <td className="px-4 py-3">{u.nombreCompleto}</td>
                <td className="px-4 py-3 text-zinc-600">{u.email}</td>
                <td className="px-4 py-3">{u.rol}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      u.activo
                        ? "text-green-700"
                        : "text-zinc-400 line-through"
                    }
                  >
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleActivo(u)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {u.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
