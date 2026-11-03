import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Exercise, MuscleGroup, RoutineExercise, RoutineExerciseInput } from "../api/gym";
import { dayTitle, exerciseTarget, MUSCLE_GROUPS, MUSCLE_LABELS, routineDays } from "../api/gym";
import { ExerciseHowTo } from "./ExerciseHowTo";

function isTimed(catalog: Exercise[], exerciseId: string) {
  return catalog.find((item) => item.id === exerciseId)?.measure === "TIEMPO";
}

function fold(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function sortCatalog(catalog: Exercise[]) {
  return [...catalog].sort((left, right) => {
    const group = MUSCLE_GROUPS.indexOf(left.muscleGroup) - MUSCLE_GROUPS.indexOf(right.muscleGroup);
    if (group !== 0) {
      return group;
    }
    return left.name.localeCompare(right.name, "es");
  });
}

function ExercisePicker({
  catalog,
  value,
  onChange,
}: {
  catalog: Exercise[];
  value: string;
  onChange: (exerciseId: string) => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = catalog.find((exercise) => exercise.id === value) ?? null;
  const selectedLabel = selected
    ? `${selected.name} · ${MUSCLE_LABELS[selected.muscleGroup]}${selected.measure === "TIEMPO" ? " · tiempo" : ""}`
    : "";
  const needle = fold(query.trim());
  const visible = useMemo(
    () =>
      catalog.filter((exercise) => {
        if (!needle) {
          return true;
        }
        return fold(exercise.name).includes(needle) || fold(MUSCLE_LABELS[exercise.muscleGroup]).includes(needle);
      }),
    [catalog, needle]
  );

  useEffect(() => {
    inputRef.current?.setCustomValidity(value ? "" : "Elegí un ejercicio");
  }, [value]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [needle]);

  function choose(exerciseId: string) {
    onChange(exerciseId);
    setQuery("");
    setOpen(false);
  }

  let lastGroup: MuscleGroup | "" = "";

  return (
    <div className="exercise-picker" ref={rootRef}>
      <input
        ref={inputRef}
        value={open ? query : selectedLabel}
        placeholder="Buscá por nombre"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listId}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (!event.target.value) {
            onChange("");
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((current) => Math.min(current + 1, Math.max(visible.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((current) => Math.max(current - 1, 0));
          } else if (event.key === "Enter" && open && visible[active]) {
            event.preventDefault();
            choose(visible[active].id);
          } else if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
      />
      {open ? (
        <ul className="exercise-picker-list" id={listId} role="listbox">
          {visible.length === 0 ? (
            <li className="exercise-picker-empty">No hay ejercicios con ese nombre.</li>
          ) : (
            visible.map((exercise, index) => {
              const showGroup = exercise.muscleGroup !== lastGroup;
              lastGroup = exercise.muscleGroup;
              return (
                <li key={exercise.id}>
                  {showGroup ? <p className="eyebrow">{MUSCLE_LABELS[exercise.muscleGroup]}</p> : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={exercise.id === value}
                    className={index === active ? "is-active" : undefined}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(exercise.id)}
                  >
                    {exercise.name}
                    {exercise.measure === "TIEMPO" ? " · tiempo" : ""}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}

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
  const catalogSorted = useMemo(() => sortCatalog(catalog), [catalog]);

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

  function moveRow(dayKey: string, rowKey: string, direction: -1 | 1) {
    onChange(
      days.map((day) => {
        if (day.key !== dayKey) {
          return day;
        }
        const index = day.rows.findIndex((row) => row.key === rowKey);
        const next = index + direction;
        if (index < 0 || next < 0 || next >= day.rows.length) {
          return day;
        }
        const rows = [...day.rows];
        const [item] = rows.splice(index, 1);
        rows.splice(next, 0, item);
        return { ...day, rows };
      })
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
                <div className="row-actions">
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => moveRow(day.key, row.key, -1)}
                    disabled={rowIndex === 0}
                  >
                    Subir
                  </button>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => moveRow(day.key, row.key, 1)}
                    disabled={rowIndex === day.rows.length - 1}
                  >
                    Bajar
                  </button>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => updateDay(day.key, { rows: day.rows.filter((item) => item.key !== row.key) })}
                    disabled={day.rows.length === 1}
                  >
                    Quitar
                  </button>
                </div>
              </div>
              <label className="field">
                <span className="field-label">Ejercicio del catálogo</span>
                <ExercisePicker
                  catalog={catalogSorted}
                  value={row.exerciseId}
                  onChange={(exerciseId) => updateRow(day.key, row.key, { exerciseId })}
                />
              </label>
              <div className={isTimed(catalogSorted, row.exerciseId) ? "form-grid quad" : "form-grid triple"}>
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
                {isTimed(catalogSorted, row.exerciseId) ? (
                  <>
                    <label className="field">
                      <span className="field-label">Minutos</span>
                      <input
                        type="number"
                        min={0}
                        max={120}
                        value={Math.floor((Number(row.targetReps) || 0) / 60)}
                        onChange={(event) => {
                          const minutes = Math.min(120, Math.max(0, Number(event.target.value) || 0));
                          const seconds = (Number(row.targetReps) || 0) % 60;
                          updateRow(day.key, row.key, { targetReps: String(minutes * 60 + seconds) });
                        }}
                        required
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Segundos</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={(Number(row.targetReps) || 0) % 60}
                        onChange={(event) => {
                          const seconds = Math.min(59, Math.max(0, Number(event.target.value) || 0));
                          const minutes = Math.floor((Number(row.targetReps) || 0) / 60);
                          updateRow(day.key, row.key, { targetReps: String(minutes * 60 + seconds) });
                        }}
                        required
                      />
                    </label>
                  </>
                ) : (
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
                )}
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

function DayExercises({ exercises }: { exercises: RoutineExercise[] }) {
  const grouped = new Map<string, RoutineExercise[]>();
  for (const exercise of exercises) {
    const current = grouped.get(exercise.muscleGroup) ?? [];
    current.push(exercise);
    grouped.set(exercise.muscleGroup, current);
  }
  const blocks = MUSCLE_GROUPS.filter((key) => grouped.has(key));
  return (
    <>
      {blocks.map((muscle) => (
        <section className="muscle-block" key={muscle}>
          <p className="eyebrow">{MUSCLE_LABELS[muscle]}</p>
          <ul className="plain-list exercise-list">
            {(grouped.get(muscle) ?? []).map((exercise) => (
              <li key={exercise.id}>
                <div className="exercise-name">
                  <strong>{exercise.exerciseName}</strong>
                  <ExerciseHowTo exerciseId={exercise.exerciseId} name={exercise.exerciseName} notes={exercise.notes} />
                </div>
                <span>
                  {exerciseTarget(exercise.targetSets, exercise.targetReps, exercise.targetRestSeconds, exercise.measure)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

export function RoutineOutline({ exercises, cards = false }: { exercises: RoutineExercise[]; cards?: boolean }) {
  const days = routineDays(exercises);
  const named = days.length > 1 || Boolean(days[0]?.label);
  if (cards) {
    return (
      <div className="day-board">
        {days.map((day) => (
          <section className="session-card day-card" key={day.dayNumber}>
            <p className="day-index">Día {day.dayNumber}</p>
            {day.label ? <h2>{day.label}</h2> : null}
            <DayExercises exercises={day.exercises} />
          </section>
        ))}
      </div>
    );
  }
  return (
    <div className="stack">
      {days.map((day) => (
        <div className="day-log" key={day.dayNumber}>
          {named ? <h3 className="day-log-title">{dayTitle(day)}</h3> : null}
          <DayExercises exercises={day.exercises} />
        </div>
      ))}
    </div>
  );
}
