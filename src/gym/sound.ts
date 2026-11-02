let shared: AudioContext | null = null;

function audioContext() {
  const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
  const Context = window.AudioContext ?? audioWindow.webkitAudioContext;
  if (!Context) {
    return null;
  }
  if (!shared || shared.state === "closed") {
    shared = new Context();
  }
  return shared;
}

export function unlockSound() {
  const context = audioContext();
  if (context?.state === "suspended") {
    void context.resume();
  }
}

export function beep() {
  const context = audioContext();
  if (!context) {
    return;
  }
  if (context.state === "suspended") {
    void context.resume();
  }
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  oscillator.connect(gain);
  gain.connect(context.destination);
  const now = context.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  oscillator.start(now);
  oscillator.stop(now + 0.45);
}
