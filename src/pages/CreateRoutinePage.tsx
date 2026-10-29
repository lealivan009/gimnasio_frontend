import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { todayIso, type Exercise } from "../api/gym";
import { draftsToPayload, emptyDay, RoutineBuilder, type DraftDay } from "../components/RoutineBuilder";

export function CreateRoutinePage() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<Exercise[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState<DraftDay[]>([emptyDay()]);
  const [expirationDate, setExpirationDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .listExercises()
      .then((next) => {
        if (!cancelled) {
          setCatalog(next);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el catálogo");
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
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createRoutine({
        title: title.trim(),
        description: description.trim() || null,
        exercises: draftsToPayload(days),
        startDate: todayIso(),
        expirationDate: expirationDate || null,
      });
      navigate("/alumno/mis-rutinas", { replace: true, state: { notice: "Rutina personalizada creada y activada." } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la rutina");
      setSaving(false);
    }
  }

  return (
    <>
      <section className="session-card">
        <p className="eyebrow">Alumno</p>
        <h1>Crear rutina propia</h1>
        <p className="lede">Armala con el catálogo del gimnasio. Queda activa desde hoy y marcada como personalizada.</p>
      </section>

      <form className="session-card" onSubmit={onCreate}>
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
            placeholder="Para qué la vas a usar"
          />
        </label>
        <label className="field">
          <span className="field-label">Vencimiento (opcional)</span>
          <input type="date" value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} />
        </label>
        {catalog.length === 0 && !loading ? (
          <p className="lede">El catálogo de ejercicios todavía está vacío.</p>
        ) : catalog.length > 0 ? (
          <RoutineBuilder days={days} catalog={catalog} onChange={setDays} />
        ) : null}
        <div className="form-actions">
          <button className="btn-primary btn-inline" type="submit" disabled={saving || catalog.length === 0}>
            {saving ? "Guardando…" : "Crear y activar"}
          </button>
          <Link className="btn-ghost" to="/alumno/mis-rutinas">
            Volver
          </Link>
        </div>
      </form>
    </>
  );
}
