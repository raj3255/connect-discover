// Programmatic tones via Web Audio API — no audio files required.
// All exported functions are safe to call even when sounds are disabled
// or AudioContext is unavailable; they silently no-op.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function soundEnabled(): boolean {
  return localStorage.getItem('cd_sounds') !== 'false';
}

function tone(
  frequency: number,
  startSec: number,
  duration: number,
  volume = 0.25,
  type: OscillatorType = 'sine'
) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, c.currentTime + startSec);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startSec + duration);
  osc.start(c.currentTime + startSec);
  osc.stop(c.currentTime + startSec + duration + 0.01);
}

/** Three-note ascending chime — played when a match is found. */
export function playMatchFound(): void {
  if (!soundEnabled()) return;
  tone(523.25, 0,    0.14); // C5
  tone(659.25, 0.16, 0.14); // E5
  tone(783.99, 0.32, 0.28); // G5
}

/** Soft ping — played when a message arrives from the other person. */
export function playMessageReceived(): void {
  if (!soundEnabled()) return;
  tone(880, 0, 0.12, 0.18);
}

/** Lighter tick — played when you send a message. */
export function playMessageSent(): void {
  if (!soundEnabled()) return;
  tone(660, 0, 0.07, 0.12, 'triangle');
}
