/**
 * Procedural Web Audio Sound Engine for Tactile UI/UX Feedback
 * Follows Apple WWDC "Designing Audio-Haptic Experiences" & Emil Design Engineering principles:
 * - Direct causality (fires immediately on interaction frame)
 * - Restrained amplitude and warm organic frequencies (sine / soft triangle)
 * - Zero external assets or network latency
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

// Ensure context resumes on first user gesture
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
}

/**
 * 1. Subtle, organic tactile tap (preset chips, subnav tabs, drawer toggles)
 */
export function playTap() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;

    // Pitch sweep: fast downward chirp mimicking physical contact
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch {
    // AudioContext blocked or unsupported, silently fail
  }
}

/**
 * 2. Segmented tenant switch sound (dual-click mechanical feel)
 */
export function playSwitch() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Primary click
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(320, now);
    osc1.frequency.exponentialRampToValueAtTime(140, now + 0.035);

    gain1.gain.setValueAtTime(0.07, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.045);

    // Subtle follow-up transient (12ms later)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(540, now + 0.012);
    osc2.frequency.exponentialRampToValueAtTime(280, now + 0.045);

    gain2.gain.setValueAtTime(0.04, now + 0.012);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.012);
    osc2.stop(now + 0.055);
  } catch {
    // Silently fail
  }
}

/**
 * 3. Inbound Dispatch Trigger Launch (warm rising tone)
 */
export function playDispatchLaunch() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.14);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  } catch {
    // Silently fail
  }
}

/**
 * 4. Step Progression Tick (advances through the 4 pipeline stages)
 */
export function playStepTick(stepIndex: number) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const baseFrequencies = [440, 523.25, 659.25, 783.99]; // A4, C5, E5, G5
    const targetFreq = baseFrequencies[(stepIndex - 1) % baseFrequencies.length] || 520;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(targetFreq, now);

    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch {
    // Silently fail
  }
}

/**
 * 5. Dispatch Success Chime (warm, peaceful two-tone chord resolution)
 */
export function playDispatchComplete() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chord = [587.33, 739.99, 880]; // D5, F#5, A5 warm triad

    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const offset = idx * 0.035;
      osc.frequency.setValueAtTime(freq, now + offset);

      gain.gain.setValueAtTime(0.04 / (idx + 1), now + offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.3);
    });
  } catch {
    // Silently fail
  }
}
