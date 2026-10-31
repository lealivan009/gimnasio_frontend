import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { MUSCLE_GROUPS, MUSCLE_LABELS, type Exercise, type MuscleGroup } from "../api/gym";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Toast } from "../components/Toast";

export function ExercisesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<"" | MuscleGroup>("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Exercise | null>(null);

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
        const data = await api.listExercises({
          q: query || undefined,
          muscleGroup: muscle || undefined,
        });
        if (!cancelled) {
          setExercises(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar los ejercicios");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    const handle = window.setTimeout(run, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, muscle]);

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.deleteExercise(pendingDelete.id);
      setNotice("Ejercicio eliminado");
      setPendingDelete(null);
      const data = await api.listExercises({
        q: query || undefined,
        muscleGroup: muscle || undefined,
      });
      setExercises(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el ejercicio");
      setPendingDelete(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="session-card">
      <div className="page-toolbar">
        <h1>Ejercicios</h1>
        <Link className="btn-primary btn-inline" to="/admin/ejercicios/nuevo">
          Crear ejercicio
        </Link>
      </div>
      {error ? <p className="alert">{error}</p> : null}
      <Toast message={notice} onClose={() => setNotice(null)} />
      <div className="table-toolbar">
        <label className="field table-search">
          <span className="field-label">Buscar</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre del ejercicio" />
        </label>
        <label className="field">
          <span className="field-label">Grupo</span>
          <select value={muscle} onChange={(event) => setMuscle(event.target.value as "" | MuscleGroup)}>
            <option value="">Todos</option>
            {MUSCLE_GROUPS.map((group) => (
              <option key={group} value={group}>
                {MUSCLE_LABELS[group]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <p className="lede">Cargando…</p>
      ) : exercises.length === 0 ? (
        <p className="lede">No hay ejercicios con esos criterios.</p>
      ) : (
        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Grupo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {exercises.map((exercise) => (
                <tr key={exercise.id}>
                  <td>
                    <strong>{exercise.name}</strong>
                  </td>
                  <td>{MUSCLE_LABELS[exercise.muscleGroup]}</td>
                  <td className="actions">
                    <Link className="text-btn" to={`/admin/ejercicios/${exercise.id}`}>
                      Ver
                    </Link>
                    <Link className="text-btn" to={`/admin/ejercicios/${exercise.id}/editar`}>
                      Editar
                    </Link>
                    <button type="button" className="text-btn danger" onClick={() => setPendingDelete(exercise)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={pendingDelete != null}
        title="Eliminar ejercicio"
        description={
          pendingDelete
            ? `Se va a borrar “${pendingDelete.name}” del catálogo. Si está en una rutina o en un registro, no se puede eliminar.`
            : null
        }
        confirmLabel="Eliminar"
        danger
        busy={saving}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
