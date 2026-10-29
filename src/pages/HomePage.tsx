import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../api/client";
import { displayName, isStaff, isStudent, roleLabel, type User } from "../api/types";
import type { Occupancy } from "../api/gym";
import { useAuth } from "../auth/AuthContext";
import { useGymBrand, useRefreshGymBrand } from "../auth/GymBrand";
import { HoursBoard } from "../components/HoursBoard";
import { isOpenNow, todayHoursText } from "../gym/hours";

function profileScore(user: User) {
  const fields = [
    user.firstName,
    user.lastName,
    user.phone,
    user.documentNumber,
    user.birthDate,
    user.street,
    user.city,
    user.province,
    user.postalCode,
  ];
  const filled = fields.filter((value) => Boolean(value && String(value).trim())).length;
  return Math.round((filled / fields.length) * 100);
}

export function HomePage() {
  const { user } = useAuth();
  const gym = useGymBrand();
  const refreshGym = useRefreshGymBrand();
  const [occupancy, setOccupancy] = useState<Occupancy | null>(null);

  useEffect(() => {
    void refreshGym();
    api.getOccupancy().then(setOccupancy).catch(() => setOccupancy(null));
  }, [refreshGym]);

  if (!user) {
    return null;
  }

  if (isStudent(user.role)) {
    return <Navigate to="/alumno/inicio" replace />;
  }

  const score = profileScore(user);
  const incomplete = score < 100;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const hours = gym?.hours ?? [];
  const open = hours.length > 0 ? isOpenNow(hours) : occupancy?.openNow;

  return (
    <>
      <section className="session-card dash-hero">
        <div>
          <p className="eyebrow">{gym?.name || "Gimnasio"}</p>
          <h1>
            {greeting}, {user.firstName}
          </h1>
          <p className="lede">{hours.length > 0 ? todayHoursText(hours) : "Horario del gimnasio."}</p>
          {gym?.address ? <p className="brand-address">{gym.address}</p> : null}
          {hours.length > 0 ? (
            <span className={open ? "status-pill" : "status-pill closed"}>
              <span className="status-dot" aria-hidden />
              {open ? "Abierto ahora" : "Cerrado ahora"}
            </span>
          ) : null}
        </div>
        <div>
          <p className="eyebrow">Horario</p>
          {hours.length > 0 ? <HoursBoard hours={hours} /> : <p className="lede">Todavía no hay un horario semanal.</p>}
        </div>
      </section>

      {occupancy ? (
        <section className="stat-grid">
          <article className="session-card stat-card">
            <p className="eyebrow">Adentro ahora</p>
            <strong>
              {occupancy.currentOccupancy}
              <span> / {occupancy.maxCapacity}</span>
            </strong>
            <p>{open ? "Hay lugar en el piso." : "El ingreso está cerrado en este horario."}</p>
          </article>
          <article className="session-card stat-card">
            <p className="eyebrow">Tu rol</p>
            <strong className="dash-role">{roleLabel(user.role)}</strong>
            <p>{displayName(user)}</p>
          </article>
        </section>
      ) : null}

      {incomplete ? (
        <section className="session-card callout-card">
          <div>
            <h2>Completá tu perfil</h2>
            <p className="lede">Faltan datos de contacto o domicilio. Llevás un {score}% de la ficha.</p>
            <div className="progress-track" aria-hidden>
              <span className="progress-fill" style={{ width: `${score}%` }} />
            </div>
          </div>
          <Link className="btn-primary btn-inline" to="/app/profile">
            Ir al perfil
          </Link>
        </section>
      ) : null}

      <section className="home-grid">
        <Link className="home-tile" to="/app/profile">
          <span className="home-tile-index">01</span>
          <strong>Mi perfil</strong>
          <p>Nombre, documento, celular y domicilio.</p>
        </Link>
        <Link className="home-tile" to="/app/account">
          <span className="home-tile-index">02</span>
          <strong>Cuenta y seguridad</strong>
          <p>Contraseña y estado de la cuenta.</p>
        </Link>
        {isStaff(user.role) ? (
          <Link className="home-tile" to="/admin/ejercicios">
            <span className="home-tile-index">03</span>
            <strong>Ejercicios</strong>
            <p>Catálogo con grupo muscular y video.</p>
          </Link>
        ) : null}
        {isStaff(user.role) ? (
          <Link className="home-tile" to="/admin/rutinas">
            <span className="home-tile-index">04</span>
            <strong>Rutinas</strong>
            <p>Armalas, duplicálas y asignálas.</p>
          </Link>
        ) : null}
        {isStaff(user.role) ? (
          <Link className="home-tile" to="/admin/horarios">
            <span className="home-tile-index">05</span>
            <strong>Plataforma</strong>
            <p>Nombre, portada, horarios y turnos.</p>
          </Link>
        ) : null}
        {isStaff(user.role) ? (
          <Link className="home-tile" to="/admin/alumnos">
            <span className="home-tile-index">06</span>
            <strong>Alumnos</strong>
            <p>Rutina activa, vencimiento y asistencia.</p>
          </Link>
        ) : null}
      </section>
    </>
  );
}
