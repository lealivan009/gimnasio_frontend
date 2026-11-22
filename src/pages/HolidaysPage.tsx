import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import { formatDate, todayIso, type ClosedDay } from "../api/gym";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Toast } from "../components/Toast";

export function HolidaysPage() {
  const [rows, setRows] = useState<ClosedDay[]>([]);
  const [date, setDate] = useState(todayIso());
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<ClosedDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function reload() {
    setRows(await api.listClosures());
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const next = await api.listClosures();
        if (!cancelled) {
          setRows(next);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar los feriados");
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

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    const motive = reason.trim();
    if (!date || !motive) {
      setError("Indicá la fecha y el motivo.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await api.createClosure(date, motive);
      setReason("");
      setNotice("Día bloqueado");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo bloquear el día");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row: ClosedDay) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await api.deleteClosure(row.id);
      setNotice("Día desbloqueado");
      setPending(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar el bloqueo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="session-card">
      <ConfirmDialog
        open={pending != null}
        title="Quitar bloqueo"
        description={
          pending ? `El ${formatDate(pending.date)} vuelve a quedar libre. El motivo era: ${pending.reason}` : ""
        }
        confirmLabel="Quitar"
        danger
        busy={saving}
        onCancel={() => {
          if (!saving) {
            setPending(null);
          }
        }}
        onConfirm={() => {
          if (pending) {
            void onDelete(pending);
          }
        }}
      />
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">Calendario</p>
          <h1>Feriados</h1>
        </div>
      </div>
      <p className="lede">
        Un día bloqueado no admite presente, turnos ni entrenamiento. En el calendario se ve el motivo.
      </p>
      {error ? <p className="alert">{error}</p> : null}
      <Toast message={notice} onClose={() => setNotice(null)} />
      <form className="stack" onSubmit={onCreate}>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Fecha</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </label>
          <label className="field">
            <span className="field-label">Motivo</span>
            <input
              value={reason}
              maxLength={120}
              placeholder="Feriado, cierre por mantenimiento…"
              onChange={(event) => setReason(event.target.value)}
              required
            />
          </label>
        </div>
        <div className="form-actions">
          <button className="btn-primary btn-inline" type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Bloquear día"}
          </button>
        </div>
      </form>
      {loading ? <p className="lede">Cargando…</p> : null}
      {!loading && rows.length === 0 ? <p className="lede">Todavía no hay días bloqueados.</p> : null}
      {rows.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Motivo</th>
                <th>Lo cargó</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.date)}</td>
                  <td>{row.reason}</td>
                  <td>{row.createdByName || "—"}</td>
                  <td className="actions">
                    <button type="button" className="btn-ghost" disabled={saving} onClick={() => setPending(row)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
