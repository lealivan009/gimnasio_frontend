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
                <p className="routine-block-title">{assignment.routineTitle}</p>
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
        <p className="routine-own">
          <Link className="text-btn" to="/alumno/mis-rutinas/nueva">
            Crear rutina propia
          </Link>
        </p>
      </section>
    </>
  );
}
