import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../api/client";
import { shiftIso, todayIso, type Occupancy, type StudentFollow } from "../api/gym";
import { isStudent, type User } from "../api/types";
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
  const [students, setStudents] = useState<StudentFollow[]>([]);
  const [pending, setPending] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void refreshGym();
    let cancelled = false;
    async function run() {
      const [nextOccupancy, nextStudents, nextPending] = await Promise.all([
        api.getOccupancy().catch(() => null),
        api.listStudentFollow().catch(() => [] as StudentFollow[]),
        api.listPending().catch(() => [] as User[]),
      ]);
      if (cancelled) {
        return;
      }
      setOccupancy(nextOccupancy);
      setStudents(nextStudents);
      setPending(nextPending);
      setLoading(false);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [refreshGym]);

  if (!user) {
    return null;
  }

  if (isStudent(user.role)) {
    return <Navigate to="/alumno/inicio" replace />;
  }

  const admin = user.role === "ADMIN";
  const score = profileScore(user);
  const incomplete = score < 100 && !admin;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const hours = gym?.hours ?? [];
  const open = hours.length > 0 ? isOpenNow(hours) : occupancy?.openNow;
  const today = todayIso();
  const soon = shiftIso(today, 14);
  const expiring = students
    .filter((student) => student.routineExpiration != null && student.routineExpiration >= today && student.routineExpiration <= soon)
    .sort((a, b) => (a.routineExpiration ?? "").localeCompare(b.routineExpiration ?? ""));
  const withoutRoutine = students.filter((student) => !student.activeRoutineTitle);

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

      {incomplete ? (
        <section className="session-card callout-card">
          <div>
            <h2>Completá tu perfil</h2>
            <p className="lede">Faltan datos de contacto o domicilio. Llevás un {score}% de la ficha.</p>
            <div className="progress-track" aria-hidden>
              <span className="progress-fill" style={{ width: `${score}%` }} />
            </div>
          </div>
          <Link className="btn-primary btn-inline" to="/app/profile/editar">
            Completar datos
          </Link>
        </section>
      ) : null}

      <section className="dash-metrics">
        <Link className="session-card dash-metric" to="/admin/alumnos">
          <p className="eyebrow">Adentro ahora</p>
          <strong>
            {occupancy?.currentOccupancy ?? 0}
            <span> / {occupancy?.maxCapacity ?? "—"}</span>
          </strong>
          <p>{open ? "Hay lugar en el piso." : "El ingreso está cerrado."}</p>
        </Link>
        <Link className="session-card dash-metric" to="/admin/alumnos">
          <p className="eyebrow">Alumnos</p>
          <strong>{loading ? "—" : students.length}</strong>
          <p>{withoutRoutine.length === 1 ? "1 sin rutina" : `${withoutRoutine.length} sin rutina`}</p>
        </Link>
        <Link className="session-card dash-metric" to="/admin/pendientes">
          <p className="eyebrow">Pendientes</p>
          <strong>{loading ? "—" : pending.length}</strong>
          <p>{pending.length === 0 ? "Nadie esperando aprobación." : "Cuentas para revisar."}</p>
        </Link>
        <Link className="session-card dash-metric" to="/admin/alumnos">
          <p className="eyebrow">Por vencer</p>
          <strong>{loading ? "—" : expiring.length}</strong>
          <p>Rutinas que vencen en 14 días.</p>
        </Link>
      </section>

    </>
  );
}
