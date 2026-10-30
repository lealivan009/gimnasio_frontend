import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import { MUSCLE_GROUPS, MUSCLE_LABELS, type Exercise, type MuscleGroup } from "../api/gym";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Toast } from "../components/Toast";

const emptyForm = {
  name: "",
  description: "",
  muscleGroup: "PECHO" as MuscleGroup,
  videoUrl: "",
};

export function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<"" | MuscleGroup>("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Exercise | null>(null);

  async function load() {
    const data = await api.listExercises({
      q: query || undefined,
      muscleGroup: muscle || undefined,
    });
    setExercises(data);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        await load();
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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      muscleGroup: form.muscleGroup,
      videoUrl: form.videoUrl.trim() || null,
    };
    try {
      if (editingId) {
        await api.updateExercise(editingId, payload);
        setNotice("Ejercicio actualizado");
      } else {
        await api.createExercise(payload);
        setNotice("Ejercicio creado");
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el ejercicio");
    } finally {
      setSaving(false);
    }
  }

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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el ejercicio");
      setPendingDelete(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="session-card">
        <p className="eyebrow">Catálogo</p>
        <h1>Ejercicios</h1>
        <p className="lede">Alta, baja y modificación del catálogo que usan profesores y alumnos para armar rutinas.</p>
      </section>

      <form className="session-card" onSubmit={onSubmit}>
        <h2>{editingId ? "Editar ejercicio" : "Nuevo ejercicio"}</h2>
        {error ? <p className="alert">{error}</p> : null}
        <Toast message={notice} onClose={() => setNotice(null)} />
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Nombre</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </label>
          <label className="field">
            <span className="field-label">Grupo muscular</span>
            <select
              value={form.muscleGroup}
              onChange={(event) => setForm({ ...form, muscleGroup: event.target.value as MuscleGroup })}
            >
              {MUSCLE_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {MUSCLE_LABELS[group]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span className="field-label">Descripción</span>
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Cómo se hace, qué cuidar, respiración"
            rows={3}
          />
        </label>
        <label className="field">
          <span className="field-label">Enlace al video</span>
          <input
            value={form.videoUrl}
            onChange={(event) => setForm({ ...form, videoUrl: event.target.value })}
            placeholder="https://..."
          />
        </label>
        <div className="form-actions">
          <button className="btn-primary btn-inline" type="submit" disabled={saving}>
            {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear ejercicio"}
          </button>
          {editingId ? (
            <button
              className="btn-ghost"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancelar edición
            </button>
          ) : null}
        </div>
      </form>

      <section className="session-card table-card">
        <div className="table-toolbar">
          <label className="field table-search">
            <span className="field-label">Buscar</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre del ejercicio"
            />
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
                  <th>Video</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {exercises.map((exercise) => (
                  <tr key={exercise.id}>
                    <td>
                      <strong>{exercise.name}</strong>
                      {exercise.description ? <p className="cell-note">{exercise.description}</p> : null}
                    </td>
                    <td>{MUSCLE_LABELS[exercise.muscleGroup]}</td>
                    <td>
                      {exercise.videoUrl ? (
                        <a href={exercise.videoUrl} target="_blank" rel="noreferrer">
                          Ver video
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="actions">
                      <button
                        type="button"
                        className="text-btn"
                        onClick={() => {
                          setEditingId(exercise.id);
                          setForm({
                            name: exercise.name,
                            description: exercise.description ?? "",
                            muscleGroup: exercise.muscleGroup,
                            videoUrl: exercise.videoUrl ?? "",
                          });
                        }}
                      >
                        Editar
                      </button>
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
      </section>

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
    </>
  );
}
