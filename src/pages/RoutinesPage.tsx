import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { routineDays, type Routine } from "../api/gym";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Toast } from "../components/Toast";

export function RoutinesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Routine | null>(null);

  useEffect(() => {
    const state = location.state as { notice?: string } | null;
    if (!state?.notice) {
      return;
    }
    setNotice(state.notice);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  async function reload() {
    setRoutines(await api.listRoutines());
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const next = await api.listRoutines();
        if (!cancelled) {
          setRoutines(next);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar las rutinas");
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

  async function onClone(routine: Routine) {
    setError(null);
    setNotice(null);
    try {
      await api.cloneRoutine(routine.id, `Copia de ${routine.title}`);
      setNotice("Rutina duplicada");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo duplicar la rutina");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    setSaving(true);
    try {
      await api.deleteRoutine(pendingDelete.id);
      setNotice("Rutina eliminada");
      setPendingDelete(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la rutina");
      setPendingDelete(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="session-card">
      <div className="page-toolbar">
        <h1>Rutinas</h1>
        <div className="form-actions">
          <Link className="btn-primary btn-inline" to="/admin/rutinas/nueva">
            Crear rutina
          </Link>
          <Link className="btn-ghost" to="/admin/rutinas/asignar">
            Asignar
          </Link>
        </div>
      </div>
      {error ? <p className="alert">{error}</p> : null}
      <Toast message={notice} onClose={() => setNotice(null)} />
      {loading ? (
        <p className="lede">Cargando…</p>
      ) : routines.length === 0 ? (
        <p className="lede">Todavía no hay rutinas.</p>
      ) : (
        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Rutina</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {routines.map((routine) => {
                const days = routineDays(routine.exercises).length;
                return (
                  <tr key={routine.id}>
                    <td>
                      <strong>{routine.title}</strong>
                      <p className="cell-note">{days === 1 ? "1 día" : `${days} días`}</p>
                    </td>
                    <td className="actions">
                      <Link className="text-btn" to={`/admin/rutinas/${routine.id}`}>
                        Ver
                      </Link>
                      <Link className="text-btn" to={`/admin/rutinas/${routine.id}/editar`}>
                        Editar
                      </Link>
                      <button type="button" className="text-btn" onClick={() => onClone(routine)}>
                        Duplicar
                      </button>
                      <button type="button" className="text-btn danger" onClick={() => setPendingDelete(routine)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={pendingDelete != null}
        title="Eliminar rutina"
        description={
          pendingDelete
            ? `Se va a borrar “${pendingDelete.title}”. Si tiene alumnos asignados o entrenamientos cargados, no se puede eliminar.`
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
