import { Fragment, useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import {
  assignmentState,
  formatDate,
  todayIso,
  type Assignment,
  type Exercise,
  type Routine,
  type StudentFollow,
} from "../api/gym";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { draftsToPayload, emptyDay, RoutineBuilder, RoutineOutline, routineToDrafts, type DraftDay } from "../components/RoutineBuilder";

export function RoutinesPage() {
  const [catalog, setCatalog] = useState<Exercise[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<StudentFollow[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState<DraftDay[]>([emptyDay()]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assignRoutineId, setAssignRoutineId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [startDate, setStartDate] = useState(todayIso());
  const [expirationDate, setExpirationDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Routine | null>(null);
  const [pendingRemove, setPendingRemove] = useState<Assignment | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  async function reload() {
    const [nextRoutines, nextStudents, nextCatalog, nextAssignments] = await Promise.all([
      api.listRoutines(),
      api.listStudentFollow(),
      api.listExercises(),
      api.listAssignments(),
    ]);
    setRoutines(nextRoutines);
    setStudents(nextStudents);
    setCatalog(nextCatalog);
    setAssignments(nextAssignments);
    setAssignRoutineId((current) => current || nextRoutines[0]?.id || "");
    setStudentId((current) => current || nextStudents[0]?.id || "");
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        await reload();
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

  function resetForm() {
    setTitle("");
    setDescription("");
    setDays([emptyDay()]);
    setEditingId(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      exercises: draftsToPayload(days),
    };
    try {
      if (editingId) {
        await api.updateRoutine(editingId, payload);
        setNotice("Rutina actualizada");
      } else {
        await api.createRoutine(payload);
        setNotice("Rutina creada");
      }
      resetForm();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la rutina");
    } finally {
      setSaving(false);
    }
  }

  async function onClone(routine: Routine) {
    setError(null);
    setNotice(null);
    try {
      await api.cloneRoutine(routine.id, `Copia de ${routine.title}`);
      setNotice("Rutina duplicada. Ya podés asignarla a otro alumno.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo duplicar la rutina");
    }
  }

  async function onAssign(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await api.assignRoutine(assignRoutineId, {
        studentId,
        startDate,
        expirationDate: expirationDate || null,
      });
      const student = students.find((item) => item.id === studentId);
      const routine = routines.find((item) => item.id === assignRoutineId);
      const who = student ? `${student.firstName} ${student.lastName}` : "el alumno";
      setNotice(`Listo. “${routine?.title ?? "La rutina"}” quedó asignada a ${who}.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo asignar la rutina");
    } finally {
      setSaving(false);
    }
  }

  async function saveAssignment(assignment: Assignment, start: string, end: string, active: boolean) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await api.updateAssignment(assignment.id, {
        startDate: start,
        expirationDate: end || null,
        active,
      });
      setEditingAssignmentId(null);
      setNotice(active ? "Asignación guardada. Quedó como la rutina activa." : "Asignación guardada.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la asignación");
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!pendingRemove) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.deleteAssignment(pendingRemove.id);
      setNotice("Asignación eliminada");
      setPendingRemove(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar la asignación");
      setPendingRemove(null);
    } finally {
      setSaving(false);
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
      if (editingId === pendingDelete.id) {
        resetForm();
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la rutina");
      setPendingDelete(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="session-card">
        <p className="eyebrow">Profesor</p>
        <h1>Rutinas</h1>
        <p className="lede">
          Armá una rutina de uno o varios días. En cada día van los ejercicios de esa sesión, por ejemplo pecho y bíceps un día y espalda y tríceps otro.
        </p>
      </section>

      {error || notice ? (
        <div className="session-card toast-banner">
          {error ? <p className="alert">{error}</p> : null}
          {notice ? <p className="alert ok">{notice}</p> : null}
        </div>
      ) : null}

      <form className="session-card" onSubmit={onSubmit}>
        <h2>{editingId ? "Editar rutina" : "Nueva rutina"}</h2>
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
        {catalog.length === 0 ? (
          <p className="lede">Primero cargá ejercicios en el catálogo.</p>
        ) : (
          <RoutineBuilder days={days} catalog={catalog} onChange={setDays} />
        )}
        <div className="form-actions">
          <button className="btn-primary btn-inline" type="submit" disabled={saving || catalog.length === 0}>
            {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear rutina"}
          </button>
          {editingId ? (
            <button className="btn-ghost" type="button" onClick={resetForm}>
              Cancelar edición
            </button>
          ) : null}
        </div>
      </form>

      <form className="session-card" onSubmit={onAssign}>
        <h2>Asignar a un alumno</h2>
        <p className="lede">Al asignar una nueva, la rutina activa anterior de ese alumno pasa a inactiva.</p>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Rutina</span>
            <select value={assignRoutineId} onChange={(event) => setAssignRoutineId(event.target.value)} required>
              <option value="">Elegí una rutina</option>
              {routines.map((routine) => (
                <option key={routine.id} value={routine.id}>
                  {routine.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Alumno</span>
            <select value={studentId} onChange={(event) => setStudentId(event.target.value)} required>
              <option value="">Elegí un alumno</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.lastName}, {student.firstName}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Fecha de inicio</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
          </label>
          <label className="field">
            <span className="field-label">Fecha de vencimiento</span>
            <input
              type="date"
              value={expirationDate}
              onChange={(event) => setExpirationDate(event.target.value)}
            />
          </label>
        </div>
        <button className="btn-primary btn-inline" type="submit" disabled={saving || !assignRoutineId || !studentId}>
          {saving ? "Asignando…" : "Asignar"}
        </button>
      </form>

      <section className="session-card table-card">
        <h2>Asignaciones</h2>
        <p className="lede">
          Cada alumno tiene una sola rutina activa. Si volvés a asignar la misma, se actualizan las fechas en lugar de
          duplicarla. Desde acá podés corregir las fechas o quitar una.
        </p>
        {loading ? (
          <p className="lede">Cargando…</p>
        ) : assignments.length === 0 ? (
          <p className="lede">Todavía no hay rutinas asignadas.</p>
        ) : (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Rutina</th>
                  <th>Inicio</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <Fragment key={assignment.id}>
                    <tr>
                      <td>{assignment.studentName}</td>
                      <td>
                        {assignment.routineTitle}
                        {assignment.customStudent ? <span className="pill custom">Personalizada por el alumno</span> : null}
                      </td>
                      <td>{formatDate(assignment.startDate)}</td>
                      <td>{formatDate(assignment.expirationDate)}</td>
                      <td>
                        <span
                          className={
                            assignmentState(assignment) === "Inactiva" || assignmentState(assignment) === "Vencida"
                              ? "pill off"
                              : "pill on"
                          }
                        >
                          {assignmentState(assignment)}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className="text-btn"
                          onClick={() => {
                            setEditingAssignmentId(assignment.id);
                            setEditStart(assignment.startDate);
                            setEditEnd(assignment.expirationDate ?? "");
                          }}
                        >
                          Editar
                        </button>
                        {assignment.active ? null : (
                          <button
                            type="button"
                            className="text-btn"
                            onClick={() =>
                              saveAssignment(assignment, assignment.startDate, assignment.expirationDate ?? "", true)
                            }
                          >
                            Activar
                          </button>
                        )}
                        <button type="button" className="text-btn danger" onClick={() => setPendingRemove(assignment)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                    {editingAssignmentId === assignment.id ? (
                      <tr key={`${assignment.id}-edit`}>
                        <td colSpan={6}>
                          <form
                            className="form-grid"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void saveAssignment(assignment, editStart, editEnd, assignment.active);
                            }}
                          >
                            <label className="field">
                              <span className="field-label">Inicio</span>
                              <input type="date" value={editStart} onChange={(event) => setEditStart(event.target.value)} required />
                            </label>
                            <label className="field">
                              <span className="field-label">Vencimiento</span>
                              <input type="date" value={editEnd} onChange={(event) => setEditEnd(event.target.value)} />
                            </label>
                            <div className="form-actions">
                              <button className="btn-primary btn-inline" type="submit" disabled={saving}>
                                Guardar fechas
                              </button>
                              <button className="btn-ghost" type="button" onClick={() => setEditingAssignmentId(null)}>
                                Cancelar
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="session-card">
        <h2>Rutinas del gimnasio</h2>
        {loading ? (
          <p className="lede">Cargando…</p>
        ) : routines.length === 0 ? (
          <p className="lede">Todavía no hay rutinas.</p>
        ) : (
          <div className="stack">
            {routines.map((routine) => (
              <article className="routine-card" key={routine.id}>
                <div className="routine-card-head">
                  <div>
                    <strong>{routine.title}</strong>
                    <p className="cell-note">{routine.description || "Sin descripción"}</p>
                  </div>
                  <div className="actions">
                    <button type="button" className="text-btn" onClick={() => onClone(routine)}>
                      Duplicar
                    </button>
                    <button
                      type="button"
                      className="text-btn"
                      onClick={() => {
                        setEditingId(routine.id);
                        setTitle(routine.title);
                        setDescription(routine.description ?? "");
                        setDays(routineToDrafts(routine.exercises));
                      }}
                    >
                      Editar
                    </button>
                    <button type="button" className="text-btn danger" onClick={() => setPendingDelete(routine)}>
                      Eliminar
                    </button>
                  </div>
                </div>
                <RoutineOutline exercises={routine.exercises} />
              </article>
            ))}
          </div>
        )}
      </section>

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
      <ConfirmDialog
        open={pendingRemove != null}
        title="Quitar asignación"
        description={
          pendingRemove
            ? `Se va a quitar “${pendingRemove.routineTitle}” de ${pendingRemove.studentName}. La rutina del catálogo no se borra.`
            : null
        }
        confirmLabel="Quitar"
        danger
        busy={saving}
        onCancel={() => setPendingRemove(null)}
        onConfirm={confirmRemove}
      />
    </>
  );
}
