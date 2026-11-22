const SAMPLE_RATE = 22050;

let alarm: HTMLAudioElement | null = null;
let primed: Promise<void> | null = null;
let playGeneration = 0;
let vibratedAt = 0;
let context: AudioContext | null = null;
const liveNodes = new Set<AudioNode>();

function writeText(view: DataView, offset: number, text: string) {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

const ALARM_PULSES = [
  { at: 0, frequency: 880, duration: 0.18 },
  { at: 0.3, frequency: 880, duration: 0.18 },
  { at: 0.6, frequency: 1320, duration: 0.36 },
];
const ALARM_LENGTH = 1.05;

function encodeWav(samples: Float32Array, sampleRate: number) {
  const bytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + bytes);
  const view = new DataView(buffer);
  writeText(view, 0, "RIFF");
  view.setUint32(4, 36 + bytes, true);
  writeText(view, 8, "WAVE");
  writeText(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(view, 36, "data");
  view.setUint32(40, bytes, true);
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(44 + index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function writeAlarm(samples: Float32Array, sampleRate: number, offsetSeconds: number) {
  for (const pulse of ALARM_PULSES) {
    const start = Math.floor((offsetSeconds + pulse.at) * sampleRate);
    const count = Math.floor(pulse.duration * sampleRate);
    for (let index = 0; index < count; index += 1) {
      const attack = Math.min(1, index / (sampleRate * 0.01));
      const release = Math.min(1, (count - index) / (sampleRate * 0.03));
      const envelope = Math.min(attack, release);
      samples[start + index] =
        Math.sin((2 * Math.PI * pulse.frequency * index) / sampleRate) * envelope * 0.95;
    }
  }
}

function alarmWav() {
  const length = Math.floor(ALARM_LENGTH * SAMPLE_RATE);
  const samples = new Float32Array(length);
  writeAlarm(samples, SAMPLE_RATE, 0);
  return encodeWav(samples, SAMPLE_RATE);
}

function alarmAudio() {
  if (!alarm) {
    alarm = new Audio(URL.createObjectURL(alarmWav()));
    alarm.preload = "auto";
    alarm.setAttribute("playsinline", "true");
  }
  return alarm;
}

function audioContext() {
  const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
  const Context = window.AudioContext ?? audioWindow.webkitAudioContext;
  if (!Context) {
    return null;
  }
  if (!context || context.state === "closed") {
    context = new Context();
  }
  return context;
}

function vibrate() {
  try {
    navigator.vibrate?.([180, 80, 180, 80, 280]);
  } catch {
    // El celular puede no vibrar. El sonido sigue su camino.
  }
}

async function playOscillator() {
  const current = audioContext();
  if (!current) {
    return false;
  }
  if (current.state !== "running") {
    try {
      await current.resume();
    } catch {
      return false;
    }
  }
  if (current.state !== "running") {
    return false;
  }
  const startAt = current.currentTime + 0.03;
  const pulses = [
    { at: 0, frequency: 880, duration: 0.18 },
    { at: 0.3, frequency: 880, duration: 0.18 },
    { at: 0.6, frequency: 1320, duration: 0.36 },
  ];
  for (const pulse of pulses) {
    const oscillator = current.createOscillator();
    const gain = current.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = pulse.frequency;
    oscillator.connect(gain);
    gain.connect(current.destination);
    const start = startAt + pulse.at;
    const end = start + pulse.duration;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.9, start + 0.02);
    gain.gain.linearRampToValueAtTime(0, end);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
    liveNodes.add(oscillator);
    oscillator.onended = () => {
      liveNodes.delete(oscillator);
    };
  }
  return true;
}

export function unlockSound() {
  const audio = alarmAudio();
  if (!primed) {
    const generation = playGeneration;
    audio.volume = 0;
    primed = audio
      .play()
      .then(() => {
        if (generation !== playGeneration) {
          return;
        }
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1;
      })
      .catch(() => {
        audio.volume = 1;
        primed = null;
      });
  }

  const current = audioContext();
  if (!current) {
    return;
  }
  if (current.state !== "running") {
    void current.resume();
  }
  try {
    const buffer = current.createBuffer(1, 1, current.sampleRate);
    const source = current.createBufferSource();
    source.buffer = buffer;
    source.connect(current.destination);
    source.start();
  } catch {
    // Si este desbloqueo falla, el archivo de la alarma igual puede sonar.
  }
}

export async function beep() {
  if (Date.now() - vibratedAt > 1500) {
    vibratedAt = Date.now();
    vibrate();
  }
  const audio = alarmAudio();
  playGeneration += 1;
  audio.volume = 1;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {
    // El elemento todavía no se puede mover. play() igual intenta arrancar.
  }
  try {
    await audio.play();
    return true;
  } catch {
    return playOscillator();
  }
}

if (typeof window !== "undefined") {
  const prime = () => {
    unlockSound();
    window.removeEventListener("pointerdown", prime);
  };
  window.addEventListener("pointerdown", prime);
}
