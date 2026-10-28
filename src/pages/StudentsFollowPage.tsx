import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { formatDate, todayIso, type Attendance, type StudentFollow } from "../api/gym";

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export function StudentsFollowPage() {
  const [students, setStudents] = useState<StudentFollow[]>([]);
  const [inside, setInside] = useState<Attendance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const [data, present] = await Promise.all([api.listStudentFollow(), api.listInside()]);
    setStudents(data);
    setInside(present);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const [data, present] = await Promise.all([api.listStudentFollow(), api.listInside()]);
        if (!cancelled) {
          setStudents(data);
          setInside(present);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el seguimiento");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function mark(studentId: string, action: "in" | "out") {
    setBusyId(studentId);
    setError(null);
    setNotice(null);
    try {
      if (action === "in") {
        await api.staffCheckIn(studentId);
        setNotice("Presente registrado");
      } else {
        await api.staffCheckOut(studentId);
        setNotice("Salida registrada");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la asistencia");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <section className="session-card">
        <p className="eyebrow">Seguimiento</p>
        <h1>Alumnos</h1>
        <p className="lede">
          Marcá el presente cuando el alumno entra y la salida cuando se va. Así ves cuánta gente está en el gimnasio.
        </p>
        {notice ? <p className="alert ok">{notice}</p> : null}
      </section>
      <section className="session-card">
        <h2>En el gimnasio ahora</h2>
        <p className="occupancy-figure">{inside.length}</p>
        {inside.length === 0 ? (
          <p className="lede">No hay alumnos adentro.</p>
        ) : (
          <ul className="plain-list">
            {inside.map((person) => (
              <li key={person.id}>{person.studentName}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="session-card table-card">
        {error ? <p className="alert">{error}</p> : null}
        {loading ? (
          <p className="lede">Cargando…</p>
        ) : students.length === 0 ? (
          <p className="lede">Todavía no hay alumnos.</p>
        ) : (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Rutina</th>
                  <th>Vigencia</th>
                  <th>Último ingreso</th>
                  <th>Asistencias (30 días)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const isInside = inside.some((person) => person.studentId === student.id);
                  return (
                  <tr key={student.id}>
                    <td>
                      <strong>
                        {student.lastName}, {student.firstName}
                      </strong>
                      <p className="cell-note">{student.email}</p>
                    </td>
                    <td>
                      {student.activeRoutineTitle ? (
                        <>
                          {student.activeRoutineTitle}
                          {student.routineCustom ? <span className="pill custom">Personalizada por el alumno</span> : null}
                          {student.routineStartDate && student.routineStartDate > todayIso() ? (
                            <span className="pill on">Empieza el {formatDate(student.routineStartDate)}</span>
                          ) : null}
                        </>
                      ) : (
                        "Sin rutina asignada"
                      )}
                    </td>
                    <td>
                      {student.activeRoutineTitle
                        ? `${formatDate(student.routineStartDate)}${
                            student.routineExpiration ? ` – ${formatDate(student.routineExpiration)}` : " · sin vencimiento"
                          }`
                        : "—"}
                    </td>
                    <td>{formatDateTime(student.lastCheckIn)}</td>
                    <td>{student.attendanceLast30Days}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className={isInside ? "btn-ghost" : "btn-primary btn-inline"}
                        disabled={busyId === student.id}
                        onClick={() => mark(student.id, isInside ? "out" : "in")}
                      >
                        {isInside ? "Marcar salida" : "Dar presente"}
                      </button>
                      <Link className="text-btn" to={`/admin/progreso?alumno=${student.id}`}>
                        Ver progreso
                      </Link>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
