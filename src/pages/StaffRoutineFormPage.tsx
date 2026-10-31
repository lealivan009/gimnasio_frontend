import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Exercise } from "../api/gym";
import { draftsToPayload, emptyDay, RoutineBuilder, routineToDrafts, type DraftDay } from "../components/RoutineBuilder";

export function StaffRoutineFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<Exercise[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState<DraftDay[]>([emptyDay()]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const [exercises, routine] = await Promise.all([
          api.listExercises(),
          id ? api.getRoutine(id) : Promise.resolve(null),
        ]);
        if (cancelled) {
          return;
        }
        setCatalog(exercises);
        if (routine) {
          setTitle(routine.title);
          setDescription(routine.description ?? "");
          setDays(routineToDrafts(routine.exercises));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar la rutina");
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
  }, [id]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      exercises: draftsToPayload(days),
    };
    try {
      if (id) {
        await api.updateRoutine(id, payload);
        navigate("/admin/rutinas", { replace: true, state: { notice: "Rutina actualizada" } });
      } else {
        await api.createRoutine(payload);
        navigate("/admin/rutinas", { replace: true, state: { notice: "Rutina creada" } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la rutina");
      setSaving(false);
    }
  }

  return (
    <>
      <section className="session-card">
        <div className="page-toolbar">
          <h1>{id ? "Editar rutina" : "Crear rutina"}</h1>
          <Link className="btn-ghost" to="/admin/rutinas">
            Volver
          </Link>
        </div>
      </section>
      <form className="session-card" onSubmit={onSubmit}>
        {error ? <p className="alert">{error}</p> : null}
        {loading ? <p className="lede">Cargando…</p> : null}
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
            placeholder="Objetivo de la rutina"
          />
        </label>
        {catalog.length === 0 && !loading ? (
          <p className="lede">Primero cargá ejercicios en el catálogo.</p>
        ) : catalog.length > 0 ? (
          <RoutineBuilder days={days} catalog={catalog} onChange={setDays} />
        ) : null}
        <div className="form-actions">
          <button className="btn-primary btn-inline" type="submit" disabled={saving || loading || catalog.length === 0}>
            {saving ? "Guardando…" : id ? "Guardar cambios" : "Crear rutina"}
          </button>
        </div>
      </form>
    </>
  );
}
