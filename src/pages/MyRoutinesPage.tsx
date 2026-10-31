import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { assignmentState, formatDate, type Assignment, type Routine } from "../api/gym";
import { RoutineOutline } from "../components/RoutineBuilder";
import { Toast } from "../components/Toast";

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
        <h1>Mi rutina</h1>
        {error ? <p className="alert">{error}</p> : null}
        <Toast message={notice} onClose={() => setNotice(null)} />
        {loading ? (
          <p className="lede">Cargando…</p>
        ) : assignments.length === 0 ? (
          <p className="lede">Todavía no tenés una rutina asignada.</p>
        ) : (
          assignments.map((assignment) => {
            const routine = routines[assignment.routineId];
            return (
              <div className="routine-block" key={assignment.id}>
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
              </div>
            );
          })
        )}
      </section>

      <section className="session-card">
        <h2>Rutina propia</h2>
        <p className="lede">
          Si querés, podés armarte una rutina con el catálogo del gimnasio. Queda marcada como personalizada.
        </p>
        <div className="form-actions">
          <Link className="btn-ghost" to="/alumno/mis-rutinas/nueva">
            Crear rutina propia
          </Link>
        </div>
      </section>
    </>
  );
}
