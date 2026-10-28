import { Link } from "react-router-dom";
import { DAY_LABELS } from "../api/gym";
import { homePath } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useGymBrand } from "../auth/GymBrand";
import { HoursBoard } from "../components/HoursBoard";
import { isOpenNow, weekdayIndex } from "../gym/hours";
import { APP_VERSION } from "../version";

const PERKS = [
  {
    kicker: "Físico",
    title: "Más fuerza",
    text: "Más músculo, mejor postura y un cuerpo que responde cuando lo exigís. Se construye serie por serie.",
  },
  {
    kicker: "Energía",
    title: "El día rinde",
    text: "Salís con el cuerpo despierto. Dormís mejor y lo que antes pesaba, pesa menos.",
  },
  {
    kicker: "Constancia",
    title: "Volvé y listo",
    text: "La rutina ya está armada. Tu parte es aparecer, entrenar y no aflojar a la semana.",
  },
];

export function LandingPage() {
  const gym = useGymBrand();
  const { user, loading } = useAuth();
  const name = gym?.name || "Gimnasio";
  const hours = gym?.hours ?? [];
  const open = hours.length > 0 && isOpenNow(hours);
  const enterTo = user ? homePath(user.role) : "/login";
  const enterLabel = user ? "Entrar al panel" : "Iniciar sesión";
  const address = gym?.address?.trim() || "";
  const map = gym?.mapUrl?.startsWith("https://") ? gym.mapUrl : "";
  const day = weekdayIndex();
  const today = hours
    .filter((hour) => hour.dayOfWeek === day)
    .sort((a, b) => a.opensAt.localeCompare(b.opensAt));

  return (
    <div className="landing">
      <p className="landing-watermark" aria-hidden>
        {name.split(" ")[0]}
      </p>
      <div className="landing-frame">
      <header className="landing-nav">
        {loading ? null : (
          <Link className="btn-ghost" to={enterTo}>
            {enterLabel}
          </Link>
        )}
      </header>

      <section className="landing-stage">
        <div className="landing-hero">
          <p className="brand-kicker">Gimnasio</p>
          <h1>{name}</h1>
        </div>

        <aside className="landing-today">
          <p className="eyebrow">Hoy</p>
          <p className="landing-today-day">{DAY_LABELS[day]}</p>
          {today.length === 0 ? (
            <p className="landing-clock">Cerrado</p>
          ) : (
            today.map((shift) => (
              <p className="landing-clock" key={`${shift.opensAt}-${shift.closesAt}`}>
                {shift.opensAt.slice(0, 5)}
                <span> a {shift.closesAt.slice(0, 5)}</span>
              </p>
            ))
          )}
          {hours.length > 0 ? (
            <span className={open ? "status-pill" : "status-pill closed"}>
              <span className="status-dot" aria-hidden />
              {open ? "Abierto ahora" : "Cerrado ahora"}
            </span>
          ) : null}
        </aside>
      </section>

      <section className="landing-perks">
        {PERKS.map((perk) => (
          <article className="landing-perk" key={perk.title}>
            <p className="eyebrow">{perk.kicker}</p>
            <h2>{perk.title}</h2>
            <p>{perk.text}</p>
          </article>
        ))}
      </section>

      <section className="landing-card">
        <h2>Horario</h2>
        {hours.length > 0 ? <HoursBoard hours={hours} /> : <p className="lede">El horario se publica desde el panel.</p>}
      </section>

      <section className={map ? "landing-place" : "landing-place landing-place-solo"}>
        <div className="landing-place-copy">
          <p className="eyebrow">Ubicación</p>
          <h2>{address || "La dirección se carga desde el panel."}</h2>
          {address ? (
            <a
              className="landing-directions"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Cómo llegar
            </a>
          ) : null}
        </div>
        {map ? <iframe className="landing-map" title={`Mapa de ${name}`} src={map} loading="lazy" /> : null}
      </section>
      <p className="app-version">Versión {APP_VERSION}</p>
      </div>
    </div>
  );
}
