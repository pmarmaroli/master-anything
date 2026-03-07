let audioCtx: AudioContext | null = null;
let soundEnabled = false;

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function isSoundEnabled() {
  return soundEnabled;
}

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15) {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export function playBossDamage() {
  playTone(400, 0.08);
  setTimeout(() => playTone(300, 0.06), 50);
}

export function playBossDefeated() {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.12, 'square', 0.12), i * 80);
  });
}

export function playLootDrop() {
  [1200, 1400, 1600].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.1, 'sine', 0.1), i * 60);
  });
}

export function playCounterattack() {
  playTone(150, 0.12, 'sawtooth', 0.1);
}

export function playWallBlock() {
  playTone(200, 0.15, 'sawtooth', 0.08);
  setTimeout(() => playTone(100, 0.1, 'sawtooth', 0.06), 80);
}

export function playButtonPress() {
  playTone(800, 0.04, 'square', 0.08);
}

export function playStreak() {
  playTone(1000, 0.08, 'sine', 0.1);
}
