import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Routine } from "../api/gym";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { RoutineOutline } from "../components/RoutineBuilder";

export function StaffRoutineViewPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getRoutine(id)
      .then((next) => {
        if (!cancelled) {
          setRoutine(next);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar la rutina");
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
      await api.deleteRoutine(id);
      navigate("/admin/rutinas", { replace: true, state: { notice: "Rutina eliminada" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la rutina");
      setPendingDelete(false);
      setSaving(false);
    }
  }

  return (
    <>
      <section className="session-card">
        <div className="page-toolbar">
          <h1>{routine?.title ?? "Rutina"}</h1>
          <div className="form-actions">
            <Link className="btn-ghost" to="/admin/rutinas">
              Volver
            </Link>
            <Link className="btn-ghost" to={`/admin/rutinas/${id}/editar`}>
              Editar
            </Link>
            <Link className="btn-primary btn-inline" to={`/admin/rutinas/asignar?rutina=${id}`}>
              Asignar
            </Link>
          </div>
        </div>
        {error ? <p className="alert">{error}</p> : null}
        {loading ? <p className="lede">Cargando…</p> : null}
        {routine?.description ? <p className="lede">{routine.description}</p> : null}
        <div className="form-actions">
          <button type="button" className="text-btn danger" onClick={() => setPendingDelete(true)} disabled={!routine}>
            Eliminar
          </button>
        </div>
      </section>
      {routine ? <RoutineOutline exercises={routine.exercises} cards /> : null}
      <ConfirmDialog
        open={pendingDelete}
        title="Eliminar rutina"
        description={
          routine
            ? `Se va a borrar “${routine.title}”. Si tiene alumnos asignados o entrenamientos cargados, no se puede eliminar.`
            : null
        }
        confirmLabel="Eliminar"
        danger
        busy={saving}
        onCancel={() => setPendingDelete(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
