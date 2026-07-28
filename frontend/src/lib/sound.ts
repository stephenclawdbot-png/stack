// Tiny retro SFX synth — WebAudio oscillators, no audio assets needed.

let ctx: AudioContext | null = null;
let muted = typeof localStorage !== "undefined" && localStorage.getItem("stack-muted") === "1";

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  return ctx;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType,
  volume = 0.08,
  delay = 0
) {
  const c = ac();
  if (!c || muted) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, c.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + delay);
  osc.stop(c.currentTime + delay + duration);
}

/** UI click blip */
export function playBlip() {
  tone(340, 0.06, "square", 0.05);
}

/** money-in-the-bank claim chime */
export function playChime() {
  tone(660, 0.12, "sine", 0.09);
  tone(880, 0.14, "sine", 0.09, 0.08);
  tone(1320, 0.18, "sine", 0.07, 0.16);
}

/** heavy machine thunk (placing rigs, upgrades) */
export function playThunk() {
  tone(120, 0.1, "triangle", 0.12);
  tone(70, 0.16, "triangle", 0.1, 0.03);
}

/** occasional geiger tick for ambience */
export function playTick() {
  tone(1800 + Math.random() * 600, 0.015, "square", 0.02);
}

export function isMuted() {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  try {
    localStorage.setItem("stack-muted", muted ? "1" : "0");
  } catch { /* private mode */ }
  return muted;
}
