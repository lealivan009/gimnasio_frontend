import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";
import {
  DAY_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  STATUS_LABELS,
  dayTitle,
  formatDate,
  formatDuration,
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
  type OpeningHour,
  type OperatingMode,
  type RoutineExercise,
  type ClosedDay,
  type WorkoutLog,
} from "../api/gym";
import { ExerciseHowTo } from "../components/ExerciseHowTo";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { MonthCalendar } from "../components/MonthCalendar";
import { SkeletonCalendar } from "../components/Skeleton";
import { Toast } from "../components/Toast";
import { weekdayIndex } from "../gym/hours";
import { beep, unlockSound } from "../gym/sound";

function clampTime(raw: string, max: number) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    return 0;
  }
  return Math.min(max, Number(digits));
}

function monthStart(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function monthEnd(year: number, month: number) {
  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

function attendanceDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(value));
}

function dayClosed(iso: string, hours: OpeningHour[] | null) {
  if (!hours || hours.length === 0) {
    return false;
  }
  const date = new Date(`${iso}T12:00:00`);
  const day = date.getDay() === 0 ? 7 : date.getDay();
  return !hours.some((hour) => hour.dayOfWeek === day);
}

export function StudentHomePage() {
  const today = todayIso();
  const [mode, setMode] = useState<OperatingMode | null>(null);
  const [hours, setHours] = useState<OpeningHour[] | null>(null);
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [active, setActive] = useState<ActiveRoutine | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [presentDates, setPresentDates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rest, setRest] = useState<{ name: string; endsAt: number } | null>(null);
  const screenLock = useRef<WakeLockSentinel | null>(null);
  const holdScreen = useCallback(async () => {
    if (!("wakeLock" in navigator) || document.visibilityState !== "visible") {
      return;
    }
    try {
      const next = await navigator.wakeLock.request("screen");
      const previous = screenLock.current;
      screenLock.current = next;
      if (previous && previous !== next) {
        void previous.release().catch(() => undefined);
      }
    } catch {
      // Si el celular no deja mantener la pantalla, el descanso igual sigue por la hora.
    }
  }, []);
  const releaseScreen = useCallback(() => {
    const current = screenLock.current;
    screenLock.current = null;
    void current?.release().catch(() => undefined);
  }, []);
  const skipRest = useCallback(() => {
    releaseScreen();
    setRest(null);
  }, [releaseScreen]);

  useEffect(() => releaseScreen, [releaseScreen]);
  const [drafts, setDrafts] = useState<Record<string, { reps: string; weight: string; rpe: string }>>({});
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [closures, setClosures] = useState<ClosedDay[]>([]);
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
    const [nextActive, nextLogs, nextAttendance, nextClasses, nextBookings, nextDays, nextMonthLogs, nextClosures] =
      await Promise.all([
        api.getActiveRoutine(),
        api.listWorkouts({ from: logDate, to: logDate }),
        api.listAttendance({ from: oldestLogDate, to: today }),
        acceptsClasses ? api.listClasses({ date: today, active: true }) : Promise.resolve([]),
        acceptsClasses ? api.listBookings({ date: today }) : Promise.resolve([]),
        api.calendar(year, month),
        api.listWorkouts({ from: monthStart(year, month), to: monthEnd(year, month) }),
        api.listClosures(),
      ]);
    setMode(config.operatingMode);
    setHours(config.hours ?? []);
    setActive(nextActive);
    setLogs(nextLogs);
    const dates = [...new Set(nextAttendance.map((item) => attendanceDate(item.checkInTime)))];
    setPresentDates(dates);
    setAttendance(nextAttendance.find((item) => attendanceDate(item.checkInTime) === today) ?? null);
    setClasses(nextClasses);
    setBookings(nextBookings);
    setCalendarDays(nextDays);
    setMonthLogs(nextMonthLogs);
    setClosures(nextClosures);
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

  async function onLog(
    event: { preventDefault: () => void },
    exerciseId: string,
    restSeconds: number,
    exerciseName: string,
    timed: boolean,
    durationSeconds = 0
  ) {
    event.preventDefault();
    unlockSound();
    void holdScreen();
    const hadRest = rest != null;
    let started = false;
    function dropScreen() {
      if (!started && !hadRest) {
        releaseScreen();
      }
    }
    if (logDate > today) {
      setError("No podés cargar un día que todavía no llegó.");
      dropScreen();
      return;
    }
    if (!presentDates.includes(logDate)) {
      setError(
        logDate === today
          ? "Marcá el presente de hoy para anotar las series."
          : "Marcá el presente de ese día en Progreso para anotar las series."
      );
      dropScreen();
      return;
    }
    const draft = drafts[exerciseId] ?? { reps: "", weight: "", rpe: "" };
    if (timed && durationSeconds < 1) {
      setError("Indicá cuánto tiempo hiciste.");
      dropScreen();
      return;
    }
    const done = logs.filter((log) => log.exerciseId === exerciseId && (log.dayNumber ?? 1) === loggingDay).length;
    const day = routineDays(active?.routine?.exercises ?? []).find((item) => item.dayNumber === loggingDay);
    await runAction(exerciseId, async () => {
      await api.createWorkout({
        exerciseId,
        routineId: active?.routine?.id,
        setNumber: done + 1,
        repsCompleted: timed ? 0 : Number(draft.reps),
        weightKg: timed ? 0 : Number(draft.weight),
        durationSeconds: timed ? durationSeconds : null,
        rpe: draft.rpe ? Number(draft.rpe) : null,
        dayNumber: loggingDay,
        dayLabel: day?.label ?? null,
        loggedDate: logDate,
      });
      setNotice("Serie registrada");
      if (restSeconds > 0) {
        started = true;
        setRest({ name: exerciseName, endsAt: Date.now() + restSeconds * 1000 });
      }
    });
    dropScreen();
  }

  async function onDeleteSet(log: WorkoutLog) {
    await runAction(log.id, async () => {
      await api.deleteWorkout(log.id);
      setNotice("Serie borrada");
    });
  }

  const weekday = DAY_LABELS[weekdayIndex()];
  const closureReason = (date: string) => closures.find((item) => item.date === date)?.reason ?? null;
  const todayClosure = closureReason(today);
  const selectedClosure = closureReason(logDate);
  const closedToday =
    hours != null && hours.length > 0 && !hours.some((hour) => hour.dayOfWeek === weekdayIndex());
  const presentLabel = todayClosure && !attendance
    ? "Bloqueado"
    : closedToday && !attendance
      ? "Hoy no abre"
      : attendance?.checkInTime
        ? "Presente"
        : "Todavía no la marcaste";

  return (
    <div className="gym-home">
      <section className="session-card home-brief" aria-busy={loading}>
        <div className="home-brief-row">
          <div>
            <p className="eyebrow">{weekday}</p>
            <h1>Hoy</h1>
          </div>
          <div className="home-occupancy">
            <p className="eyebrow">Asistencia</p>
            {loading ? <span className="skeleton skeleton-line short" /> : <p>{presentLabel}</p>}
          </div>
        </div>
        {error ? <p className="alert">{error}</p> : null}
        <Toast message={notice} onClose={() => setNotice(null)} />
        {loading ? (
          <span className="skeleton skeleton-button" />
        ) : todayClosure && !attendance ? (
          <p className="alert">Hoy está bloqueado: {todayClosure}</p>
        ) : attendance || closedToday ? null : (
          <div className="home-attendance">
            <div className="form-actions">
              <button
                type="button"
                className="btn-primary btn-inline"
                disabled={busyId === "in"}
                onClick={() => runAction("in", async () => { await api.checkIn(); setNotice("Presente registrado"); })}
              >
                Marcar presente
              </button>
            </div>
          </div>
        )}
      </section>

      {loading ? (
        <section className="session-card" aria-busy="true" aria-label="Cargando el día">
          <span className="skeleton skeleton-line short" />
          <span className="skeleton skeleton-line" />
          <SkeletonCalendar />
        </section>
      ) : (
        <>
      {mode !== "FREE_ACCESS" ? (
        <section className="session-card">
          <h2>Turnos de hoy</h2>
          {todayClosure ? (
            <p className="alert">Hoy está bloqueado: {todayClosure}</p>
          ) : classes.length === 0 ? (
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
        <div className="home-routine-row">
          <p className="eyebrow">Rutina activa</p>
          {active?.assignment?.expirationDate ? (
            <p className="cell-note">Vence el {formatDate(active.assignment.expirationDate)}</p>
          ) : null}
        </div>
        {active?.routine && active.assignment ? (
          <h2 className="home-routine-title">{active.routine.title}</h2>
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
          heading=""
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
            const blocked = Boolean(closureReason(date));
            if (date > today && !blocked) {
              return;
            }
            setSelectedDate(date);
            setError(null);
            if (date < oldestLogDate || !presentDates.includes(date)) {
              setLoggingDay(null);
              setChoosingDay(false);
            }
          }}
          maxDate={today}
        />
        {selectedClosure ? (
          <p className="alert">Este día está bloqueado: {selectedClosure}</p>
        ) : (
          <p className="hint left">
            {selectedDate && selectedDate > today
              ? "Ese día todavía no llegó."
              : selectedDate && selectedDate < oldestLogDate
                ? "Ese día queda afuera de los 7 días. Podés verlo, pero no cargarlo."
                : "Tocá un día para marcarlo. El presente y el entrenamiento se pueden cargar hasta 7 días hacia atrás."}
          </p>
        )}
        {selectedClosure ? null : logDate < today && logDate >= oldestLogDate && !presentDates.includes(logDate) ? (
          dayClosed(logDate, hours) ? (
            <p className="lede">Ese día el gimnasio está cerrado.</p>
          ) : (
            <div className="form-actions">
              <button
                type="button"
                className="btn-primary btn-inline"
                disabled={busyId === "past"}
                onClick={() =>
                  runAction("past", async () => {
                    await api.checkIn(logDate);
                    setNotice("Presente cargado");
                  })
                }
              >
                {busyId === "past" ? "Guardando…" : `Marcar presente · ${formatDate(logDate)}`}
              </button>
            </div>
          )
        ) : null}

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
            onLog={onLog}
            onDeleteSet={onDeleteSet}
            logDate={logDate}
            present={presentDates.includes(logDate)}
            blockedReason={selectedClosure}
          />
        ) : null}
      </section>
        </>
      )}
      {rest ? (
        <RestModal key={rest.endsAt} name={rest.name} endsAt={rest.endsAt} onSkip={skipRest} onHold={holdScreen} />
      ) : null}
    </div>
  );
}

function secondsLeft(endsAt: number, now = Date.now()) {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

function formatClock(totalSeconds: number) {
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function RestModal({
  name,
  endsAt,
  onSkip,
  onHold,
}: {
  name: string;
  endsAt: number;
  onSkip: () => void;
  onHold: () => void;
}) {
  const [left, setLeft] = useState(() => secondsLeft(endsAt));
  const finished = useRef(false);
  const sounding = useRef(false);

  useEffect(() => {
    function tick() {
      const remaining = secondsLeft(endsAt);
      setLeft((current) => (current === remaining ? current : remaining));
      if (remaining === 0 && !finished.current && !sounding.current && document.visibilityState === "visible") {
        sounding.current = true;
        void beep().then((played) => {
          sounding.current = false;
          if (played) {
            finished.current = true;
          }
        });
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") {
        tick();
        onHold();
      }
    }

    tick();
    onHold();
    const handle = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => {
      window.clearInterval(handle);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [endsAt, onHold]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onSkip();
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onSkip]);

  const done = left === 0;

  return createPortal(
    <div className="rest-modal">
      <div className="rest-modal-backdrop" />
      <div className="rest-modal-card" role="dialog" aria-modal="true" aria-labelledby="rest-title">
        <p className="eyebrow" id="rest-title">
          {done ? "Listo" : "Descanso"}
        </p>
        <p className={done ? "rest-modal-time done" : "rest-modal-time"} aria-live="polite">
          {formatClock(left)}
        </p>
        <p className="rest-modal-name">{name}</p>
        <button type="button" className="btn-ghost rest-modal-skip" onClick={onSkip}>
          Omitir
        </button>
      </div>
    </div>,
    document.body
  );
}

function exercisesByCategory(exercises: RoutineExercise[]) {
  const order: RoutineExercise["muscleGroup"][] = [];
  const grouped = new Map<RoutineExercise["muscleGroup"], RoutineExercise[]>();
  for (const exercise of exercises) {
    const current = grouped.get(exercise.muscleGroup);
    if (current) {
      current.push(exercise);
    } else {
      order.push(exercise.muscleGroup);
      grouped.set(exercise.muscleGroup, [exercise]);
    }
  }
  return order.map((muscle) => ({ muscle, exercises: grouped.get(muscle) ?? [] }));
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
  onDrafts,
  onChoose,
  onStart,
  onClose,
  onLog,
  onDeleteSet,
  logDate,
  present,
  blockedReason,
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
  onDrafts: (next: Record<string, { reps: string; weight: string; rpe: string }>) => void;
  onChoose: (dayNumber: number) => void;
  onStart: () => void;
  onClose: () => void;
  onLog: (
    event: { preventDefault: () => void },
    exerciseId: string,
    restSeconds: number,
    exerciseName: string,
    timed: boolean,
    durationSeconds?: number
  ) => Promise<void>;
  onDeleteSet: (log: WorkoutLog) => Promise<void>;
  logDate: string;
  present: boolean;
  blockedReason: string | null;
}) {
  const [pendingSet, setPendingSet] = useState<WorkoutLog | null>(null);
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
  const canLoad = !blockedReason && present && logDate <= today && logDate >= shiftIso(today, -7);
  const editing = choosingDay || loggingDay != null;

  return (
    <>
      <ConfirmDialog
        open={pendingSet != null}
        title="Borrar serie"
        description={
          pendingSet
            ? `Se va a borrar la serie ${pendingSet.setNumber}. Si el dato estaba mal, la volvés a cargar.`
            : ""
        }
        confirmLabel="Borrar"
        danger
        busy={busyId === pendingSet?.id}
        onCancel={() => {
          if (busyId !== pendingSet?.id) {
            setPendingSet(null);
          }
        }}
        onConfirm={() => {
          if (!pendingSet) {
            return;
          }
          void onDeleteSet(pendingSet).then(() => setPendingSet(null));
        }}
      />
      {canLoad || selectedSessions.length > 0 ? (
        <div className="load-day">
          <p>{selectedDate ? formatDate(selectedDate) : ""}</p>
          {canLoad ? (
            <button type="button" className="text-btn" onClick={editing ? onClose : onStart}>
              {editing ? "Cerrar" : "Cargar día"}
            </button>
          ) : null}
        </div>
      ) : null}

      {canLoad && choosingDay ? (
        <div className="day-choice training-split">
          <p className="lede">¿Qué día estás haciendo? Podés hacer el día 1 un lunes y el día 3 un martes.</p>
          {days.map((day) => (
            <button type="button" key={day.dayNumber} onClick={() => onChoose(day.dayNumber)}>
              <strong>{dayTitle(day)}</strong>
            </button>
          ))}
        </div>
      ) : null}

      {openDay && present && !blockedReason ? (
        <>
          <h3 className="training-day-title">{sessionName(days, openDay.dayNumber)}</h3>
          <p className="hint left">
            Esfuerzo es opcional, del 1 al 10: 1 es muy fácil y 10 es que no podrías hacer otra repetición.
          </p>
          <div className="tracker-groups">
            {exercisesByCategory(openDay.exercises).map((group) => (
              <section className="tracker-group" key={group.muscle}>
                <p className="eyebrow">{MUSCLE_LABELS[group.muscle]}</p>
                {group.exercises.map((exercise) => {
                  const timed = exercise.measure === "TIEMPO";
                  const done = logs
                    .filter((log) => log.exerciseId === exercise.exerciseId && (log.dayNumber ?? 1) === openDay.dayNumber)
                    .slice()
                    .sort((a, b) => a.setNumber - b.setNumber);
                  const draft = drafts[exercise.exerciseId] ?? { reps: String(exercise.targetReps), weight: "", rpe: "" };
                  const totalSeconds = Number(draft.reps) || 0;
                  return (
                    <article className="tracker-card" key={exercise.id}>
                      <div>
                        <div className="exercise-name">
                          <strong>{exercise.exerciseName}</strong>
                          <ExerciseHowTo exerciseId={exercise.exerciseId} name={exercise.exerciseName} notes={exercise.notes} />
                        </div>
                        <p className="cell-note">
                          Objetivo {exercise.targetSets}×
                          {exercise.measure === "TIEMPO" ? formatDuration(exercise.targetReps) : exercise.targetReps}
                          {exercise.notes ? ` · ${exercise.notes}` : ""}
                        </p>
                      </div>
                      {done.length > 0 ? (
                        <ul className="set-chips">
                          {done.map((log) => (
                            <li key={log.id}>
                              <strong>{log.setNumber}</strong>
                              <span>
                                {timed ? formatDuration(log.durationSeconds ?? 0) : `${log.repsCompleted}×${formatKg(log.weightKg)}`}
                                {log.rpe ? ` · ${log.rpe}` : ""}
                              </span>
                              <button
                                type="button"
                                className="set-remove"
                                aria-label={`Borrar serie ${log.setNumber}`}
                                disabled={busyId === log.id}
                                onClick={() => setPendingSet(log)}
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {present ? (
                      <form
                        className="set-form"
                        noValidate
                        onSubmit={(event) =>
                          onLog(event, exercise.exerciseId, exercise.targetRestSeconds, exercise.exerciseName, timed, totalSeconds)
                        }
                      >
                        {timed ? (
                          <>
                            <label>
                              <span>Min</span>
                              <input
                                inputMode="numeric"
                                value={String(Math.floor(totalSeconds / 60))}
                                onChange={(event) => {
                                  const minutes = clampTime(event.target.value, 120);
                                  const seconds = totalSeconds % 60;
                                  onDrafts({
                                    ...drafts,
                                    [exercise.exerciseId]: { ...draft, reps: String(minutes * 60 + seconds), weight: "0" },
                                  });
                                }}
                              />
                            </label>
                            <label>
                              <span>Seg</span>
                              <input
                                inputMode="numeric"
                                value={String(totalSeconds % 60)}
                                onChange={(event) => {
                                  const seconds = clampTime(event.target.value, 59);
                                  const minutes = Math.floor(totalSeconds / 60);
                                  onDrafts({
                                    ...drafts,
                                    [exercise.exerciseId]: { ...draft, reps: String(minutes * 60 + seconds), weight: "0" },
                                  });
                                }}
                              />
                            </label>
                          </>
                        ) : (
                          <>
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
                              <span>Kg</span>
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
                          </>
                        )}
                        <label>
                          <span>Esf.</span>
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
                        <button
                          className="btn-primary"
                          type="button"
                          disabled={busyId === exercise.exerciseId}
                          onClick={(event) => {
                            if (!timed && !event.currentTarget.form?.reportValidity()) {
                              return;
                            }
                            void onLog(
                              event,
                              exercise.exerciseId,
                              exercise.targetRestSeconds,
                              exercise.exerciseName,
                              timed,
                              totalSeconds
                            );
                          }}
                        >
                          Serie {done.length + 1}
                        </button>
                      </form>
                      ) : null}
                    </article>
                  );
                })}
              </section>
            ))}
          </div>
        </>
      ) : choosingDay ? null : (
        <div className="stack">
          {selectedSessions.length === 0 && !blockedReason ? (
            <p className="lede">Todavía no hay ejercicios cargados.</p>
          ) : null}
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
  const timedOf = new Map(routineExercises.map((exercise) => [exercise.exerciseId, exercise.measure === "TIEMPO"]));
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
            <div className="day-work-row" key={exerciseId}>
              <strong>{sets[0]?.exerciseName}</strong>
              <span className="set-chips">
                {sets.map((log) => (
                  <span className="set-chip" key={log.id}>
                    {timedOf.get(log.exerciseId)
                      ? formatDuration(log.durationSeconds ?? 0)
                      : `${log.repsCompleted} × ${formatKg(log.weightKg)}`}
                    {log.rpe ? ` · ${log.rpe}` : ""}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
