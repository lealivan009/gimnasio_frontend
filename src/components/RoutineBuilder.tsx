import type { Exercise, RoutineExercise, RoutineExerciseInput } from "../api/gym";
import { dayTitle, MUSCLE_GROUPS, MUSCLE_LABELS, routineDays } from "../api/gym";

export interface DraftExercise {
  key: string;
  exerciseId: string;
  targetSets: string;
  targetReps: string;
  targetRestSeconds: string;
  notes: string;
}

export interface DraftDay {
  key: string;
  label: string;
  rows: DraftExercise[];
}

export function emptyDraft(): DraftExercise {
  return {
    key: crypto.randomUUID(),
    exerciseId: "",
    targetSets: "3",
    targetReps: "10",
    targetRestSeconds: "60",
    notes: "",
  };
}

export function emptyDay(): DraftDay {
  return { key: crypto.randomUUID(), label: "", rows: [emptyDraft()] };
}

export function routineToDrafts(exercises: RoutineExercise[]): DraftDay[] {
  const days = routineDays(exercises);
  if (days.length === 0) {
    return [emptyDay()];
  }
  return days.map((day) => ({
    key: crypto.randomUUID(),
    label: day.label ?? "",
    rows: day.exercises.map((exercise) => ({
      key: exercise.id,
      exerciseId: exercise.exerciseId,
      targetSets: String(exercise.targetSets),
      targetReps: String(exercise.targetReps),
      targetRestSeconds: String(exercise.targetRestSeconds),
      notes: exercise.notes ?? "",
    })),
  }));
}

export function draftsToPayload(days: DraftDay[]): RoutineExerciseInput[] {
  let order = 0;
  return days.flatMap((day, dayIndex) =>
    day.rows.map((row) => ({
      exerciseId: row.exerciseId,
      orderIndex: order++,
      targetSets: Number(row.targetSets),
      targetReps: Number(row.targetReps),
      targetRestSeconds: Number(row.targetRestSeconds),
      notes: row.notes.trim() || null,
      dayNumber: dayIndex + 1,
      dayLabel: day.label.trim() || null,
    }))
  );
}

export function RoutineBuilder({
  days,
  catalog,
  onChange,
}: {
  days: DraftDay[];
  catalog: Exercise[];
  onChange: (days: DraftDay[]) => void;
}) {
  function updateDay(key: string, patch: Partial<DraftDay>) {
    onChange(days.map((day) => (day.key === key ? { ...day, ...patch } : day)));
  }

  function updateRow(dayKey: string, rowKey: string, patch: Partial<DraftExercise>) {
    onChange(
      days.map((day) =>
        day.key === dayKey
          ? { ...day, rows: day.rows.map((row) => (row.key === rowKey ? { ...row, ...patch } : row)) }
          : day
      )
    );
  }

  return (
    <div className="day-stack">
      <p className="hint left">
        Una rutina puede ser de un solo día o de varios, por ejemplo 3, 5 o 6. Cada día lleva sus ejercicios. El alumno
        elige cuál está haciendo cuando carga el entrenamiento, sin importar si es lunes o viernes.
      </p>
      {days.map((day, dayIndex) => (
        <section className="day-block" key={day.key}>
          <div className="routine-row-head">
            <strong>Día {dayIndex + 1}</strong>
            <button
              type="button"
              className="text-btn"
              onClick={() => onChange(days.filter((item) => item.key !== day.key))}
              disabled={days.length === 1}
            >
              Quitar día
            </button>
          </div>
          <label className="field">
            <span className="field-label">{days.length > 1 ? "Nombre del día" : "Nombre del día (opcional)"}</span>
            <input
              value={day.label}
              onChange={(event) => updateDay(day.key, { label: event.target.value })}
              placeholder="Pecho y bíceps"
              required={days.length > 1}
            />
          </label>
          {day.rows.map((row, rowIndex) => (
            <div className="routine-row" key={row.key}>
              <div className="routine-row-head">
                <strong>Ejercicio {rowIndex + 1}</strong>
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => updateDay(day.key, { rows: day.rows.filter((item) => item.key !== row.key) })}
                  disabled={day.rows.length === 1}
                >
                  Quitar
                </button>
              </div>
              <label className="field">
                <span className="field-label">Ejercicio del catálogo</span>
                <select
                  value={row.exerciseId}
                  onChange={(event) => updateRow(day.key, row.key, { exerciseId: event.target.value })}
                  required
                >
                  <option value="">Elegí un ejercicio</option>
                  {catalog.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name} · {MUSCLE_LABELS[exercise.muscleGroup]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-grid triple">
                <label className="field">
                  <span className="field-label">Series</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={row.targetSets}
                    onChange={(event) => updateRow(day.key, row.key, { targetSets: event.target.value })}
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Repeticiones</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={row.targetReps}
                    onChange={(event) => updateRow(day.key, row.key, { targetReps: event.target.value })}
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Descanso (seg)</span>
                  <input
                    type="number"
                    min={0}
                    max={900}
                    value={row.targetRestSeconds}
                    onChange={(event) => updateRow(day.key, row.key, { targetRestSeconds: event.target.value })}
                    required
                  />
                </label>
              </div>
              <label className="field">
                <span className="field-label">Notas</span>
                <input
                  value={row.notes}
                  onChange={(event) => updateRow(day.key, row.key, { notes: event.target.value })}
                  placeholder="Opcional. Por ejemplo: controlá la bajada"
                />
              </label>
            </div>
          ))}
          <button type="button" className="btn-ghost" onClick={() => updateDay(day.key, { rows: [...day.rows, emptyDraft()] })}>
            Agregar ejercicio
          </button>
        </section>
      ))}
      <button
        type="button"
        className="btn-ghost"
        onClick={() => onChange([...days, emptyDay()])}
        disabled={days.length >= 7}
      >
        Agregar día
      </button>
    </div>
  );
}

export function RoutineOutline({ exercises }: { exercises: RoutineExercise[] }) {
  const days = routineDays(exercises);
  const named = days.length > 1 || Boolean(days[0]?.label);
  return (
    <div className="stack">
      {days.map((day) => {
        const grouped = new Map<string, RoutineExercise[]>();
        for (const exercise of day.exercises) {
          const current = grouped.get(exercise.muscleGroup) ?? [];
          current.push(exercise);
          grouped.set(exercise.muscleGroup, current);
        }
        const blocks = MUSCLE_GROUPS.filter((key) => grouped.has(key));
        return (
          <div className="day-log" key={day.dayNumber}>
            {named ? <h3 className="day-log-title">{dayTitle(day)}</h3> : null}
            {blocks.map((muscle) => (
              <section className="muscle-block" key={muscle}>
                <p className="eyebrow">{MUSCLE_LABELS[muscle]}</p>
                <ul className="plain-list">
                  {(grouped.get(muscle) ?? []).map((exercise) => (
                    <li key={exercise.id}>
                      <strong>{exercise.exerciseName}</strong>
                      <span>
                        {exercise.targetSets}×{exercise.targetReps} · {exercise.targetRestSeconds}s
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        );
      })}
    </div>
  );
}
