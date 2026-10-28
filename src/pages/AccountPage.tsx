import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { homePath, roleLabel } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Field } from "../components/AuthForm";
import { PasswordHint } from "../components/PasswordHint";

export function AccountPage() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) {
    return null;
  }

  async function onChangePassword(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden");
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      navigate("/login", { replace: true, state: { resetOk: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña");
      setSaving(false);
    }
  }

  return (
    <>
      <section className="session-card">
        <Link className="text-btn" to={homePath(user.role)}>
          ← Inicio
        </Link>
        <p className="eyebrow">Cuenta</p>
        <h1>Seguridad</h1>
        <p className="lede">Protegé tu acceso. Al cambiar la contraseña se cierran todas las sesiones.</p>
        <dl className="meta">
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
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
        </dl>
      </section>

      <form className="session-card" onSubmit={onChangePassword}>
        <h2>Cambiar contraseña</h2>
        <p className="lede">Usá una contraseña distinta a la actual. Después vas a tener que volver a iniciar sesión.</p>
        {error ? <p className="alert">{error}</p> : null}
        <Field
          id="currentPassword"
          label="Contraseña actual"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          value={currentPassword}
          onChange={setCurrentPassword}
          extra={
            <button type="button" className="text-btn" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          }
        />
        <Field
          id="newPassword"
          label="Nueva contraseña"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={newPassword}
          onChange={setNewPassword}
        />
        <PasswordHint />
        <Field
          id="confirmPassword"
          label="Confirmar nueva contraseña"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
        <button className="btn-primary btn-inline" type="submit" disabled={saving}>
          {saving ? "Actualizando…" : "Actualizar contraseña"}
        </button>
      </form>

      <section className="session-card">
        <h2>Más opciones</h2>
        <div className="settings-list">
          <div className="settings-row">
            <div>
              <strong>Datos personales</strong>
              <p>Nombre, documento, celular y domicilio.</p>
            </div>
            <Link className="btn-ghost" to="/app/profile">
              Editar perfil
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
