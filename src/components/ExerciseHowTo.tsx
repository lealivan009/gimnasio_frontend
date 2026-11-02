import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";
import type { Exercise } from "../api/gym";

export function ExerciseHowTo({
  exerciseId,
  name,
  notes,
}: {
  exerciseId: string;
  name: string;
  notes?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open || exercise) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getExercise(exerciseId)
      .then((result) => {
        if (!cancelled) {
          setExercise(result);
        }
      })
      .catch((err: unknown) => {
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
  }, [open, exercise, exerciseId]);

  const video = exercise?.videoUrl && /^https?:\/\//i.test(exercise.videoUrl) ? exercise.videoUrl : null;

  return (
    <>
      <button
        type="button"
        className="info-btn"
        aria-label={`Cómo hacer ${name}`}
        onClick={() => setOpen(true)}
      >
        i
      </button>
      {open
        ? createPortal(
            <div className="modal-root" role="presentation">
              <button type="button" className="modal-backdrop" aria-label="Cerrar" onClick={() => setOpen(false)} />
              <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="exercise-how-title">
                <p className="eyebrow">Cómo hacerlo</p>
                <h2 id="exercise-how-title">{name}</h2>
                {loading ? <p className="lede">Cargando…</p> : null}
                {error ? <p className="alert">{error}</p> : null}
                {!loading && !error ? (
                  <div className="exercise-how">
                    <p>{exercise?.description?.trim() || "Todavía no hay una explicación de cómo hacerlo."}</p>
                    {notes?.trim() ? (
                      <p>
                        <span>Nota</span>
                        {notes.trim()}
                      </p>
                    ) : null}
                    {video ? (
                      <a className="text-btn" href={video} target="_blank" rel="noreferrer">
                        Ver video
                      </a>
                    ) : null}
                  </div>
                ) : null}
                <div className="modal-actions">
                  <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                    Cerrar
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
