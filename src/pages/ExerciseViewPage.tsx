import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { MUSCLE_LABELS, type Exercise } from "../api/gym";
import { ConfirmDialog } from "../components/ConfirmDialog";

export function ExerciseViewPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getExercise(id)
      .then((next) => {
        if (!cancelled) {
          setExercise(next);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el ejercicio");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function confirmDelete() {
    setSaving(true);
    setError(null);
    try {
      await api.deleteExercise(id);
      navigate("/admin/ejercicios", { replace: true, state: { notice: "Ejercicio eliminado" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el ejercicio");
      setPendingDelete(false);
      setSaving(false);
    }
  }

  return (
    <section className="session-card">
      <div className="page-toolbar">
        <h1>{exercise?.name ?? "Ejercicio"}</h1>
        <div className="form-actions">
          <Link className="btn-ghost" to="/admin/ejercicios">
            Volver
          </Link>
          <Link className="btn-primary btn-inline" to={`/admin/ejercicios/${id}/editar`}>
            Editar
          </Link>
        </div>
      </div>
      {error ? <p className="alert">{error}</p> : null}
      {loading ? <p className="lede">Cargando…</p> : null}
      {exercise ? (
        <>
          <p className="cell-note">
            {MUSCLE_LABELS[exercise.muscleGroup]} · {exercise.measure === "TIEMPO" ? "Tiempo" : "Peso"}
          </p>
          {exercise.description ? <p className="lede">{exercise.description}</p> : <p className="lede">Sin descripción.</p>}
          {exercise.videoUrl ? (
            <p>
              <a href={exercise.videoUrl} target="_blank" rel="noreferrer">
                Ver video
              </a>
            </p>
          ) : null}
          <div className="form-actions">
            <button type="button" className="text-btn danger" onClick={() => setPendingDelete(true)}>
              Eliminar
            </button>
          </div>
        </>
      ) : null}
      <ConfirmDialog
        open={pendingDelete}
        title="Eliminar ejercicio"
        description={
          exercise
            ? `Se va a borrar “${exercise.name}” del catálogo. Si está en una rutina o en un registro, no se puede eliminar.`
            : null
        }
        confirmLabel="Eliminar"
        danger
        busy={saving}
        onCancel={() => setPendingDelete(false)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
