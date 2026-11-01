import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { emptyProfile, isStudent, profileFromUser, profilePayload } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Field } from "../components/AuthForm";
import { BodyFields, CoachFields, ProfileFields } from "../components/ProfileFields";

export function ProfileEditPage() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profile, setProfile] = useState(emptyProfile);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setProfile(profileFromUser(user));
  }, [user]);

  if (!user) {
    return null;
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...profilePayload(profile),
      });
      navigate("/app/profile", { replace: true, state: { notice: "Datos actualizados" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los datos");
      setSaving(false);
    }
  }

  return (
    <>
      <section className="session-card">
        <div className="page-toolbar">
          <h1>Editar datos</h1>
          <Link className="btn-ghost" to="/app/profile">
            Volver
          </Link>
        </div>
        <p className="lede">El email se cambia con el administrador.</p>
      </section>
      <form className="session-card" onSubmit={onSave}>
        {error ? <p className="alert">{error}</p> : null}
        <div className="form-grid">
          <Field id="profileFirstName" label="Nombre" value={firstName} onChange={setFirstName} autoComplete="given-name" />
          <Field id="profileLastName" label="Apellido" value={lastName} onChange={setLastName} autoComplete="family-name" />
        </div>
        <p className="profile-kicker lede">Contacto y domicilio</p>
        <ProfileFields idPrefix="profile" values={profile} onChange={setProfile} />
        {isStudent(user.role) ? <BodyFields idPrefix="profile" values={profile} onChange={setProfile} /> : null}
        {user.role === "PROFESOR" ? <CoachFields idPrefix="profile" values={profile} onChange={setProfile} /> : null}
        <div className="form-actions">
          <button className="btn-primary btn-inline" type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </>
  );
}
