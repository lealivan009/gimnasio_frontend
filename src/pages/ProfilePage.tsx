import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { formatDate } from "../api/gym";
import { displayName, isStudent, profileFromUser, roleLabel } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Toast } from "../components/Toast";

function show(value: string | null | undefined) {
  const text = value?.trim();
  return text ? text : "—";
}

export function ProfilePage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { notice?: string } | null;
    if (!state?.notice) {
      return;
    }
    setNotice(state.notice);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  if (!user) {
    return null;
  }

  const profile = profileFromUser(user);
  const student = isStudent(user.role);

  return (
    <section className="session-card profile-hero">
      <Toast message={notice} onClose={() => setNotice(null)} />
      <div className="profile-hero-row">
        <span className="avatar xl" aria-hidden>
          {(user.firstName?.[0] ?? "").toUpperCase()}
          {(user.lastName?.[0] ?? "").toUpperCase()}
        </span>
        <div>
          <h1>{displayName(user)}</h1>
          <p className="lede">{user.email}</p>
          <p className="cell-note">{roleLabel(user.role)}</p>
        </div>
      </div>
      <div className="form-actions">
        <Link className="btn-primary btn-inline" to="/app/profile/editar">
          Editar datos
        </Link>
        <Link className="btn-ghost" to="/app/account">
          Cuenta y seguridad
        </Link>
      </div>

      <h2>Datos</h2>
      <dl className="profile-sheet">
        <div>
          <dt>Nombre</dt>
          <dd>{show(user.firstName)}</dd>
        </div>
        <div>
          <dt>Apellido</dt>
          <dd>{show(user.lastName)}</dd>
        </div>
        <div>
          <dt>DNI</dt>
          <dd>{show(profile.documentNumber)}</dd>
        </div>
        <div>
          <dt>Celular</dt>
          <dd>{show(profile.phone)}</dd>
        </div>
        <div>
          <dt>Nacimiento</dt>
          <dd>{profile.birthDate ? formatDate(profile.birthDate) : "—"}</dd>
        </div>
        <div className="is-wide">
          <dt>Domicilio</dt>
          <dd>
            {show(
              [profile.street, profile.city, profile.province, profile.postalCode].filter((part) => part.trim()).join(", ")
            )}
          </dd>
        </div>
      </dl>

      {student ? (
        <>
          <h2>Medidas</h2>
          <dl className="profile-sheet">
            <div>
              <dt>Altura</dt>
              <dd>{profile.heightCm ? `${profile.heightCm} cm` : "—"}</dd>
            </div>
            <div>
              <dt>Peso</dt>
              <dd>{profile.weightKg ? `${profile.weightKg} kg` : "—"}</dd>
            </div>
            <div className="is-wide">
              <dt>Observaciones</dt>
              <dd>{show(profile.medicalNotes)}</dd>
            </div>
          </dl>
        </>
      ) : null}

      {user.role === "PROFESOR" ? (
        <>
          <h2>Profesional</h2>
          <dl className="profile-sheet">
            <div className="is-wide">
              <dt>Especialidades</dt>
              <dd>{show(profile.specialties)}</dd>
            </div>
            <div className="is-wide">
              <dt>Biografía</dt>
              <dd>{show(profile.biography)}</dd>
            </div>
            <div>
              <dt>Redes</dt>
              <dd>{show(profile.socialLinks)}</dd>
            </div>
            <div>
              <dt>Certificaciones</dt>
              <dd>{show(profile.certifications)}</dd>
            </div>
          </dl>
        </>
      ) : null}
    </section>
  );
}
