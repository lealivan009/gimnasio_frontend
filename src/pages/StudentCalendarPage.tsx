import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import {
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  formatDate,
  formatDuration,
  formatKg,
  todayIso,
  type Attendance,
  type CalendarDay,
  type MuscleGroup,
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

function setLabel(log: WorkoutLog) {
  if ((log.durationSeconds ?? 0) > 0) {
    return formatDuration(log.durationSeconds ?? 0);
  }
  return `${log.repsCompleted} × ${formatKg(log.weightKg)}`;
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
  const [muscles, setMuscles] = useState<Map<string, MuscleGroup> | null>(null);
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
    let cancelled = false;
    api
      .listExercises()
      .then((list) => {
        if (!cancelled) {
          setMuscles(new Map(list.map((exercise) => [exercise.id, exercise.muscleGroup])));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMuscles(new Map());
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const sessions = new Map<string, Map<string, Map<string, WorkoutLog[]>>>();
  for (const log of [...logs].sort((left, right) => left.setNumber - right.setNumber)) {
    const title = sessionTitle(log);
    const muscle = muscles?.get(log.exerciseId);
    const category = muscle && MUSCLE_GROUPS.includes(muscle) ? muscle : "OTROS";
    const byMuscle = sessions.get(title) ?? new Map<string, Map<string, WorkoutLog[]>>();
    const exercises = byMuscle.get(category) ?? new Map<string, WorkoutLog[]>();
    const sets = exercises.get(log.exerciseId) ?? [];
    sets.push(log);
    exercises.set(log.exerciseId, sets);
    byMuscle.set(category, exercises);
    sessions.set(title, byMuscle);
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
          <div className="day-work">
            <div className="day-work-head">
              <h3>{formatDate(selectedDate)}</h3>
              {loadingDay ? <p>Cargando…</p> : null}
              {!loadingDay && went ? (
                <p>
                  Fue a las {visits.map((visit) => attendanceTime(visit.checkInTime)).join(", ")}
                  {trained ? "" : " · no cargó ejercicios"}
                </p>
              ) : null}
              {!loadingDay && !went && trained ? <p>No marcó presente</p> : null}
              {!loadingDay && !went && !trained ? <p>Ese día no fue</p> : null}
            </div>
            {!loadingDay && trained && !muscles ? <p className="lede">Cargando…</p> : null}
            {!loadingDay && muscles && trained
              ? [...sessions.entries()].map(([title, byMuscle]) => (
                  <section key={title}>
                    <h3 className="day-log-title">{title}</h3>
                    {(["PECHO", "ESPALDA", "PIERNAS", "BRAZOS", "HOMBROS", "CORE", "CARDIO", "OTROS"] as const)
                      .filter((category) => byMuscle.has(category))
                      .map((category) => (
                        <section className="muscle-block" key={category}>
                          <p className="eyebrow">
                            {category === "OTROS" ? "Otros" : MUSCLE_LABELS[category]}
                          </p>
                          <div className="day-work-list">
                            {[...(byMuscle.get(category)?.entries() ?? [])].map(([exerciseId, sets]) => (
                              <div className="day-work-row" key={exerciseId}>
                                <strong>{sets[0]?.exerciseName}</strong>
                                <span className="set-chips">
                                  {sets.map((log) => (
                                    <span className="set-chip" key={log.id}>
                                      {setLabel(log)}
                                    </span>
                                  ))}
                                </span>
                              </div>
                            ))}
                          </div>
                        </section>
                      ))}
                  </section>
                ))
              : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
