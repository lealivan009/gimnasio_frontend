import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { User } from "../api/types";

export function PendingAccountsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const data = await api.listPending();
    setUsers(data);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const data = await api.listPending();
        if (!cancelled) {
          setUsers(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar las cuentas pendientes");
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

  async function approve(user: User) {
    setBusyId(user.id);
    setError(null);
    setNotice(null);
    try {
      await api.approveUser(user.id);
      setNotice(`${user.firstName} ${user.lastName} ya puede entrar.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aprobar la cuenta");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <section className="session-card">
        <p className="eyebrow">Cuentas</p>
        <h1>Pendientes</h1>
        <p className="lede">Estas cuentas se registraron solas y todavía no pueden entrar.</p>
        {notice ? <p className="alert ok">{notice}</p> : null}
      </section>
      <section className="session-card table-card">
        {error ? <p className="alert">{error}</p> : null}
        {loading ? (
          <p className="lede">Cargando…</p>
        ) : users.length === 0 ? (
          <p className="lede">No hay cuentas esperando aprobación.</p>
        ) : (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Email</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>
                        {user.lastName}, {user.firstName}
                      </strong>
                    </td>
                    <td>{user.email}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn-primary btn-inline"
                        disabled={busyId === user.id}
                        onClick={() => approve(user)}
                      >
                        Aprobar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
