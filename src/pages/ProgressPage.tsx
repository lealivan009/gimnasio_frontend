import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import {
  formatDate,
  formatKg,
  shiftIso,
  todayIso,
  type CalendarDay,
  type Exercise,
  type ProgressPoint,
  type StatsSummary,
  type StudentFollow,
  type WeightLog,
} from "../api/gym";
import { isStaff } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { LineChart } from "../components/LineChart";
import { MonthCalendar } from "../components/MonthCalendar";
import { Toast } from "../components/Toast";

export function ProgressPage() {
  const { user } = useAuth();
  const staff = isStaff(user?.role);
  const [params, setParams] = useSearchParams();
  const requestedStudent = params.get("alumno") ?? "";
  const [students, setStudents] = useState<StudentFollow[]>([]);
  const [studentId, setStudentId] = useState(requestedStudent);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseId, setExerciseId] = useState("");
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [points, setPoints] = useState<ProgressPoint[]>([]);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [weightKg, setWeightKg] = useState("");
  const [weightDate, setWeightDate] = useState(todayIso);
  const [showWeightCalendar, setShowWeightCalendar] = useState(false);
  const [savingWeight, setSavingWeight] = useState(false);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const catalog = await api.listExercises();
        if (cancelled) {
          return;
        }
        setExercises(catalog);
        setExerciseId((current) => current || catalog[0]?.id || "");
        if (staff) {
          const list = await api.listStudentFollow();
          if (cancelled) {
            return;
          }
          setStudents(list);
          const nextId = requestedStudent || list[0]?.id || "";
          setStudentId((current) => current || nextId);
          if (!nextId) {
            setLoading(false);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el progreso");
          setLoading(false);
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [staff, requestedStudent]);

  useEffect(() => {
    if (staff && !studentId) {
      return;
    }
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const owner = staff ? studentId : undefined;
        const [nextSummary, nextDays, nextPoints, nextWeights] = await Promise.all([
          api.statsSummary(owner),
          api.calendar(year, month, owner),
          exerciseId ? api.exerciseProgress(exerciseId, owner) : Promise.resolve([]),
          api.listWeights(owner),
        ]);
        if (cancelled) {
          return;
        }
        setSummary(nextSummary);
        setDays(nextDays);
        setPoints(nextPoints);
        setWeights(nextWeights);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el progreso");
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
  }, [staff, studentId, exerciseId, year, month, revision]);

  function shiftMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  }

  const selectedStudent = students.find((student) => student.id === studentId);
  const today = todayIso();
  const oldestPresent = shiftIso(today, -7);
  const selected = days.find((day) => day.date === selectedDate) ?? null;

  async function markPresent() {
    if (!selected || selected.attended || selected.date > today || selected.date < oldestPresent) {
      return;
    }
    if (staff && !studentId) {
      return;
    }
    setMarking(true);
    setError(null);
    setNotice(null);
    try {
      const past = selected.date === today ? undefined : selected.date;
      if (staff) {
        await api.staffCheckIn(studentId, past);
      } else {
        await api.checkIn(past);
      }
      setNotice("Presente cargado");
      setRevision((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo marcar el presente");
    } finally {
      setMarking(false);
    }
  }

  return (
    <>
      <section className="session-card home-brief">
        <div>
          <p className="eyebrow">Progreso</p>
          <h1>{staff ? "Progreso del alumno" : "Tu progreso"}</h1>
        </div>
        {staff ? (
          <label className="field">
            <span className="field-label">Alumno</span>
            <select
              value={studentId}
              onChange={(event) => {
                setStudentId(event.target.value);
                setParams({ alumno: event.target.value });
              }}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.lastName}, {student.firstName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {selectedStudent ? (
          <p className="lede">
            {selectedStudent.firstName} {selectedStudent.lastName}
          </p>
        ) : null}
        {error ? <p className="alert">{error}</p> : null}
        <Toast message={notice} onClose={() => setNotice(null)} />
        {loading && !summary ? <p className="lede">Cargando…</p> : null}
        {summary ? (
          <div className="progress-facts">
            <div>
              <p className="eyebrow">Racha</p>
              <strong>{summary.weeklyStreak}</strong>
              <p>semanas</p>
            </div>
            <div>
              <p className="eyebrow">Esta semana</p>
              <strong>{summary.workoutsThisWeek}</strong>
              <p>series</p>
            </div>
            <div>
              <p className="eyebrow">Asistencia</p>
              <strong>{summary.attendanceDaysThisMonth}</strong>
              <p>días del mes</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="session-card">
        <h2>Peso corporal</h2>
        {staff ? null : (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const recordedOn = showWeightCalendar ? weightDate : today;
              if (recordedOn > today) {
                setError("No podés cargar el peso de un día que todavía no llegó.");
                return;
              }
              setSavingWeight(true);
              setError(null);
              try {
                await api.createWeight({ weightKg: Number(weightKg), recordedOn });
                setWeightKg("");
                setNotice("Peso cargado");
                const next = await api.listWeights();
                setWeights(next);
              } catch (err) {
                setError(err instanceof Error ? err.message : "No se pudo guardar el peso");
              } finally {
                setSavingWeight(false);
              }
            }}
          >
            <div className="weight-log">
              <label className="field">
                <span className="field-label">Peso (kg)</span>
                <input
                  type="number"
                  min={20}
                  max={400}
                  step="0.1"
                  value={weightKg}
                  onChange={(event) => setWeightKg(event.target.value)}
                  required
                />
              </label>
              <button className="btn-primary btn-inline" type="submit" disabled={savingWeight || !weightKg}>
                {savingWeight ? "Guardando…" : "Cargar"}
              </button>
            </div>
            <div className="weight-meta">
              <p>{showWeightCalendar ? formatDate(weightDate) : `Hoy · ${formatDate(today)}`}</p>
              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  setShowWeightCalendar((open) => !open);
                  setWeightDate((current) => (current > today ? today : current || today));
                }}
              >
                {showWeightCalendar ? "Usar hoy" : "Otro día"}
              </button>
            </div>
            {showWeightCalendar ? (
              <MonthCalendar
                year={year}
                month={month}
                days={days}
                onShift={shiftMonth}
                selectedDate={weightDate}
                maxDate={today}
                heading=""
                legend={false}
                onSelect={(date) => {
                  if (date > today) {
                    return;
                  }
                  setWeightDate(date);
                }}
              />
            ) : null}
          </form>
        )}
        <LineChart
          label="Evolución del peso corporal"
          unit="kg"
          points={weights.map((item) => ({ label: formatDate(item.recordedOn), value: Number(item.weightKg) }))}
        />
      </section>

      <section className="session-card">
        <h2>Evolución por ejercicio</h2>
        <label className="field">
          <span className="field-label">Ejercicio</span>
          <select value={exerciseId} onChange={(event) => setExerciseId(event.target.value)}>
            {exercises.length === 0 ? <option value="">Sin ejercicios</option> : null}
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>
        </label>
        <div className="gym-charts">
          <div>
            <h3>Peso máximo</h3>
            <LineChart
              label="Peso máximo por día"
              unit="kg"
              points={points.map((point) => ({ label: formatDate(point.date), value: Number(point.maxWeightKg) }))}
            />
          </div>
          <div>
            <h3>Volumen</h3>
            <LineChart
              label="Volumen por día"
              unit="kg"
              points={points.map((point) => ({ label: formatDate(point.date), value: Number(point.volumeKg) }))}
            />
          </div>
        </div>
      </section>

      <section className="session-card">
        <MonthCalendar
          year={year}
          month={month}
          days={days}
          onShift={shiftMonth}
          selectedDate={selectedDate}
          onSelect={(date) => {
            if (date > todayIso()) {
              return;
            }
            setSelectedDate(date);
          }}
          maxDate={todayIso()}
        />
        <p className="hint left">Tocá un día para cargar el presente. Podés hacerlo hasta 7 días hacia atrás.</p>
        {selected ? <CalendarPresent day={selected} marking={marking} onMark={markPresent} /> : null}
      </section>

      <section className="session-card">
        <h2>Marcas personales</h2>
        {summary && summary.records.length > 0 ? (
          <ul className="plain-list">
            {summary.records.map((record) => (
              <li key={record.exerciseId}>
                <strong>{record.exerciseName}</strong>
                <span>
                  {formatKg(record.maxWeightKg)} · {formatDate(record.achievedAt.slice(0, 10))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="lede">Todavía no hay récords de peso.</p>
        )}
      </section>
    </>
  );
}

function CalendarPresent({
  day,
  marking,
  onMark,
}: {
  day: CalendarDay;
  marking: boolean;
  onMark: () => void;
}) {
  const today = todayIso();
  const oldest = shiftIso(today, -7);
  if (day.attended) {
    return <p className="lede">{formatDate(day.date)} ya tiene el presente.</p>;
  }
  if (day.date > today) {
    return <p className="lede">Ese día todavía no llegó.</p>;
  }
  if (day.date < oldest) {
    return <p className="lede">Ese día queda afuera de los 7 días.</p>;
  }
  return (
    <button className="btn-primary btn-inline" type="button" disabled={marking} onClick={onMark}>
      {marking ? "Guardando…" : `Marcar presente · ${formatDate(day.date)}`}
    </button>
  );
}
