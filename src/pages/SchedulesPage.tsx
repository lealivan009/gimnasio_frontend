import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import {
  DAY_LABELS,
  MODE_LABELS,
  THEME_LABELS,
  type ClassSchedule,
  type GymConfig,
  type GymTheme,
  type Instructor,
  type OperatingMode,
} from "../api/gym";
import { useRefreshGymBrand } from "../auth/GymBrand";
import { draftFromHours, draftsToHours, type DayHoursDraft } from "../gym/hours";

export function SchedulesPage() {
  const refreshGym = useRefreshGymBrand();
  const [config, setConfig] = useState<GymConfig | null>(null);
  const [days, setDays] = useState<DayHoursDraft[]>([]);
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [title, setTitle] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:00");
  const [capacity, setCapacity] = useState("12");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function reload() {
    const [nextConfig, nextClasses, nextInstructors] = await Promise.all([
      api.getGymConfig(),
      api.listClasses(),
      api.listInstructors(),
    ]);
    setConfig(nextConfig);
    setDays(draftFromHours(nextConfig.hours));
    setClasses(nextClasses);
    setInstructors(nextInstructors);
    setInstructorId((current) => current || nextInstructors[0]?.id || "");
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
          setError(err instanceof Error ? err.message : "No se pudo cargar la configuración");
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

  function updateShift(dayOfWeek: number, index: number, field: "opensAt" | "closesAt", value: string) {
    setDays((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              shifts: day.shifts.map((shift, shiftIndex) =>
                shiftIndex === index ? { ...shift, [field]: value } : shift,
              ),
            }
          : day,
      ),
    );
  }

  function addShift(dayOfWeek: number) {
    setDays((current) =>
      current.map((day) => {
        if (day.dayOfWeek !== dayOfWeek || day.shifts.length >= 2) {
          return day;
        }
        const next = day.shifts.length === 0 ? { opensAt: "07:00", closesAt: "23:00" } : { opensAt: "16:00", closesAt: "21:00" };
        return { ...day, shifts: [...day.shifts, next] };
      }),
    );
  }

  function removeShift(dayOfWeek: number, index: number) {
    setDays((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, shifts: day.shifts.filter((_, shiftIndex) => shiftIndex !== index) } : day,
      ),
    );
  }

  async function onConfig(event: FormEvent) {
    event.preventDefault();
    if (!config) {
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const hours = draftsToHours(days);
      const saved = await api.updateGymConfig({
        ...config,
        name: config.name.trim() || "Gimnasio",
        address: config.address?.trim() || null,
        mapUrl: config.mapUrl?.trim() || null,
        description: config.description?.trim() ?? "",
        openingTime: hours[0]?.opensAt ?? config.openingTime,
        closingTime: hours[hours.length - 1]?.closesAt ?? config.closingTime,
        hours,
      });
      setConfig(saved);
      setDays(draftFromHours(saved.hours));
      document.documentElement.dataset.theme = saved.theme.toLowerCase();
      await refreshGym();
      setNotice("Datos del gimnasio actualizados");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  }

  async function onClass(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    const payload = {
      title: title.trim(),
      instructorId,
      dayOfWeek,
      startTime,
      endTime,
      capacity: Number(capacity),
      active: true,
    };
    try {
      if (editingId) {
        await api.updateClass(editingId, payload);
        setNotice("Turno actualizado");
      } else {
        await api.createClass(payload);
        setNotice("Turno creado");
      }
      setTitle("");
      setEditingId(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el turno");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(item: ClassSchedule) {
    setError(null);
    try {
      await api.deactivateClass(item.id);
      setNotice("Turno desactivado");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desactivar el turno");
    }
  }

  if (loading || !config) {
    return <p className="lede">Cargando…</p>;
  }

  return (
    <>
      <section className="session-card">
        <p className="eyebrow">Gimnasio</p>
        <h1>Plataforma</h1>
        <p className="lede">
          Nombre, descripción, dirección, color, horarios y si el gimnasio funciona con acceso libre, con turnos o en modo híbrido.
        </p>
      </section>

      <form className="session-card" onSubmit={onConfig}>
        <h2>Datos del gimnasio</h2>
        <p className="lede">El nombre, la descripción, la dirección, el horario y el color aparecen en la portada.</p>
        {error ? <p className="alert">{error}</p> : null}
        {notice ? <p className="alert ok">{notice}</p> : null}
        <label className="field">
          <span className="field-label">Nombre</span>
          <input
            value={config.name ?? ""}
            onChange={(event) => setConfig({ ...config, name: event.target.value })}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Dirección</span>
          <input
            value={config.address ?? ""}
            onChange={(event) => setConfig({ ...config, address: event.target.value })}
            placeholder="Calle y número"
          />
        </label>
        <label className="field">
          <span className="field-label">Descripción</span>
          <textarea
            rows={4}
            maxLength={1000}
            value={config.description ?? ""}
            onChange={(event) => setConfig({ ...config, description: event.target.value })}
            placeholder="De qué se trata el gimnasio y por qué vale la pena entrenar acá"
          />
        </label>
        <label className="field">
          <span className="field-label">Mapa</span>
          <input
            value={config.mapUrl ?? ""}
            onChange={(event) => setConfig({ ...config, mapUrl: event.target.value })}
            placeholder="https://www.google.com/maps/embed?..."
          />
        </label>
        <label className="field">
          <span className="field-label">Color</span>
          <select
            value={config.theme ?? "ENERGIA"}
            onChange={(event) => setConfig({ ...config, theme: event.target.value as GymTheme })}
          >
            {(Object.keys(THEME_LABELS) as GymTheme[]).map((theme) => (
              <option key={theme} value={theme}>
                {THEME_LABELS[theme]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Funcionamiento</span>
          <select
            value={config.operatingMode}
            onChange={(event) => setConfig({ ...config, operatingMode: event.target.value as OperatingMode })}
          >
            {(Object.keys(MODE_LABELS) as OperatingMode[]).map((mode) => (
              <option key={mode} value={mode}>
                {MODE_LABELS[mode]}
              </option>
            ))}
          </select>
        </label>
        <div className="week-hours">
          <div className="week-hours-head">
            <span className="field-label">Horario semanal</span>
            <p className="hint left">
              Cada día puede tener hasta dos turnos. Un día sin turnos queda cerrado. El sábado, por ejemplo, puede
              abrir a la mañana y de nuevo a la tarde.
            </p>
          </div>
          {days.map((day) => (
            <div className="week-day" key={day.dayOfWeek}>
              <strong>{DAY_LABELS[day.dayOfWeek]}</strong>
              <div className="shift-stack">
                {day.shifts.length === 0 ? <span className="shift-closed">Cerrado</span> : null}
                {day.shifts.map((shift, index) => (
                  <div className="shift-row" key={`${day.dayOfWeek}-${index}`}>
                    <input
                      type="time"
                      aria-label={`Apertura del ${DAY_LABELS[day.dayOfWeek]}`}
                      value={shift.opensAt}
                      onChange={(event) => updateShift(day.dayOfWeek, index, "opensAt", event.target.value)}
                      required
                    />
                    <span>a</span>
                    <input
                      type="time"
                      aria-label={`Cierre del ${DAY_LABELS[day.dayOfWeek]}`}
                      value={shift.closesAt}
                      onChange={(event) => updateShift(day.dayOfWeek, index, "closesAt", event.target.value)}
                      required
                    />
                    <button type="button" className="text-btn" onClick={() => removeShift(day.dayOfWeek, index)}>
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn-ghost"
                disabled={day.shifts.length >= 2}
                onClick={() => addShift(day.dayOfWeek)}
              >
                Agregar turno
              </button>
            </div>
          ))}
        </div>
        <label className="field">
          <span className="field-label">Capacidad máxima</span>
          <input
            type="number"
            min={1}
            value={config.maxCapacityPerSlot}
            onChange={(event) => setConfig({ ...config, maxCapacityPerSlot: Number(event.target.value) })}
            required
          />
        </label>
        <p className="hint left">
          En acceso libre e híbrido, la capacidad limita los ingresos simultáneos. En las clases, el cupo es el de cada
          turno.
        </p>
        <button className="btn-primary btn-inline" type="submit" disabled={saving}>
          Guardar gimnasio
        </button>
      </form>

      <form className="session-card" onSubmit={onClass}>
        <h2>{editingId ? "Editar turno" : "Nuevo turno"}</h2>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Título</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="field">
            <span className="field-label">Profesor</span>
            <select value={instructorId} onChange={(event) => setInstructorId(event.target.value)} required>
              <option value="">Elegí un profesor</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.lastName}, {instructor.firstName}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Día</span>
            <select value={dayOfWeek} onChange={(event) => setDayOfWeek(Number(event.target.value))}>
              {DAY_LABELS.slice(1).map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Cupo</span>
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Hora de inicio</span>
            <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
          </label>
          <label className="field">
            <span className="field-label">Hora de fin</span>
            <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
          </label>
        </div>
        <div className="form-actions">
          <button className="btn-primary btn-inline" type="submit" disabled={saving}>
            {editingId ? "Guardar turno" : "Crear turno"}
          </button>
          {editingId ? (
            <button className="btn-ghost" type="button" onClick={() => setEditingId(null)}>
              Cancelar edición
            </button>
          ) : null}
        </div>
      </form>

      <section className="session-card table-card">
        <h2>Turnos vigentes</h2>
        {classes.length === 0 ? (
          <p className="lede">Todavía no hay turnos cargados.</p>
        ) : (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Clase</th>
                  <th>Horario</th>
                  <th>Profesor</th>
                  <th>Cupo</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {classes.map((item) => (
                  <tr key={item.id}>
                    <td>{DAY_LABELS[item.dayOfWeek]}</td>
                    <td>{item.title}</td>
                    <td>
                      {item.startTime} – {item.endTime}
                    </td>
                    <td>{item.instructorName}</td>
                    <td>{item.capacity}</td>
                    <td>
                      <span className={item.active ? "pill on" : "pill off"}>{item.active ? "Vigente" : "Inactivo"}</span>
                    </td>
                    <td className="actions">
                      <button
                        type="button"
                        className="text-btn"
                        onClick={() => {
                          setEditingId(item.id);
                          setTitle(item.title);
                          setInstructorId(item.instructorId);
                          setDayOfWeek(item.dayOfWeek);
                          setStartTime(item.startTime);
                          setEndTime(item.endTime);
                          setCapacity(String(item.capacity));
                        }}
                      >
                        Editar
                      </button>
                      {item.active ? (
                        <button type="button" className="text-btn danger" onClick={() => deactivate(item)}>
                          Desactivar
                        </button>
                      ) : null}
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
