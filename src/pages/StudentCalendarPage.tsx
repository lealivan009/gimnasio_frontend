import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import {
  formatDate,
  formatDuration,
  formatKg,
  todayIso,
  type Attendance,
  type CalendarDay,
  type StudentFollow,
  type WorkoutLog,
} from "../api/gym";
import { MonthCalendar } from "../components/MonthCalendar";

function attendanceDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(value));
}

function attendanceTime(value: string) {
  return new Date(value).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function sessionTitle(log: WorkoutLog) {
  if (log.dayLabel) {
    return log.dayNumber ? `Día ${log.dayNumber} · ${log.dayLabel}` : log.dayLabel;
  }
  if (log.dayNumber) {
    return `Día ${log.dayNumber}`;
  }
  return "Entrenamiento";
}

function setLine(log: WorkoutLog) {
  const effort = log.durationSeconds != null && log.durationSeconds > 0
    ? formatDuration(log.durationSeconds)
    : `${log.repsCompleted} reps · ${formatKg(log.weightKg)}`;
  return `Serie ${log.setNumber} · ${effort}${log.rpe ? ` · esfuerzo ${log.rpe}` : ""}`;
}

export function StudentCalendarPage() {
  const { id = "" } = useParams();
  const now = new Date();
  const [student, setStudent] = useState<StudentFollow | null>(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [visits, setVisits] = useState<Attendance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .listStudentFollow()
      .then((list) => {
        if (cancelled) {
          return;
        }
        const found = list.find((item) => item.id === id) ?? null;
        setStudent(found);
        if (!found) {
          setError("Ese alumno no existe.");
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el alumno");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!student) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .calendar(year, month, student.id)
      .then((next) => {
        if (!cancelled) {
          setDays(next);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el calendario");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [student, year, month]);

  useEffect(() => {
    if (!student || !selectedDate) {
      return;
    }
    let cancelled = false;
    setLoadingDay(true);
    Promise.all([
      api.listWorkouts({ studentId: student.id, from: selectedDate, to: selectedDate }),
      api.listAttendance({ studentId: student.id, from: selectedDate, to: selectedDate }),
    ])
      .then(([nextLogs, nextVisits]) => {
        if (cancelled) {
          return;
        }
        setLogs(nextLogs);
        setVisits(nextVisits.filter((visit) => attendanceDate(visit.checkInTime) === selectedDate));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el día");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDay(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [student, selectedDate]);

  function shiftMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  }

  const sessions = new Map<string, Map<string, WorkoutLog[]>>();
  for (const log of [...logs].sort((left, right) => left.setNumber - right.setNumber)) {
    const title = sessionTitle(log);
    const exercises = sessions.get(title) ?? new Map<string, WorkoutLog[]>();
    const sets = exercises.get(log.exerciseId) ?? [];
    sets.push(log);
    exercises.set(log.exerciseId, sets);
    sessions.set(title, exercises);
  }
  const went = visits.length > 0;
  const trained = logs.length > 0;

  return (
    <section className="session-card">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">Calendario</p>
          <h1>{student ? `${student.lastName}, ${student.firstName}` : "Alumno"}</h1>
        </div>
        <Link className="btn-ghost" to="/admin/alumnos">
          Volver
        </Link>
      </div>
      {error ? <p className="alert">{error}</p> : null}
      {loading && !student ? <p className="lede">Cargando…</p> : null}
      {student ? (
        <>
          <MonthCalendar
            heading=""
            year={year}
            month={month}
            days={days}
            onShift={shiftMonth}
            selectedDate={selectedDate}
            maxDate={todayIso()}
            onSelect={setSelectedDate}
          />
          <p className="hint left">Tocá un día para ver si fue y qué hizo. Desde acá no se marca la asistencia.</p>
          <div className="day-log">
            <h3 className="day-log-title">{formatDate(selectedDate)}</h3>
            {loadingDay ? <p className="lede">Cargando…</p> : null}
            {!loadingDay && went ? (
              <p className="lede">
                Fue a las {visits.map((visit) => attendanceTime(visit.checkInTime)).join(", ")}.
              </p>
            ) : null}
            {!loadingDay && !went && !trained ? <p className="lede">Ese día no fue.</p> : null}
            {!loadingDay && !went && trained ? <p className="lede">No marcó presente.</p> : null}
            {!loadingDay && trained
              ? [...sessions.entries()].map(([title, exercises]) => (
                  <section className="muscle-block" key={title}>
                    <p className="eyebrow">{title}</p>
                    {[...exercises.entries()].map(([exerciseId, sets]) => (
                      <article className="exercise-sets" key={exerciseId}>
                        <strong>{sets[0]?.exerciseName}</strong>
                        <ul>
                          {sets.map((log) => (
                            <li key={log.id}>{setLine(log)}</li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </section>
                ))
              : null}
            {!loadingDay && went && !trained ? <p className="lede">No cargó ejercicios.</p> : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
