import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { roleLabel, type Role, type User } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Field } from "../components/AuthForm";
import { PasswordHint } from "../components/PasswordHint";

const PAGE_SIZES = [10, 25, 50] as const;

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("ALUMNO");
  const [phone, setPhone] = useState("");
  const [creating, setCreating] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const load = useCallback(async () => {
    const data = await api.listUsers({
      q: query || undefined,
      page,
      size: pageSize,
      enabled: statusFilter === "all" ? undefined : statusFilter === "active",
      role: roleFilter === "all" ? undefined : roleFilter,
    });
    setUsers(data.items);
    setTotal(data.total);
    setTotalPages(data.totalPages);
  }, [query, page, pageSize, statusFilter, roleFilter]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setError(null);
      setLoading(true);
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar los usuarios");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setCreating(true);
    try {
      await api.createUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        role,
        phone: phone.trim() || null,
      });
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setRole("ALUMNO");
      setPhone("");
      setNotice("Usuario creado");
      setSearchInput("");
      setQuery("");
      setStatusFilter("all");
      setRoleFilter("all");
      setPage(0);
      const data = await api.listUsers({ page: 0, size: pageSize });
      setUsers(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el usuario");
    } finally {
      setCreating(false);
    }
  }

  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <>
      <section className="session-card">
        <p className="eyebrow">Administración</p>
        <h1>Usuarios</h1>
        <p className="lede">Altas rápidas y listado. Abrí la ficha para ver o editar el detalle completo.</p>
      </section>

      <form className="session-card" onSubmit={onCreate}>
        <h2>Nuevo usuario</h2>
        <p className="lede">
          Con esto alcanza para crear la cuenta. El resto (documento, domicilio, nacimiento) lo completa la persona
          desde Inicio o lo cargás vos en la ficha.
        </p>
        <div className="form-grid">
          <Field id="newFirstName" label="Nombre" value={firstName} onChange={setFirstName} autoComplete="off" />
          <Field id="newLastName" label="Apellido" value={lastName} onChange={setLastName} autoComplete="off" />
          <Field id="newEmail" label="Email" type="email" value={email} onChange={setEmail} autoComplete="off" />
          <Field
            id="newPassword"
            label="Contraseña"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          <Field
            id="newPhone"
            label="Celular"
            type="tel"
            value={phone}
            onChange={setPhone}
            autoComplete="off"
            required={false}
          />
          <label className="field" htmlFor="newRole">
            <span className="field-label">Rol</span>
            <select id="newRole" value={role} onChange={(event) => setRole(event.target.value as Role)}>
              <option value="ALUMNO">Alumno</option>
              <option value="PROFESOR">Profesor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>
        </div>
        <PasswordHint />
        <button className="btn-primary btn-inline" type="submit" disabled={creating}>
          {creating ? "Creando…" : "Crear"}
        </button>
      </form>

      <section className="session-card table-card">
        <div className="table-header">
          <h2>Listado</h2>
          <p className="table-meta">{total === 1 ? "1 usuario" : `${total} usuarios`}</p>
        </div>

        <div className="table-toolbar">
          <label className="field table-search" htmlFor="userSearch">
            <span className="field-label">Buscar</span>
            <input
              id="userSearch"
              type="search"
              placeholder="Nombre, email o celular"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="field" htmlFor="statusFilter">
            <span className="field-label">Estado</span>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as "all" | "active" | "inactive");
                setPage(0);
              }}
            >
              <option value="all">Todos</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </label>
          <label className="field" htmlFor="roleFilter">
            <span className="field-label">Rol</span>
            <select
              id="roleFilter"
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value as "all" | Role);
                setPage(0);
              }}
            >
              <option value="all">Todos</option>
              <option value="ALUMNO">Alumno</option>
              <option value="USER">Alumno (anterior)</option>
              <option value="PROFESOR">Profesor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>
          <label className="field" htmlFor="pageSize">
            <span className="field-label">Por página</span>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number]);
                setPage(0);
              }}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <p className="alert">{error}</p> : null}
        {notice ? <p className="alert ok">{notice}</p> : null}
        {loading ? (
          <p className="lede">Cargando…</p>
        ) : users.length === 0 ? (
          <p className="lede">No hay usuarios con esos criterios.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Apellido</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Celular</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Último acceso</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const self = user.id === me?.id;
                    return (
                      <tr key={user.id}>
                        <td>{user.lastName}</td>
                        <td>{user.firstName}</td>
                        <td>{user.email}</td>
                        <td>{user.phone || "—"}</td>
                        <td>{roleLabel(user.role)}</td>
                        <td>
                          <span className={user.enabled === false ? "pill off" : "pill on"}>
                            {user.enabled === false ? "Inactivo" : "Activo"}
                          </span>
                        </td>
                        <td>{formatDate(user.lastLoginAt)}</td>
                        <td className="actions">
                          <Link className="text-btn" to={`/app/users/${user.id}`}>
                            Ver
                          </Link>
                          {self ? <span className="hint-inline">Vos</span> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="table-pagination">
              <p className="table-meta">
                {from}–{to} de {total}
              </p>
              <div className="pager-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={page <= 0}
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                >
                  Anterior
                </button>
                <span className="table-meta">
                  Página {page + 1} de {Math.max(totalPages, 1)}
                </span>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
