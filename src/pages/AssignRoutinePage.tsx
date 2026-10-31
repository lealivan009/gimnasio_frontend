import { Fragment, useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { assignmentState, formatDate, todayIso, type Assignment, type Routine, type StudentFollow } from "../api/gym";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Toast } from "../components/Toast";

export function AssignRoutinePage() {
  const [params] = useSearchParams();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<StudentFollow[]>([]);
  const [assignRoutineId, setAssignRoutineId] = useState(params.get("rutina") ?? "");
  const [studentId, setStudentId] = useState("");
  const [startDate, setStartDate] = useState(todayIso());
  const [expirationDate, setExpirationDate] = useState("");
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<Assignment | null>(null);

  async function reload() {
    const [nextRoutines, nextStudents, nextAssignments] = await Promise.all([
      api.listRoutines(),
      api.listStudentFollow(),
      api.listAssignments(),
    ]);
    setRoutines(nextRoutines);
    setStudents(nextStudents);
    setAssignments(nextAssignments);
    setAssignRoutineId((current) => current || params.get("rutina") || nextRoutines[0]?.id || "");
    setStudentId((current) => current || nextStudents[0]?.id || "");
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const [nextRoutines, nextStudents, nextAssignments] = await Promise.all([
          api.listRoutines(),
          api.listStudentFollow(),
          api.listAssignments(),
        ]);
        if (cancelled) {
          return;
        }
        setRoutines(nextRoutines);
        setStudents(nextStudents);
        setAssignments(nextAssignments);
        setAssignRoutineId(params.get("rutina") || nextRoutines[0]?.id || "");
        setStudentId(nextStudents[0]?.id || "");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar las asignaciones");
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
  }, [params]);

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
      setExpirationDate("");
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

  return (
    <>
      <section className="session-card">
        <div className="page-toolbar">
          <h1>Asignar</h1>
          <Link className="btn-ghost" to="/admin/rutinas">
            Volver
          </Link>
        </div>
      </section>
      <form className="session-card" onSubmit={onAssign}>
        {error ? <p className="alert">{error}</p> : null}
        <Toast message={notice} onClose={() => setNotice(null)} />
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
            <input type="date" value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} />
          </label>
        </div>
        <button className="btn-primary btn-inline" type="submit" disabled={saving || !assignRoutineId || !studentId}>
          {saving ? "Asignando…" : "Asignar"}
        </button>
      </form>
      <section className="session-card table-card">
        <h2>Asignaciones</h2>
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
                      <td>{assignment.routineTitle}</td>
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
                      <tr>
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
