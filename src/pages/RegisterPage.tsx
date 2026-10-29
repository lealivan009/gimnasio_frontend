import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { emptyProfile, profilePayload } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { AuthForm, Field } from "../components/AuthForm";
import { AuthLayout } from "../components/AuthLayout";
import { ProfileFields } from "../components/ProfileFields";
import { PasswordHint } from "../components/PasswordHint";

export function RegisterPage() {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState(emptyProfile);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(firstName.trim(), lastName.trim(), email.trim(), password, profilePayload(profile));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      {done ? (
        <AuthForm
          wide
          title="Cuenta creada"
          subtitle="Cuando el profesor o el administrador la apruebe, vas a poder entrar."
          onSubmit={(event) => event.preventDefault()}
          error={null}
          submitLabel="Listo"
          submitting={false}
          footer={<Link to="/login">Ir a iniciar sesión</Link>}
        >
          <p className="lede">Te avisamos en esta pantalla. No hace falta que vuelvas a registrarte.</p>
        </AuthForm>
      ) : (
      <AuthForm
        wide
        title="Crear cuenta"
        subtitle="La cuenta queda pendiente hasta que el profesor o el administrador la apruebe."
        error={error}
        submitting={submitting}
        submitLabel="Registrarme"
        onSubmit={onSubmit}
        footer={
          <>
            ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link>
          </>
        }
      >
        <div className="form-grid">
          <Field
            id="firstName"
            label="Nombre"
            autoComplete="given-name"
            value={firstName}
            onChange={setFirstName}
          />
          <Field
            id="lastName"
            label="Apellido"
            autoComplete="family-name"
            value={lastName}
            onChange={setLastName}
          />
        </div>
        <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
        <Field
          id="password"
          label="Contraseña"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          extra={
            <button type="button" className="text-btn" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          }
        />
        <PasswordHint />
        <p className="eyebrow profile-kicker">Datos personales</p>
        <ProfileFields idPrefix="register" values={profile} onChange={setProfile} />
      </AuthForm>
      )}
    </AuthLayout>
  );
}
