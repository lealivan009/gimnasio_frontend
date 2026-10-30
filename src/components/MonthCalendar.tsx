import type { CalendarDay } from "../api/gym";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function MonthCalendar({
  year,
  month,
  days,
  onShift,
  selectedDate,
  onSelect,
  maxDate,
  heading = "Calendario",
  legend = true,
}: {
  year: number;
  month: number;
  days: CalendarDay[];
  onShift: (delta: number) => void;
  selectedDate?: string | null;
  onSelect?: (date: string) => void;
  maxDate?: string;
  heading?: string;
  legend?: boolean;
}) {
  const offset = days.length ? (new Date(`${days[0].date}T12:00:00`).getDay() + 6) % 7 : 0;

  return (
    <>
      <div className="calendar-head">
        {heading ? <h2>{heading}</h2> : null}
        <div className="calendar-nav">
          <button type="button" className="btn-ghost calendar-prev" onClick={() => onShift(-1)}>
            Anterior
          </button>
          <span className="table-meta calendar-month">
            {MONTHS[month - 1]} {year}
          </span>
          <button type="button" className="btn-ghost calendar-next" onClick={() => onShift(1)}>
            Siguiente
          </button>
        </div>
      </div>
      <div className="heat-weekdays">
        {["L", "M", "X", "J", "V", "S", "D"].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="heat-grid">
        {Array.from({ length: offset }, (_, index) => (
          <span key={`empty-${index}`} />
        ))}
        {days.map((day) => {
          const tone = day.attended && day.trained ? "both" : day.attended ? "attended" : day.trained ? "trained" : "";
          const future = maxDate != null && day.date > maxDate;
          const label = (day.sessions ?? []).map((session) => session.label).join(" · ");
          const content = (
            <>
              <span>{Number(day.date.slice(8))}</span>
              {label ? <small className="heat-label">{label}</small> : null}
            </>
          );
          if (!onSelect || future) {
            return (
              <span
                key={day.date}
                className={`heat-cell ${tone}${future ? " is-future" : ""}`}
                title={future ? "Todavía no llegó" : label || day.date}
              >
                {content}
              </span>
            );
          }
          return (
            <button
              key={day.date}
              type="button"
              className={`heat-cell pick ${tone} ${selectedDate === day.date ? "selected" : ""}`}
              title={label || day.date}
              onClick={() => onSelect(day.date)}
            >
              {content}
            </button>
          );
        })}
      </div>
      {legend ? (
        <p className="hint left">
          <span className="heat-cell attended mini" /> Asistió
          <span className="heat-cell trained mini" /> Entrenó
          <span className="heat-cell both mini" /> Las dos
        </p>
      ) : null}
    </>
  );
}
