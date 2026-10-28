import { useEffect, useRef, useState } from "react";

type Mode = "stopwatch" | "countdown";

const PRESETS = [
  { label: "30 s", seconds: 30 },
  { label: "45 s", seconds: 45 },
  { label: "60 s", seconds: 60 },
  { label: "90 s", seconds: 90 },
  { label: "2 min", seconds: 120 },
];

function formatClock(ms: number) {
  const safe = Math.max(0, ms);
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const tenths = Math.floor((safe % 1000) / 100);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function beep() {
  const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
  const Context = window.AudioContext ?? audioWindow.webkitAudioContext;
  if (!Context) {
    return;
  }
  const context = new Context();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  oscillator.connect(gain);
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.15, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.45);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.45);
  oscillator.onended = () => {
    void context.close();
  };
}

export function TimerPage() {
  const [mode, setMode] = useState<Mode>("stopwatch");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const [minutes, setMinutes] = useState("1");
  const [seconds, setSeconds] = useState("30");
  const [finished, setFinished] = useState(false);
  const accumulated = useRef(0);
  const startedAt = useRef<number | null>(null);
  const announced = useRef(false);

  const minutesValue = Number(minutes);
  const secondsValue = Number(seconds);
  const countdownMs =
    Math.max(0, Number.isFinite(minutesValue) ? minutesValue : 0) * 60000 +
    Math.max(0, Number.isFinite(secondsValue) ? secondsValue : 0) * 1000;
  const remaining = Math.max(0, countdownMs - elapsed);
  const display = mode === "stopwatch" ? elapsed : remaining;

  useEffect(() => {
    if (!running) {
      return;
    }
    const id = window.setInterval(() => {
      const start = startedAt.current ?? Date.now();
      setElapsed(accumulated.current + (Date.now() - start));
    }, 80);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running) {
      return;
    }
    const wakeLock = (
      navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
      }
    ).wakeLock;
    if (!wakeLock) {
      return;
    }
    let released = false;
    let sentinel: { release: () => Promise<void> } | null = null;
    wakeLock
      .request("screen")
      .then((lock) => {
        if (released) {
          void lock.release();
          return;
        }
        sentinel = lock;
      })
      .catch(() => undefined);
    return () => {
      released = true;
      void sentinel?.release();
    };
  }, [running]);

  useEffect(() => {
    if (mode !== "countdown" || !running || countdownMs <= 0 || elapsed < countdownMs || announced.current) {
      return;
    }
    announced.current = true;
    accumulated.current = countdownMs;
    startedAt.current = null;
    setElapsed(countdownMs);
    setRunning(false);
    setFinished(true);
    beep();
    navigator.vibrate?.([200, 100, 200, 100, 320]);
  }, [elapsed, running, mode, countdownMs]);

  function switchMode(next: Mode) {
    accumulated.current = 0;
    startedAt.current = null;
    announced.current = false;
    setRunning(false);
    setElapsed(0);
    setLaps([]);
    setFinished(false);
    setMode(next);
  }

  function start() {
    if (mode === "countdown" && countdownMs <= 0) {
      return;
    }
    if (finished || (mode === "countdown" && accumulated.current >= countdownMs && countdownMs > 0)) {
      accumulated.current = 0;
      setElapsed(0);
    }
    announced.current = false;
    setFinished(false);
    startedAt.current = Date.now();
    setRunning(true);
  }

  function pause() {
    if (startedAt.current != null) {
      accumulated.current += Date.now() - startedAt.current;
    }
    startedAt.current = null;
    setElapsed(accumulated.current);
    setRunning(false);
  }

  function reset() {
    accumulated.current = 0;
    startedAt.current = null;
    announced.current = false;
    setRunning(false);
    setElapsed(0);
    setLaps([]);
    setFinished(false);
  }

  function lap() {
    setLaps((current) => [elapsed, ...current].slice(0, 20));
  }

  function applyPreset(totalSeconds: number) {
    if (running) {
      return;
    }
    setMinutes(String(Math.floor(totalSeconds / 60)));
    setSeconds(String(totalSeconds % 60));
    reset();
  }

  return (
    <section className="session-card timer-page">
      <p className="eyebrow">Utilidad</p>
      <h1>Cronómetro</h1>
      <p className="lede">Para medir una serie o un descanso sin salir de la app.</p>

      <div className="timer-modes" role="tablist" aria-label="Tipo de cronómetro">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "stopwatch"}
          className={mode === "stopwatch" ? "active" : ""}
          onClick={() => switchMode("stopwatch")}
        >
          Cronómetro
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "countdown"}
          className={mode === "countdown" ? "active" : ""}
          onClick={() => switchMode("countdown")}
        >
          Cuenta regresiva
        </button>
      </div>

      <p className="timer-face">
        {mode === "stopwatch" ? formatClock(display) : formatCountdown(remaining)}
      </p>
      {finished ? <p className="alert ok timer-done">Tiempo cumplido.</p> : null}

      {mode === "countdown" ? (
        <>
          <div className="preset-row">
            {PRESETS.map((preset) => (
              <button key={preset.label} type="button" className="btn-ghost" onClick={() => applyPreset(preset.seconds)} disabled={running}>
                {preset.label}
              </button>
            ))}
          </div>
          <div className="form-grid timer-inputs">
            <label className="field">
              <span className="field-label">Minutos</span>
              <input
                type="number"
                min={0}
                max={99}
                value={minutes}
                disabled={running}
                onChange={(event) => setMinutes(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Segundos</span>
              <input
                type="number"
                min={0}
                max={59}
                value={seconds}
                disabled={running}
                onChange={(event) => setSeconds(event.target.value)}
              />
            </label>
          </div>
        </>
      ) : null}

      <div className="timer-actions">
        {running ? (
          <button type="button" className="btn-primary btn-inline" onClick={pause}>
            Pausar
          </button>
        ) : (
          <button type="button" className="btn-primary btn-inline" onClick={start} disabled={mode === "countdown" && countdownMs <= 0}>
            {elapsed > 0 && !finished ? "Reanudar" : "Iniciar"}
          </button>
        )}
        {mode === "stopwatch" ? (
          <button type="button" className="btn-ghost" onClick={lap} disabled={!running}>
            Vuelta
          </button>
        ) : null}
        <button type="button" className="btn-ghost" onClick={reset}>
          Reiniciar
        </button>
      </div>

      {mode === "stopwatch" && laps.length > 0 ? (
        <ol className="lap-list">
          {laps.map((value, index) => (
            <li key={`${value}-${index}`}>
              <span>Vuelta {laps.length - index}</span>
              <strong>{formatClock(value)}</strong>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
