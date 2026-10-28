import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import {
  displayName,
  emptyProfile,
  isStudent,
  roleLabel,
  profileFromUser,
  profilePayload,
  type Role,
  type User,
} from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Field } from "../components/AuthForm";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ProfileFields, BodyFields, CoachFields } from "../components/ProfileFields";

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  return new Date(value + "T00:00:00").toLocaleDateString("es-AR", {
    dateStyle: "medium",
  });
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profile, setProfile] = useState(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getUser(id!);
        if (cancelled) {
          return;
        }
        setUser(data);
        setFirstName(data.firstName ?? "");
        setLastName(data.lastName ?? "");
        setProfile(profileFromUser(data));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el usuario");
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const self = Boolean(user && me && user.id === me.id);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!user) {
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const next = await api.updateUser(user.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...profilePayload(profile),
      });
      setUser(next);
      setFirstName(next.firstName ?? "");
      setLastName(next.lastName ?? "");
      setProfile(profileFromUser(next));
      setNotice("Datos guardados");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los datos");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: () => Promise<User | void>, ok: string, goBack = false) {
    if (!user) {
      return;
    }
    setActing(true);
    setError(null);
    setNotice(null);
    try {
      const next = await action();
      if (goBack) {
        navigate("/app/users", { replace: true });
        return;
      }
      if (next) {
        setUser(next);
        setNotice(ok);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="boot inline">
        <div className="spinner" />
        <p>Cargando usuario…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <section className="session-card">
        <p className="eyebrow">Administración</p>
        <h1>Usuario</h1>
        <p className="alert">{error ?? "No se encontró el usuario"}</p>
        <Link className="text-btn" to="/app/users">
          Volver al listado
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="session-card">
        <div className="detail-top">
          <Link className="text-btn" to="/app/users">
            ← Usuarios
          </Link>
          {self ? <span className="hint-inline">Tu cuenta</span> : null}
        </div>
        <p className="eyebrow">Ficha</p>
        <h1>{displayName(user)}</h1>
        <p className="lede">{user.email}</p>
        <dl className="meta">
          <div>
            <dt>Rol</dt>
            <dd>{roleLabel(user.role)}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>
              <span className={user.enabled === false ? "pill off" : "pill on"}>
                {user.enabled === false ? "Inactivo" : "Activo"}
              </span>
            </dd>
          </div>
          <div>
            <dt>Último acceso</dt>
            <dd>{formatDateTime(user.lastLoginAt)}</dd>
          </div>
          <div>
            <dt>Alta</dt>
            <dd>{formatDateTime(user.createdAt)}</dd>
          </div>
          <div>
            <dt>Nacimiento</dt>
            <dd>{formatDate(user.birthDate)}</dd>
          </div>
          <div>
            <dt>Bloqueo</dt>
            <dd>{formatDateTime(user.lockedUntil)}</dd>
          </div>
        </dl>
      </section>

      {error ? <p className="alert">{error}</p> : null}
      {notice ? <p className="alert ok">{notice}</p> : null}

      <form className="session-card" onSubmit={onSave}>
        <h2>Datos personales</h2>
        <p className="lede">Podés completar o corregir la ficha desde acá. El email no se cambia.</p>
        <div className="form-grid">
          <Field id="detailFirstName" label="Nombre" value={firstName} onChange={setFirstName} autoComplete="off" />
          <Field id="detailLastName" label="Apellido" value={lastName} onChange={setLastName} autoComplete="off" />
        </div>
        <ProfileFields idPrefix="detail" values={profile} onChange={setProfile} />
        {isStudent(user.role) ? <BodyFields idPrefix="detail" values={profile} onChange={setProfile} /> : null}
        {user.role === "PROFESOR" ? <CoachFields idPrefix="detail" values={profile} onChange={setProfile} /> : null}
        <button className="btn-primary btn-inline" type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      <section className="session-card">
        <h2>Cuenta</h2>
        <p className="lede">Cambiar el rol o deshabilitar cierra las sesiones de esa persona.</p>

        <div className="settings-list">
          <div className="settings-row">
            <div>
              <strong>Rol</strong>
              <p>Alumno entrena. Profesor arma rutinas y turnos. Administrador, además, gestiona usuarios.</p>
            </div>
            <select
              id="detailRole"
              className="settings-control"
              value={user.role}
              disabled={self || acting}
              onChange={(event) => {
                const nextRole = event.target.value as Role;
                if (nextRole !== user.role) {
                  runAction(() => api.updateUser(user.id, { role: nextRole }), "Rol actualizado");
                }
              }}
            >
              {user.role === "USER" ? <option value="USER">Alumno</option> : null}
              <option value="ALUMNO">Alumno</option>
              <option value="PROFESOR">Profesor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          <div className="settings-row">
            <div>
              <strong>Estado</strong>
              <p>{user.enabled === false ? "Cuenta deshabilitada: no puede iniciar sesión." : "Cuenta activa."}</p>
            </div>
            <button
              type="button"
              className="btn-ghost settings-control"
              disabled={self || acting}
              onClick={() =>
                runAction(
                  () => api.updateUser(user.id, { enabled: user.enabled === false }),
                  user.enabled === false ? "Usuario habilitado" : "Usuario deshabilitado"
                )
              }
            >
              {user.enabled === false ? "Habilitar" : "Deshabilitar"}
            </button>
          </div>
        </div>

        <div className="danger-zone">
          <div>
            <strong>Eliminar usuario</strong>
            <p>Borrado lógico: la cuenta deja de usarse pero el registro se conserva.</p>
          </div>
          <button
            type="button"
            className="text-btn danger"
            disabled={self || acting}
            onClick={() => setConfirmDelete(true)}
          >
            Eliminar
          </button>
        </div>

        {self ? <p className="hint">No podés cambiar tu propio rol, deshabilitarte ni borrarte.</p> : null}
      </section>

      <ConfirmDialog
        open={confirmDelete}
        danger
        busy={acting}
        title="Eliminar usuario"
        description={
          <>
            Vas a eliminar la cuenta de <strong>{user.email}</strong>. No se borra de la base: queda
            deshabilitada y deja de aparecer en el listado, así se pueden mantener relaciones futuras.
          </>
        }
        confirmLabel="Eliminar"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          runAction(async () => {
            await api.deleteUser(user.id);
          }, "Usuario eliminado", true);
        }}
      />
    </>
  );
}
