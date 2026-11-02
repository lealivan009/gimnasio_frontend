import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { formatDate, todayIso, type Attendance, type StudentFollow } from "../api/gym";
import { Toast } from "../components/Toast";

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

const PAGE_SIZES = [10, 25, 50] as const;

function attendanceDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(value));
}

export function StudentsFollowPage() {
  const [students, setStudents] = useState<StudentFollow[]>([]);
  const [inside, setInside] = useState<Attendance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openNow, setOpenNow] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);

  async function load() {
    const [data, present, occupancy] = await Promise.all([
      api.listStudentFollow(),
      api.listInside(),
      api.getOccupancy(),
    ]);
    setStudents(data);
    setInside(present);
    setOpenNow(occupancy.openNow);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const [data, present, occupancy] = await Promise.all([
          api.listStudentFollow(),
          api.listInside(),
          api.getOccupancy(),
        ]);
        if (!cancelled) {
          setStudents(data);
          setInside(present);
          setOpenNow(occupancy.openNow);
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

  const todayKey = attendanceDate(new Date().toISOString());
  const presentTodayCount = students.filter(
    (student) => student.lastCheckIn != null && attendanceDate(student.lastCheckIn) === todayKey
  ).length;
  const withoutRoutine = students.filter((student) => !student.activeRoutineTitle).length;

  return (
    <>
      <section className="session-card">
        <h1>Alumnos</h1>
        <div className="student-facts">
          <div>
            <p className="eyebrow">Total</p>
            <strong>{students.length}</strong>
          </div>
          <div>
            <p className="eyebrow">Adentro</p>
            <strong>{inside.length}</strong>
          </div>
          <div>
            <p className="eyebrow">Presentes hoy</p>
            <strong>{presentTodayCount}</strong>
          </div>
          <div>
            <p className="eyebrow">Sin rutina</p>
            <strong>{withoutRoutine}</strong>
          </div>
        </div>
        <Toast message={notice} onClose={() => setNotice(null)} />
      </section>
      <section className="session-card table-card">
        {error ? <p className="alert">{error}</p> : null}
        {loading ? (
          <p className="lede">Cargando…</p>
        ) : students.length === 0 ? (
          <p className="lede">Todavía no hay alumnos.</p>
        ) : (
          <>
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
                {students.slice(page * pageSize, page * pageSize + pageSize).map((student) => {
                  const isInside = inside.some((person) => person.studentId === student.id);
                  const presentToday =
                    student.lastCheckIn != null &&
                    attendanceDate(student.lastCheckIn) === attendanceDate(new Date().toISOString());
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
                      {presentToday && !isInside ? (
                        <span className="pill on">Presente</span>
                      ) : isInside ? (
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={busyId === student.id}
                          onClick={() => mark(student.id, "out")}
                        >
                          Marcar salida
                        </button>
                      ) : openNow ? (
                        <button
                          type="button"
                          className="btn-primary btn-inline"
                          disabled={busyId === student.id}
                          onClick={() => mark(student.id, "in")}
                        >
                          Dar presente
                        </button>
                      ) : (
                        <span className="pill off">Cerrado</span>
                      )}
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
          <div className="table-pagination">
            <p className="table-meta">
              {students.length === 0 ? 0 : page * pageSize + 1}–{Math.min(students.length, (page + 1) * pageSize)} de{" "}
              {students.length}
            </p>
            <label className="page-size">
              <span>Por página</span>
              <select
                aria-label="Por página"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number]);
                  setPage(0);
                }}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <div className="pager-actions">
              <button type="button" className="btn-ghost" disabled={page <= 0} onClick={() => setPage((value) => value - 1)}>
                Anterior
              </button>
              <span className="table-meta">
                Página {page + 1} de {Math.max(1, Math.ceil(students.length / pageSize))}
              </span>
              <button
                type="button"
                className="btn-ghost"
                disabled={page + 1 >= Math.ceil(students.length / pageSize)}
                onClick={() => setPage((value) => value + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
          </>
        )}
      </section>
    </>
  );
}
