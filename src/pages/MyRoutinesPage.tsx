import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { assignmentState, formatDate, type Assignment, type Routine } from "../api/gym";
import { RoutineOutline } from "../components/RoutineBuilder";

export function MyRoutinesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [routines, setRoutines] = useState<Record<string, Routine>>({});
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const state = location.state as { notice?: string } | null;
    if (!state?.notice) {
      return;
    }
    setNotice(state.notice);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const nextAssignments = await api.listAssignments();
        const ids = [...new Set(nextAssignments.map((assignment) => assignment.routineId))];
        const loaded = await Promise.all(ids.map((id) => api.getRoutine(id)));
        if (!cancelled) {
          setAssignments(nextAssignments);
          setRoutines(Object.fromEntries(loaded.map((routine) => [routine.id, routine])));
        }
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

  return (
    <>
      <section className="session-card">
        <p className="eyebrow">Alumno</p>
        <h1>Mis rutinas</h1>
        <p className="lede">
          Podés usar la del profesor o armarte una propia con el catálogo del gimnasio. Las tuyas quedan marcadas como
          personalizadas.
        </p>
        <div className="form-actions">
          <Link className="btn-primary btn-inline" to="/alumno/mis-rutinas/nueva">
            Crear rutina propia
          </Link>
        </div>
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
            {assignments.map((assignment) => {
              const routine = routines[assignment.routineId];
              return (
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
                  {routine?.description ? <p className="lede">{routine.description}</p> : null}
                  {routine ? <RoutineOutline exercises={routine.exercises} /> : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
