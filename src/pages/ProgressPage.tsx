import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import {
  formatDate,
  formatDuration,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  todayIso,
  type CalendarDay,
  type PersonalRecord,
  type ProgressPoint,
  type StatsSummary,
  type StudentFollow,
  type WeightLog,
} from "../api/gym";
import { isStaff } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { LineChart } from "../components/LineChart";
import { MonthCalendar } from "../components/MonthCalendar";
import { SkeletonLines } from "../components/Skeleton";
import { Toast } from "../components/Toast";

export function ProgressPage() {
  const { user } = useAuth();
  const staff = isStaff(user?.role);
  const [params, setParams] = useSearchParams();
  const requestedStudent = params.get("alumno") ?? "";
  const [students, setStudents] = useState<StudentFollow[]>([]);
  const [studentId, setStudentId] = useState(requestedStudent);
  const [exerciseId, setExerciseId] = useState("");
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [series, setSeries] = useState<{ exerciseId: string; points: ProgressPoint[] } | null>(null);
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
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
        const [nextSummary, nextDays, nextWeights] = await Promise.all([
          api.statsSummary(owner),
          api.calendar(year, month, owner),
          api.listWeights(owner),
        ]);
        if (cancelled) {
          return;
        }
        setSummary(nextSummary);
        setDays(nextDays);
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
  }, [staff, studentId, year, month]);

  useEffect(() => {
    if (!exerciseId || (staff && !studentId)) {
      setSeries(null);
      return;
    }
    let cancelled = false;
    const owner = staff ? studentId : undefined;
    api
      .exerciseProgress(exerciseId, owner)
      .then((nextPoints) => {
        if (!cancelled) {
          setSeries({ exerciseId, points: nextPoints });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar la evolución");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [exerciseId, staff, studentId]);

  function shiftMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  }

  const today = todayIso();

function looseRecords(records: PersonalRecord[]) {
  const loose = records
    .filter((record) => !record.muscleGroup || !MUSCLE_GROUPS.some((group) => group === record.muscleGroup))
    .sort((left, right) => left.exerciseName.localeCompare(right.exerciseName, "es"));
  if (loose.length === 0) {
    return [];
  }
  return [{ key: "otros", label: records.some((record) => record.muscleGroup) ? "Otros" : "", records: loose }];
}
  const recordSections = summary
    ? [
        ...MUSCLE_GROUPS.filter((group) => summary.records.some((record) => record.muscleGroup === group)).map((group) => ({
          key: group,
          label: MUSCLE_LABELS[group],
          records: summary.records
            .filter((record) => record.muscleGroup === group)
            .sort((left, right) => left.exerciseName.localeCompare(right.exerciseName, "es")),
        })),
        ...looseRecords(summary.records),
      ]
    : [];

  return (
    <>
      <Toast message={notice} onClose={() => setNotice(null)} />
      {staff ? (
        <section className="session-card">
          <label className="field">
            <span className="field-label">Alumno</span>
            <select
              value={studentId}
              onChange={(event) => {
                setStudentId(event.target.value);
                setExerciseId("");
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
        </section>
      ) : null}
      {error ? <p className="alert">{error}</p> : null}

      <section className="session-card">
        <h2>Marcas personales</h2>
        {summary && summary.records.length > 0 ? (
          recordSections.map((group) => (
            <section className="record-group" key={group.key}>
              {group.label ? <p className="eyebrow">{group.label}</p> : null}
              <ul className="record-list">
                {group.records.map((record) => {
                    const open = exerciseId === record.exerciseId;
                    return (
                      <li key={record.exerciseId} className={open ? "is-open" : undefined}>
                        <button
                          type="button"
                          className="record-row"
                          aria-expanded={open}
                          onClick={() => setExerciseId(open ? "" : record.exerciseId)}
                        >
                          <div className="record-copy">
                            <strong>{record.exerciseName}</strong>
                            <span>{formatDate(record.achievedAt.slice(0, 10))}</span>
                          </div>
                          <span className="record-kg">
                            {record.measure === "TIEMPO" ? (
                              formatDuration(record.maxSeconds ?? 0)
                            ) : (
                              <>
                                {new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(Number(record.maxWeightKg))}
                                <small>kg</small>
                              </>
                            )}
                          </span>
                        </button>
                        {open ? (
                          <div className="record-chart">
                            {series?.exerciseId === record.exerciseId ? (
                              record.measure === "TIEMPO" ? (
                                <>
                                  <h3>Duración máxima</h3>
                                  <LineChart
                                    label={`Duración máxima de ${record.exerciseName}`}
                                    unit="s"
                                    points={series.points.map((point) => ({
                                      label: formatDate(point.date),
                                      value: Number(point.maxSeconds ?? 0),
                                    }))}
                                  />
                                </>
                              ) : (
                                <div className="record-charts">
                                  <div>
                                    <h3>Peso máximo</h3>
                                    <LineChart
                                      label={`Peso máximo de ${record.exerciseName}`}
                                      unit="kg"
                                      points={series.points.map((point) => ({
                                        label: formatDate(point.date),
                                        value: Number(point.maxWeightKg),
                                      }))}
                                    />
                                  </div>
                                  <div>
                                    <h3>Repeticiones con ese peso</h3>
                                    <LineChart
                                      label={`Repeticiones de ${record.exerciseName}`}
                                      unit="reps"
                                      points={series.points.map((point) => ({
                                        label: formatDate(point.date),
                                        value: Number(point.maxReps ?? 0),
                                      }))}
                                    />
                                  </div>
                                </div>
                              )
                            ) : (
                              <span className="skeleton skeleton-chart" />
                            )}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
              </ul>
            </section>
          ))
        ) : loading && !summary ? (
          <SkeletonLines count={4} />
        ) : (
          <p className="lede">Todavía no hay marcas.</p>
        )}
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
    </>
  );
}

