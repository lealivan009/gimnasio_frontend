import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import {
  assignmentState,
  formatDate,
  todayIso,
  type Assignment,
  type Exercise,
  type Routine,
} from "../api/gym";
import { draftsToPayload, emptyDay, RoutineBuilder, RoutineOutline, type DraftDay } from "../components/RoutineBuilder";

export function MyRoutinesPage() {
  const [catalog, setCatalog] = useState<Exercise[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState<DraftDay[]>([emptyDay()]);
  const [expirationDate, setExpirationDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function reload() {
    const [nextCatalog, nextRoutines, nextAssignments] = await Promise.all([
      api.listExercises(),
      api.listRoutines(),
      api.listAssignments(),
    ]);
    setCatalog(nextCatalog);
    setRoutines(nextRoutines);
    setAssignments(nextAssignments);
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
          setError(err instanceof Error ? err.message : "No se pudieron cargar tus rutinas");
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

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await api.createRoutine({
        title: title.trim(),
        description: description.trim() || null,
        exercises: draftsToPayload(days),
        startDate: todayIso(),
        expirationDate: expirationDate || null,
      });
      setTitle("");
      setDescription("");
      setExpirationDate("");
      setDays([emptyDay()]);
      setNotice("Rutina personalizada creada y activada.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la rutina");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="session-card">
        <p className="eyebrow">Alumno</p>
        <h1>Mis rutinas</h1>
        <p className="lede">
          Podés usar la del profesor o armarte una propia con el catálogo del gimnasio. Las tuyas quedan marcadas como
          personalizadas.
        </p>
      </section>

      <section className="session-card">
        <h2>Asignadas</h2>
        {error ? <p className="alert">{error}</p> : null}
        {notice ? <p className="alert ok">{notice}</p> : null}
        {loading ? (
          <p className="lede">Cargando…</p>
        ) : assignments.length === 0 ? (
          <p className="lede">Todavía no tenés rutinas asignadas.</p>
        ) : (
          <div className="stack">
            {assignments.map((assignment) => (
              <article className="routine-card" key={assignment.id}>
                <div className="routine-card-head">
                  <strong>{assignment.routineTitle}</strong>
                  {assignment.customStudent ? (
                    <span className="pill custom">Personalizada por el alumno</span>
                  ) : (
                    <span className="pill on">Profesor</span>
                  )}
                </div>
                <p className="cell-note">
                  Desde {formatDate(assignment.startDate)}
                  {assignment.expirationDate ? ` hasta ${formatDate(assignment.expirationDate)}` : " · sin vencimiento"}
                  {" · "}
                  {assignmentState(assignment).toLowerCase()}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <form className="session-card" onSubmit={onCreate}>
        <h2>Crear rutina propia</h2>
        <label className="field">
          <span className="field-label">Título</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label">Descripción</span>
          <textarea
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Para qué la vas a usar"
          />
        </label>
        <label className="field">
          <span className="field-label">Vencimiento (opcional)</span>
          <input type="date" value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} />
        </label>
        {catalog.length === 0 ? (
          <p className="lede">El catálogo de ejercicios todavía está vacío.</p>
        ) : (
          <RoutineBuilder days={days} catalog={catalog} onChange={setDays} />
        )}
        <button className="btn-primary btn-inline" type="submit" disabled={saving || catalog.length === 0}>
          {saving ? "Guardando…" : "Crear y activar"}
        </button>
      </form>

      {routines.length > 0 ? (
        <section className="session-card">
          <h2>Detalle de tus rutinas</h2>
          <div className="stack">
            {routines.map((routine) => (
              <article className="routine-card" key={routine.id}>
                <div className="routine-card-head">
                  <strong>{routine.title}</strong>
                  <span className="pill custom">Personalizada por el alumno</span>
                </div>
                <RoutineOutline exercises={routine.exercises} />
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
