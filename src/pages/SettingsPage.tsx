import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { AppSettings } from "../api/types";
import { Field } from "../components/AuthForm";

const defaults: AppSettings = {
  allowPublicRegistration: true,
  maxFailedAttempts: 5,
  lockDurationMinutes: 15,
  passwordMinLength: 8,
  passwordMaxLength: 72,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireDigit: true,
};

export function SettingsPage() {
  const [form, setForm] = useState<AppSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      try {
        const settings = await api.getSettings();
        if (!cancelled) {
          setForm(settings);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar la configuración");
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
  }, []);

  function patch<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const settings = await api.updateSettings({
        allowPublicRegistration: form.allowPublicRegistration,
        maxFailedAttempts: Number(form.maxFailedAttempts),
        lockDurationMinutes: Number(form.lockDurationMinutes),
        passwordMinLength: Number(form.passwordMinLength),
        passwordMaxLength: Number(form.passwordMaxLength),
        passwordRequireUppercase: form.passwordRequireUppercase,
        passwordRequireLowercase: form.passwordRequireLowercase,
        passwordRequireDigit: form.passwordRequireDigit,
      });
      setForm(settings);
      setNotice("Configuración guardada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="session-card">
        <p className="eyebrow">Administración</p>
        <h1>Configuración</h1>
        <p className="lede">Opciones generales de la aplicación. Afectan a todos los usuarios.</p>
      </section>

      {loading ? (
        <section className="session-card">
          <p className="lede">Cargando…</p>
        </section>
      ) : (
        <form className="session-card" onSubmit={onSave}>
          {error ? <p className="alert">{error}</p> : null}
          {notice ? <p className="alert ok">{notice}</p> : null}

          <h2>Acceso</h2>
          <div className="settings-list">
            <div className="settings-row">
              <div>
                <strong>Registro público</strong>
                <p>
                  Si está apagado, nadie puede crear cuenta desde /register. Solo un administrador puede dar de alta
                  usuarios.
                </p>
              </div>
              <button
                type="button"
                className={`toggle ${form.allowPublicRegistration ? "on" : "off"}`}
                aria-pressed={form.allowPublicRegistration}
                onClick={() => patch("allowPublicRegistration", !form.allowPublicRegistration)}
              >
                <span className="toggle-knob" />
                <span className="toggle-label">{form.allowPublicRegistration ? "On" : "Off"}</span>
              </button>
            </div>
          </div>

          <h2 className="settings-section-title">Bloqueo por intentos</h2>
          <p className="lede">Después de varios logins fallidos, la cuenta se bloquea un rato.</p>
          <div className="form-grid">
            <Field
              id="maxFailedAttempts"
              label="Reintentos fallidos"
              type="number"
              value={String(form.maxFailedAttempts)}
              onChange={(value) => patch("maxFailedAttempts", Number(value) || 0)}
              required
            />
            <Field
              id="lockDurationMinutes"
              label="Minutos de bloqueo"
              type="number"
              value={String(form.lockDurationMinutes)}
              onChange={(value) => patch("lockDurationMinutes", Number(value) || 0)}
              required
            />
          </div>

          <h2 className="settings-section-title">Política de contraseña</h2>
          <p className="lede">Se aplica al registrarse, al crear usuarios y al cambiar la clave.</p>
          <div className="form-grid">
            <Field
              id="passwordMinLength"
              label="Largo mínimo"
              type="number"
              value={String(form.passwordMinLength)}
              onChange={(value) => patch("passwordMinLength", Number(value) || 0)}
              required
            />
            <Field
              id="passwordMaxLength"
              label="Largo máximo"
              type="number"
              value={String(form.passwordMaxLength)}
              onChange={(value) => patch("passwordMaxLength", Number(value) || 0)}
              required
            />
          </div>
          <div className="settings-list">
            <div className="settings-row">
              <div>
                <strong>Exigir mayúscula</strong>
                <p>Al menos una letra A-Z.</p>
              </div>
              <button
                type="button"
                className={`toggle ${form.passwordRequireUppercase ? "on" : "off"}`}
                aria-pressed={form.passwordRequireUppercase}
                onClick={() => patch("passwordRequireUppercase", !form.passwordRequireUppercase)}
              >
                <span className="toggle-knob" />
                <span className="toggle-label">{form.passwordRequireUppercase ? "On" : "Off"}</span>
              </button>
            </div>
            <div className="settings-row">
              <div>
                <strong>Exigir minúscula</strong>
                <p>Al menos una letra a-z.</p>
              </div>
              <button
                type="button"
                className={`toggle ${form.passwordRequireLowercase ? "on" : "off"}`}
                aria-pressed={form.passwordRequireLowercase}
                onClick={() => patch("passwordRequireLowercase", !form.passwordRequireLowercase)}
              >
                <span className="toggle-knob" />
                <span className="toggle-label">{form.passwordRequireLowercase ? "On" : "Off"}</span>
              </button>
            </div>
            <div className="settings-row">
              <div>
                <strong>Exigir número</strong>
                <p>Al menos un dígito 0-9.</p>
              </div>
              <button
                type="button"
                className={`toggle ${form.passwordRequireDigit ? "on" : "off"}`}
                aria-pressed={form.passwordRequireDigit}
                onClick={() => patch("passwordRequireDigit", !form.passwordRequireDigit)}
              >
                <span className="toggle-knob" />
                <span className="toggle-label">{form.passwordRequireDigit ? "On" : "Off"}</span>
              </button>
            </div>
          </div>

          <button className="btn-primary btn-inline" type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar configuración"}
          </button>
        </form>
      )}
    </>
  );
}
