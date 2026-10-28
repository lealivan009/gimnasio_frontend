import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { AuthForm, Field } from "../components/AuthForm";
import { AuthLayout } from "../components/AuthLayout";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const result = await api.forgotPassword(email.trim());
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el pedido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <AuthForm
        title="¿Olvidaste tu contraseña?"
        subtitle="Te mandamos un enlace al email para elegir una nueva."
        error={error}
        success={success}
        submitting={submitting}
        submitLabel="Enviar enlace"
        onSubmit={onSubmit}
        footer={
          <>
            <Link to="/login">Volver al inicio de sesión</Link>
          </>
        }
      >
        <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
      </AuthForm>
    </AuthLayout>
  );
}
