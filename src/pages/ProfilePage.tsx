import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { displayName, emptyProfile, homePath, isStudent, profileFromUser, profilePayload } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Field } from "../components/AuthForm";
import { BodyFields, CoachFields, ProfileFields } from "../components/ProfileFields";

export function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profile, setProfile] = useState(emptyProfile);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
    setNotice(null);
    setSaving(true);
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...profilePayload(profile),
      });
      setNotice("Perfil actualizado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los datos");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="session-card profile-hero">
        <Link className="text-btn" to={user ? homePath(user.role) : "/app"}>
          ← Inicio
        </Link>
        <div className="profile-hero-row">
          <span className="avatar xl" aria-hidden>
            {(user.firstName?.[0] ?? "").toUpperCase()}
            {(user.lastName?.[0] ?? "").toUpperCase()}
          </span>
          <div>
            <p className="eyebrow">Perfil</p>
            <h1>{displayName(user)}</h1>
            <p className="lede">{user.email}</p>
          </div>
        </div>
      </section>

      <form className="session-card" onSubmit={onSave}>
        <h2>Datos personales</h2>
        <p className="lede">Estos datos son tuyos. El email se gestiona con el administrador si necesitás cambiarlo.</p>
        {error ? <p className="alert">{error}</p> : null}
        {notice ? <p className="alert ok">{notice}</p> : null}
        <div className="form-grid">
          <Field
            id="profileFirstName"
            label="Nombre"
            value={firstName}
            onChange={setFirstName}
            autoComplete="given-name"
          />
          <Field
            id="profileLastName"
            label="Apellido"
            value={lastName}
            onChange={setLastName}
            autoComplete="family-name"
          />
        </div>
        <p className="profile-kicker lede">Contacto y domicilio</p>
        <ProfileFields idPrefix="profile" values={profile} onChange={setProfile} />
        {isStudent(user.role) ? <BodyFields idPrefix="profile" values={profile} onChange={setProfile} /> : null}
        {user.role === "PROFESOR" ? <CoachFields idPrefix="profile" values={profile} onChange={setProfile} /> : null}
        <div className="form-actions">
          <button className="btn-primary btn-inline" type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
          <Link className="btn-ghost" to="/app/account">
            Ir a seguridad
          </Link>
        </div>
      </form>
    </>
  );
}
