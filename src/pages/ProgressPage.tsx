import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import {
  formatDate,
  formatKg,
  type Attendance,
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
  const [presentDates, setPresentDates] = useState<string[]>([]);
  const [weightKg, setWeightKg] = useState("");
  const [weightDate, setWeightDate] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [error, setError] = useState<string | null>(null);
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
        const [nextSummary, nextDays, nextPoints, nextWeights, attendance] = await Promise.all([
          api.statsSummary(owner),
          api.calendar(year, month, owner),
          exerciseId ? api.exerciseProgress(exerciseId, owner) : Promise.resolve([]),
          api.listWeights(owner),
          staff ? Promise.resolve([] as Attendance[]) : api.listAttendance(),
        ]);
        if (cancelled) {
          return;
        }
        setSummary(nextSummary);
        setDays(nextDays);
        setPoints(nextPoints);
        setWeights(nextWeights);
        if (!staff) {
          const dates = presentDays(attendance);
          setPresentDates(dates);
          setWeightDate((current) => (dates.includes(current) ? current : dates[0] ?? ""));
        }
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
  }, [staff, studentId, exerciseId, year, month]);

  function shiftMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  }

  const selectedStudent = students.find((student) => student.id === studentId);

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
        {staff ? null : presentDates.length === 0 ? (
          <p className="lede">Cuando el profesor marque tu presente, vas a poder cargar el peso de ese día.</p>
        ) : (
          <form
            className="form-grid"
            onSubmit={async (event) => {
              event.preventDefault();
              setSavingWeight(true);
              setError(null);
              try {
                await api.createWeight({ weightKg: Number(weightKg), recordedOn: weightDate });
                setWeightKg("");
                const next = await api.listWeights();
                setWeights(next);
              } catch (err) {
                setError(err instanceof Error ? err.message : "No se pudo guardar el peso");
              } finally {
                setSavingWeight(false);
              }
            }}
          >
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
            <label className="field">
              <span className="field-label">Día con presente</span>
              <select value={weightDate} onChange={(event) => setWeightDate(event.target.value)} required>
                {presentDates.map((date) => (
                  <option key={date} value={date}>
                    {formatDate(date)}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <button className="btn-primary btn-inline" type="submit" disabled={savingWeight || !weightDate}>
                {savingWeight ? "Guardando…" : "Cargar peso"}
              </button>
            </div>
          </form>
        )}
        {staff ? null : (
          <p className="hint left">Solo podés anotar el peso los días que tuviste presente.</p>
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
        <MonthCalendar year={year} month={month} days={days} onShift={shiftMonth} />
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

function presentDays(logs: Attendance[]) {
  const dates = new Set(
    logs.map((log) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(log.checkInTime))
    )
  );
  return [...dates].sort().reverse();
}
