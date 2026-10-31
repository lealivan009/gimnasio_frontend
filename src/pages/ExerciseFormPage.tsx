import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { MUSCLE_GROUPS, MUSCLE_LABELS, type MuscleGroup } from "../api/gym";

export function ExerciseFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>("PECHO");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    api
      .getExercise(id)
      .then((exercise) => {
        if (cancelled) {
          return;
        }
        setName(exercise.name);
        setDescription(exercise.description ?? "");
        setMuscleGroup(exercise.muscleGroup);
        setVideoUrl(exercise.videoUrl ?? "");
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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      muscleGroup,
      videoUrl: videoUrl.trim() || null,
    };
    try {
      if (id) {
        await api.updateExercise(id, payload);
        navigate("/admin/ejercicios", { replace: true, state: { notice: "Ejercicio actualizado" } });
      } else {
        await api.createExercise(payload);
        navigate("/admin/ejercicios", { replace: true, state: { notice: "Ejercicio creado" } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el ejercicio");
      setSaving(false);
    }
  }

  return (
    <>
      <section className="session-card">
        <div className="page-toolbar">
          <h1>{id ? "Editar ejercicio" : "Crear ejercicio"}</h1>
          <Link className="btn-ghost" to="/admin/ejercicios">
            Volver
          </Link>
        </div>
      </section>
      <form className="session-card" onSubmit={onSubmit}>
        {error ? <p className="alert">{error}</p> : null}
        {loading ? <p className="lede">Cargando…</p> : null}
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Nombre</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="field">
            <span className="field-label">Grupo muscular</span>
            <select value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value as MuscleGroup)}>
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
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Cómo se hace, qué cuidar, respiración"
            rows={3}
          />
        </label>
        <label className="field">
          <span className="field-label">Enlace al video</span>
          <input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://..." />
        </label>
        <div className="form-actions">
          <button className="btn-primary btn-inline" type="submit" disabled={saving || loading}>
            {saving ? "Guardando…" : id ? "Guardar cambios" : "Crear ejercicio"}
          </button>
        </div>
      </form>
    </>
  );
}
