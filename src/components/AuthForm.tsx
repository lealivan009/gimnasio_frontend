import type { FormEvent, ReactNode } from "react";

interface FieldProps {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  value: string;
  onChange: (value: string) => void;
  extra?: ReactNode;
  required?: boolean;
  max?: string;
  step?: string;
  min?: string;
}

export function Field({
  id,
  label,
  type = "text",
  autoComplete,
  value,
  onChange,
  extra,
  required = true,
  max,
  step,
  min,
}: FieldProps) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">
        {label}
        {extra}
      </span>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        max={max}
        min={min}
        step={step}
      />
    </label>
  );
}

interface AuthFormProps {
  title: string;
  subtitle: string;
  error: string | null;
  success?: string | null;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
  footer: ReactNode;
  wide?: boolean;
}

export function AuthForm({
  title,
  subtitle,
  error,
  success,
  submitting,
  submitLabel,
  onSubmit,
  children,
  footer,
  wide,
}: AuthFormProps) {
  return (
    <form className={wide ? "auth-card auth-wide" : "auth-card"} onSubmit={onSubmit} noValidate>
      <div className="auth-card-copy">
        <p className="eyebrow">Acceso</p>
        <h1>{title}</h1>
        <p className="lede">{subtitle}</p>
      </div>
      {error ? <p className="alert">{error}</p> : null}
      {success ? <p className="alert ok">{success}</p> : null}
      {children}
      <button className="btn-primary" type="submit" disabled={submitting}>
        {submitting ? "Procesando…" : submitLabel}
      </button>
      <div className="footer-links">{footer}</div>
    </form>
  );
}
