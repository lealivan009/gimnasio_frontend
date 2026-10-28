import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AuthForm, Field } from "../components/AuthForm";
import { AuthLayout } from "../components/AuthLayout";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const success =
    (location.state as { resetOk?: boolean } | null)?.resetOk
      ? "Contraseña actualizada. Ya podés iniciar sesión."
      : null;
  const [submitting, setSubmitting] = useState(false);
  const [allowPublicRegistration, setAllowPublicRegistration] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getPublicSettings()
      .then((settings) => {
        if (!cancelled) {
          setAllowPublicRegistration(settings.allowPublicRegistration);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAllowPublicRegistration(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <AuthForm
        title="Iniciar sesión"
        subtitle="Ingresá con el email y la contraseña de tu cuenta."
        error={error}
        success={success}
        submitting={submitting}
        submitLabel="Entrar"
        onSubmit={onSubmit}
        footer={
          allowPublicRegistration ? (
            <>
              ¿No tenés cuenta? <Link to="/register">Crear una</Link>
            </>
          ) : allowPublicRegistration === false ? (
            <>El registro está cerrado. Pedile a un administrador que cree tu cuenta.</>
          ) : null
        }
      >
        <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
        <Field
          id="password"
          label="Contraseña"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          extra={
            <span className="field-label-actions">
              <Link className="text-btn" to="/forgot-password">
                Olvidé mi contraseña
              </Link>
              <button type="button" className="text-btn" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </span>
          }
        />
      </AuthForm>
    </AuthLayout>
  );
}
