import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import {
  DAY_LABELS,
  MODE_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  STATUS_LABELS,
  dayTitle,
  formatDate,
  formatKg,
  routineDays,
  sessionName,
  shiftIso,
  todayIso,
  type ActiveRoutine,
  type Attendance,
  type Booking,
  type CalendarDay,
  type ClassSchedule,
  type Occupancy,
  type OperatingMode,
  type RoutineExercise,
  type WorkoutLog,
} from "../api/gym";
import { useGymBrand } from "../auth/GymBrand";
import { MonthCalendar } from "../components/MonthCalendar";
import { todayHoursText } from "../gym/hours";

function monthStart(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function monthEnd(year: number, month: number) {
  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

export function StudentHomePage() {
  const gym = useGymBrand();
  const today = todayIso();
  const [mode, setMode] = useState<OperatingMode | null>(null);
  const [occupancy, setOccupancy] = useState<Occupancy | null>(null);
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [active, setActive] = useState<ActiveRoutine | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rest, setRest] = useState<{ name: string; left: number } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { reps: string; weight: string; rpe: string }>>({});
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [monthLogs, setMonthLogs] = useState<WorkoutLog[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const [choosingDay, setChoosingDay] = useState(false);
  const [loggingDay, setLoggingDay] = useState<number | null>(null);
  const oldestLogDate = shiftIso(today, -7);
  const logDate = selectedDate ?? today;
  const canLogDate = logDate >= oldestLogDate && logDate <= today;

  async function reload() {
    const config = await api.getGymConfig();
    const acceptsClasses = config.operatingMode !== "FREE_ACCESS";
    const [nextOccupancy, nextActive, nextLogs, nextAttendance, nextClasses, nextBookings, nextDays, nextMonthLogs] =
      await Promise.all([
        api.getOccupancy(),
        api.getActiveRoutine(),
        api.listWorkouts({ from: logDate, to: logDate }),
        api.attendanceToday(),
        acceptsClasses ? api.listClasses({ date: today, active: true }) : Promise.resolve([]),
        acceptsClasses ? api.listBookings({ date: today }) : Promise.resolve([]),
        api.calendar(year, month),
        api.listWorkouts({ from: monthStart(year, month), to: monthEnd(year, month) }),
      ]);
    setMode(config.operatingMode);
    setOccupancy(nextOccupancy);
    setActive(nextActive);
    setLogs(nextLogs);
    setAttendance(nextAttendance);
    setClasses(nextClasses);
    setBookings(nextBookings);
    setCalendarDays(nextDays);
    setMonthLogs(nextMonthLogs);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        await reload();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el inicio");
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
  }, [today, year, month, logDate]);

  useEffect(() => {
    if (!rest || rest.left <= 0) {
      return;
    }
    const handle = window.setTimeout(() => setRest({ ...rest, left: rest.left - 1 }), 1000);
    return () => window.clearTimeout(handle);
  }, [rest]);

  async function runAction(id: string, action: () => Promise<void>) {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await action();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción");
    } finally {
      setBusyId(null);
    }
  }

  async function onLog(event: FormEvent, exerciseId: string, restSeconds: number, exerciseName: string) {
    event.preventDefault();
    const draft = drafts[exerciseId] ?? { reps: "", weight: "", rpe: "" };
    const done = logs.filter((log) => log.exerciseId === exerciseId && (log.dayNumber ?? 1) === loggingDay).length;
    const day = routineDays(active?.routine?.exercises ?? []).find((item) => item.dayNumber === loggingDay);
    await runAction(exerciseId, async () => {
      await api.createWorkout({
        exerciseId,
        routineId: active?.routine?.id,
        setNumber: done + 1,
        repsCompleted: Number(draft.reps),
        weightKg: Number(draft.weight),
        rpe: draft.rpe ? Number(draft.rpe) : null,
        dayNumber: loggingDay,
        dayLabel: day?.label ?? null,
        loggedDate: logDate,
      });
      setNotice("Serie registrada");
      if (restSeconds > 0) {
        setRest({ name: exerciseName, left: restSeconds });
      }
    });
  }

  const weekday = DAY_LABELS[new Date().getDay() === 0 ? 7 : new Date().getDay()];
  const hoursLine = gym?.hours?.length ? todayHoursText(gym.hours) : null;
  const presentLabel =
    attendance?.checkInTime && !attendance.checkOutTime
      ? "Estás adentro"
      : attendance?.checkInTime
        ? "Salida marcada"
        : "Todavía no la marcaste";

  return (
    <div className="gym-home">
      <section className="session-card home-brief">
        <div className="home-brief-row">
          <div>
            <p className="eyebrow">{weekday}</p>
            <h1>Hoy</h1>
            <p className="lede">{hoursLine ?? "Horario sin cargar"}{mode ? ` · ${MODE_LABELS[mode]}` : ""}</p>
            {mode !== "CLASS_SCHEDULED" && occupancy ? (
              <span className={occupancy.openNow ? "pill on" : "pill off"}>
                {occupancy.openNow ? "Abierto" : "Cerrado"}
              </span>
            ) : null}
          </div>
          {mode !== "CLASS_SCHEDULED" && occupancy ? (
            <div className="home-occupancy">
              <p className="eyebrow">Gente ahora</p>
              <strong>
                {occupancy.currentOccupancy}
                <span>/{occupancy.maxCapacity}</span>
              </strong>
            </div>
          ) : null}
        </div>
        {error ? <p className="alert">{error}</p> : null}
        {notice ? <p className="alert ok">{notice}</p> : null}
        <div className="home-attendance">
          <div>
            <p className="eyebrow">Asistencia</p>
            <p>{presentLabel}</p>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn-primary btn-inline"
              disabled={busyId === "in" || Boolean(attendance && !attendance.checkOutTime)}
              onClick={() => runAction("in", async () => { await api.checkIn(); setNotice("Ingreso registrado"); })}
            >
              Registrar ingreso
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={busyId === "out" || !attendance || Boolean(attendance.checkOutTime)}
              onClick={() => runAction("out", async () => { await api.checkOut(); setNotice("Salida registrada"); })}
            >
              Registrar salida
            </button>
          </div>
        </div>
      </section>

      {loading ? <p className="lede">Cargando…</p> : null}

      {mode !== "FREE_ACCESS" ? (
        <section className="session-card">
          <h2>Turnos de hoy</h2>
          {classes.length === 0 ? (
            <p className="lede">No hay turnos para hoy.</p>
          ) : (
            <div className="stack">
              {classes.map((item) => {
                const own = bookings.find(
                  (booking) => booking.classScheduleId === item.id && booking.status !== "CANCELADA"
                );
                return (
                  <article className="routine-card" key={item.id}>
                    <strong>{item.title}</strong>
                    <p className="cell-note">
                      {item.startTime} – {item.endTime} · {item.instructorName}
                    </p>
                    <p className="lede">
                      {item.remaining} cupos libres de {item.capacity}
                    </p>
                    {own ? (
                      <div className="form-actions">
                        <span className="pill on">{STATUS_LABELS[own.status]}</span>
                        {own.status === "CONFIRMADA" ? (
                          <button
                            type="button"
                            className="btn-ghost"
                            disabled={busyId === own.id}
                            onClick={() =>
                              runAction(own.id, async () => {
                                await api.cancelBooking(own.id);
                                setNotice("Reserva cancelada");
                              })
                            }
                          >
                            Cancelar reserva
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary btn-inline"
                        disabled={busyId === item.id || item.remaining <= 0}
                        onClick={() =>
                          runAction(item.id, async () => {
                            await api.bookClass(item.id, today);
                            setNotice("Quedaste inscripto al turno");
                          })
                        }
                      >
                        {item.remaining <= 0 ? "Sin cupo" : "Inscribirme"}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      <section className="session-card">
        <p className="eyebrow">Rutina activa</p>
        {active?.routine && active.assignment ? (
          <>
            <h2 className="home-routine-title">{active.routine.title}</h2>
            <div className="home-routine-meta">
              {active.routine.customStudent ? (
                <span className="pill custom">Personalizada</span>
              ) : (
                <span className="pill on">Profesor</span>
              )}
              <p>
                {active.assignment.expirationDate
                  ? `Vence el ${active.assignment.expirationDate.split("-").reverse().join("/")}`
                  : "Sin vencimiento"}
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="lede">No tenés una rutina activa para hoy.</p>
            {active?.expired ? (
              <p className="alert">La rutina “{active.expired.routineTitle}” ha vencido.</p>
            ) : (
              <p className="lede">Pedile una al profesor o armá la tuya en Mis rutinas.</p>
            )}
          </>
        )}

        <MonthCalendar
          year={year}
          month={month}
          days={calendarDays}
          onShift={(delta) => {
            const next = new Date(year, month - 1 + delta, 1);
            setYear(next.getFullYear());
            setMonth(next.getMonth() + 1);
          }}
          selectedDate={selectedDate}
          onSelect={(date) => {
            setSelectedDate(date);
            setError(null);
            if (date < oldestLogDate || date > today) {
              setLoggingDay(null);
              setChoosingDay(false);
            }
          }}
        />
        <p className="hint left">
          {selectedDate && selectedDate > today
            ? "Ese día todavía no llegó."
            : selectedDate && selectedDate < oldestLogDate
              ? "Ese día queda afuera de los 7 días. Podés verlo, pero no cargarlo."
              : "Tocá un día del calendario para elegir la fecha. Podés cargar hasta 7 días hacia atrás."}
        </p>

        {active?.routine && active.assignment ? (
          <TrainingDay
            routineExercises={active.routine.exercises}
            logs={logs}
            monthLogs={monthLogs}
            selectedDate={selectedDate}
            today={today}
            choosingDay={choosingDay}
            loggingDay={loggingDay}
            busyId={busyId}
            drafts={drafts}
            rest={rest}
            onDrafts={setDrafts}
            onChoose={(dayNumber) => {
              setLoggingDay(dayNumber);
              setChoosingDay(false);
            }}
            onStart={() => {
              if (!canLogDate) {
                setError(
                  logDate > today
                    ? "No podés cargar un día que todavía no llegó."
                    : "Solo podés cargar un entrenamiento de los últimos 7 días."
                );
                return;
              }
              const grouped = routineDays(active.routine?.exercises ?? []);
              if (grouped.length <= 1) {
                setLoggingDay(grouped[0]?.dayNumber ?? 1);
                setChoosingDay(false);
                return;
              }
              setLoggingDay(null);
              setChoosingDay(true);
            }}
            onClose={() => {
              setLoggingDay(null);
              setChoosingDay(false);
            }}
            onSkipRest={() => setRest(null)}
            onLog={onLog}
            logDate={logDate}
          />
        ) : null}
      </section>
    </div>
  );
}

function TrainingDay({
  routineExercises,
  logs,
  monthLogs,
  selectedDate,
  today,
  choosingDay,
  loggingDay,
  busyId,
  drafts,
  rest,
  onDrafts,
  onChoose,
  onStart,
  onClose,
  onSkipRest,
  onLog,
  logDate,
}: {
  routineExercises: RoutineExercise[];
  logs: WorkoutLog[];
  monthLogs: WorkoutLog[];
  selectedDate: string | null;
  today: string;
  choosingDay: boolean;
  loggingDay: number | null;
  busyId: string | null;
  drafts: Record<string, { reps: string; weight: string; rpe: string }>;
  rest: { name: string; left: number } | null;
  onDrafts: (next: Record<string, { reps: string; weight: string; rpe: string }>) => void;
  onChoose: (dayNumber: number) => void;
  onStart: () => void;
  onClose: () => void;
  onSkipRest: () => void;
  onLog: (event: FormEvent, exerciseId: string, restSeconds: number, exerciseName: string) => Promise<void>;
  logDate: string;
}) {
  const days = routineDays(routineExercises);
  const openDay = days.find((day) => day.dayNumber === loggingDay) ?? null;
  const sessions = new Map<number, { label: string | null; logs: WorkoutLog[] }>();
  for (const log of monthLogs.filter((item) => item.loggedDate === selectedDate)) {
    const number = log.dayNumber ?? 0;
    const current = sessions.get(number) ?? { label: log.dayLabel, logs: [] };
    current.logs.push(log);
    if (!current.label && log.dayLabel) {
      current.label = log.dayLabel;
    }
    sessions.set(number, current);
  }
  const selectedSessions = [...sessions.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <>
      <div className="form-actions">
        <button type="button" className="btn-primary btn-inline" onClick={onStart}>
          Cargar día
        </button>
        {choosingDay || loggingDay != null ? (
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        ) : null}
      </div>

      {choosingDay ? (
        <div className="day-choice training-split">
          <p className="lede">¿Qué día estás haciendo? Podés hacer el día 1 un lunes y el día 3 un martes.</p>
          {days.map((day) => (
            <button type="button" key={day.dayNumber} onClick={() => onChoose(day.dayNumber)}>
              <strong>{dayTitle(day)}</strong>
            </button>
          ))}
        </div>
      ) : null}

      {openDay ? (
        <>
          <h3 className="training-day-title">{sessionName(days, openDay.dayNumber)}</h3>
          <p className="lede">Cargando el {formatDate(logDate)}.</p>
          <p className="hint left">
            Esfuerzo es opcional, del 1 al 10: 1 es muy fácil y 10 es que no podrías hacer otra repetición.
          </p>
          {rest ? (
            <div className="rest-timer">
              <p>Descanso · {rest.name}</p>
              <strong>
                {Math.floor(rest.left / 60)}:{String(rest.left % 60).padStart(2, "0")}
              </strong>
              <button type="button" className="btn-ghost" onClick={onSkipRest}>
                {rest.left <= 0 ? "Seguir" : "Saltar descanso"}
              </button>
            </div>
          ) : null}
          <div className="stack">
            {openDay.exercises.map((exercise) => {
              const done = logs
                .filter((log) => log.exerciseId === exercise.exerciseId && (log.dayNumber ?? 1) === openDay.dayNumber)
                .slice()
                .sort((a, b) => a.setNumber - b.setNumber);
              const draft = drafts[exercise.exerciseId] ?? { reps: String(exercise.targetReps), weight: "", rpe: "" };
              return (
                <article className="tracker-card" key={exercise.id}>
                  <div>
                    <strong>{exercise.exerciseName}</strong>
                    <p className="cell-note">
                      {MUSCLE_LABELS[exercise.muscleGroup]} · objetivo {exercise.targetSets}×{exercise.targetReps}
                      {exercise.notes ? ` · ${exercise.notes}` : ""}
                    </p>
                  </div>
                  {done.length > 0 ? (
                    <ul className="plain-list">
                      {done.map((log) => (
                        <li key={log.id}>
                          <strong>Serie {log.setNumber}</strong>
                          <span>
                            {log.repsCompleted} reps · {formatKg(log.weightKg)}
                            {log.rpe ? ` · esfuerzo ${log.rpe}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="lede">Sin series todavía.</p>
                  )}
                  <form
                    className="set-form"
                    onSubmit={(event) => onLog(event, exercise.exerciseId, exercise.targetRestSeconds, exercise.exerciseName)}
                  >
                    <label>
                      <span>Reps</span>
                      <input
                        inputMode="numeric"
                        type="number"
                        min={0}
                        value={draft.reps}
                        onChange={(event) =>
                          onDrafts({ ...drafts, [exercise.exerciseId]: { ...draft, reps: event.target.value } })
                        }
                        required
                      />
                    </label>
                    <label>
                      <span>Peso (kg)</span>
                      <input
                        inputMode="decimal"
                        type="number"
                        min={0}
                        step="0.5"
                        value={draft.weight}
                        onChange={(event) =>
                          onDrafts({ ...drafts, [exercise.exerciseId]: { ...draft, weight: event.target.value } })
                        }
                        required
                      />
                    </label>
                    <label>
                      <span>Esfuerzo</span>
                      <select
                        value={draft.rpe}
                        onChange={(event) =>
                          onDrafts({ ...drafts, [exercise.exerciseId]: { ...draft, rpe: event.target.value } })
                        }
                      >
                        <option value="">—</option>
                        {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="btn-primary" type="submit" disabled={busyId === exercise.exerciseId}>
                      Anotar serie {done.length + 1}
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        </>
      ) : choosingDay ? null : (
        <div className="stack">
          <p className="lede">
            {selectedSessions.length === 0
              ? selectedDate === today
                ? "Hoy todavía no cargaste el entrenamiento."
                : `El ${formatDate(selectedDate)} no hay entrenamiento cargado.`
              : formatDate(selectedDate)}
          </p>
          {selectedSessions.map(([number, session]) => (
            <DayLog
              key={number}
              title={
                session.label
                  ? number > 0
                    ? `Día ${number} · ${session.label}`
                    : session.label
                  : number > 0
                    ? `Día ${number}`
                    : "Entrenamiento"
              }
              logs={session.logs}
              routineExercises={routineExercises}
            />
          ))}
        </div>
      )}
    </>
  );
}

function DayLog({
  title,
  logs,
  routineExercises,
}: {
  title: string;
  logs: WorkoutLog[];
  routineExercises: RoutineExercise[];
}) {
  const muscleOf = new Map(routineExercises.map((exercise) => [exercise.exerciseId, exercise.muscleGroup]));
  const grouped = new Map<string, Map<string, WorkoutLog[]>>();
  for (const log of [...logs].sort((a, b) => a.setNumber - b.setNumber)) {
    const muscle = muscleOf.get(log.exerciseId) ?? "OTROS";
    const exercises = grouped.get(muscle) ?? new Map<string, WorkoutLog[]>();
    const sets = exercises.get(log.exerciseId) ?? [];
    sets.push(log);
    exercises.set(log.exerciseId, sets);
    grouped.set(muscle, exercises);
  }
  const blocks = [...MUSCLE_GROUPS, "OTROS"].filter((key) => grouped.has(key));

  return (
    <div className="day-log">
      <h3 className="day-log-title">{title}</h3>
      {blocks.map((muscle) => (
        <section className="muscle-block" key={muscle}>
          <p className="eyebrow">{muscle in MUSCLE_LABELS ? MUSCLE_LABELS[muscle as keyof typeof MUSCLE_LABELS] : "Otros"}</p>
          {[...(grouped.get(muscle)?.entries() ?? [])].map(([exerciseId, sets]) => (
            <article className="exercise-sets" key={exerciseId}>
              <strong>{sets[0]?.exerciseName}</strong>
              <ul>
                {sets.map((log) => (
                  <li key={log.id}>
                    Serie {log.setNumber} · {log.repsCompleted} reps · {formatKg(log.weightKg)}
                    {log.rpe ? ` · esfuerzo ${log.rpe}` : ""}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
