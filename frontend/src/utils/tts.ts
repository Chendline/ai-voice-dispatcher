/**
 * Browser text-to-speech engine.
 *
 * Uses the native Web Speech API (window.speechSynthesis). Everything here is
 * defensive on purpose: Opera/Chromium can expose speechSynthesis before any
 * voices exist, can fire stale callbacks after cancel(), and can silently drop
 * a resume(). The controller keeps a generation token so late events can never
 * corrupt the current playback state.
 */

export type TtsStatus =
  | 'unsupported'
  | 'loading'
  | 'ready'
  | 'speaking'
  | 'paused'
  | 'completed'
  | 'error';

export interface TtsCapabilities {
  supported: boolean;
  voicesChanged: boolean;
  pause: boolean;
  resume: boolean;
}

export interface VoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  isDefault: boolean;
}

export interface SpeechSettings {
  voiceURI: string;
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
}

export interface TtsState {
  status: TtsStatus;
  error: string | null;
  hint: string | null;
  notice: string | null;
  chunkIndex: number;
  chunkCount: number;
  activeVoice: string | null;
  replayable: boolean;
}

export const MAX_CHUNK_LENGTH = 180;

export const DEFAULT_SPEECH_SETTINGS: SpeechSettings = {
  voiceURI: '',
  lang: 'en-US',
  rate: 1,
  pitch: 1,
  volume: 1,
};

export const EMPTY_TTS_STATE: TtsState = {
  status: 'loading',
  error: null,
  hint: null,
  notice: null,
  chunkIndex: 0,
  chunkCount: 0,
  activeVoice: null,
  replayable: false,
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function getSynth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis ?? null;
}

export function detectCapabilities(): TtsCapabilities {
  const synth = getSynth();
  const supported =
    Boolean(synth) &&
    typeof window !== 'undefined' &&
    typeof window.SpeechSynthesisUtterance === 'function';
  return {
    supported,
    voicesChanged: Boolean(synth && 'onvoiceschanged' in synth),
    pause: Boolean(synth && typeof synth.pause === 'function'),
    resume: Boolean(synth && typeof synth.resume === 'function'),
  };
}

export function describeBrowser(userAgent: string): string {
  if (/OPR\/|Opera\//i.test(userAgent)) return 'Opera (Chromium)';
  if (/Edg\//i.test(userAgent)) return 'Microsoft Edge';
  if (/Firefox\//i.test(userAgent)) return 'Mozilla Firefox';
  if (/Chrome\//i.test(userAgent)) return 'Google Chrome';
  if (/Safari\//i.test(userAgent)) return 'Safari';
  return 'Unknown browser';
}

export function languageLabel(lang: string): string {
  const base = (lang || 'und').split('-')[0];
  try {
    const names = new Intl.DisplayNames([base], { type: 'language' });
    return names.of(base) ?? lang;
  } catch {
    return lang || 'und';
  }
}

export function toVoiceOptions(voices: readonly SpeechSynthesisVoice[]): VoiceOption[] {
  const seen = new Set<string>();
  const options: VoiceOption[] = [];
  for (const voice of voices) {
    const voiceURI = voice.voiceURI || voice.name;
    if (!voiceURI || seen.has(voiceURI)) continue;
    seen.add(voiceURI);
    options.push({
      voiceURI,
      name: voice.name || voiceURI,
      lang: voice.lang || 'und',
      localService: Boolean(voice.localService),
      isDefault: Boolean(voice.default),
    });
  }
  return options.sort(
    (a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name),
  );
}

export function pickVoice(
  voices: readonly VoiceOption[],
  preferredURI: string,
  lang: string,
): VoiceOption | undefined {
  if (voices.length === 0) return undefined;

  if (preferredURI) {
    const exact = voices.find(voice => voice.voiceURI === preferredURI);
    if (exact) return exact;
  }

  const base = (lang || 'en').split('-')[0].toLowerCase();
  const matchesLanguage = (voice: VoiceOption) =>
    voice.lang.toLowerCase().split('-')[0] === base;

  return (
    voices.find(voice => voice.isDefault && matchesLanguage(voice)) ??
    voices.find(voice => voice.localService && matchesLanguage(voice)) ??
    voices.find(matchesLanguage) ??
    voices.find(voice => voice.isDefault) ??
    voices.find(voice => voice.localService) ??
    voices[0]
  );
}

export function browserLanguage(): string {
  if (typeof navigator === 'undefined') return 'en-US';
  return navigator.language || 'en-US';
}

/**
 * Picks an offline voice to use after the user's voice fails. Cloud/network
 * voices are excluded on purpose: they are the usual cause of the failure, so
 * retrying them would just fail again.
 */
export function pickFallbackVoice(
  voices: readonly VoiceOption[],
  ...languages: string[]
): VoiceOption | undefined {
  if (voices.length === 0) return undefined;

  for (const lang of languages) {
    if (!lang) continue;
    const base = lang.split('-')[0].toLowerCase();
    const match = voices.find(
      voice => voice.localService && voice.lang.toLowerCase().split('-')[0] === base,
    );
    if (match) return match;
  }

  return (
    voices.find(voice => voice.localService && voice.isDefault) ??
    voices.find(voice => voice.localService) ??
    voices.find(voice => voice.isDefault) ??
    voices[0]
  );
}

function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?…]+[.!?…]+[”"')\]]*|[^.!?…]+$/g);
  if (!matches) return [text];
  return matches.map(sentence => sentence.trim()).filter(Boolean);
}

function splitLongSegment(segment: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const word of segment.split(' ')) {
    if (!word) continue;
    if (word.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      for (let index = 0; index < word.length; index += maxLength) {
        chunks.push(word.slice(index, index + maxLength));
      }
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLength) {
      if (current) chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

/**
 * Splits text into speakable chunks without cutting sentences when possible.
 * Long sentences fall back to word boundaries, then hard slices for huge words.
 */
export function chunkText(input: string, maxLength = MAX_CHUNK_LENGTH): string[] {
  const text = input.replace(/\s+/g, ' ').trim();
  if (!text) return [];
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let current = '';
  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };

  for (const sentence of splitSentences(text)) {
    if (sentence.length > maxLength) {
      flush();
      chunks.push(...splitLongSegment(sentence, maxLength));
      continue;
    }
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length > maxLength) {
      flush();
      current = sentence;
    } else {
      current = candidate;
    }
  }
  flush();

  return chunks;
}

export function describeSpeechError(code: string): string {
  switch (code) {
    case 'not-allowed':
      return 'Speech was blocked by the browser. Press Play again from a direct click.';
    case 'audio-busy':
      return 'The audio device is busy. Close other audio apps, then retry.';
    case 'audio-hardware':
      return 'No audio output device was found.';
    case 'network':
      return 'The selected voice needs a network connection, which failed.';
    case 'voice-unavailable':
    case 'language-unavailable':
      return 'The selected voice is not available on this system.';
    case 'synthesis-failed':
    case 'synthesis-unavailable':
      return 'The browser speech engine failed to synthesize audio.';
    case 'text-too-long':
      return 'The text is too long for the speech engine.';
    case 'invalid-argument':
      return 'The speech request was invalid.';
    default:
      return `Speech failed (${code || 'unknown error'}).`;
  }
}

export function troubleshootingHint(input: {
  error: string | null;
  voiceCount: number;
  browser: string;
}): string {
  if (input.voiceCount === 0) {
    return input.browser === 'Opera (Chromium)'
      ? 'Opera has not exposed any system voices yet. Press Refresh voices; if that fails, install a Windows speech voice in Settings → Time & language → Speech and restart Opera.'
      : 'No system voices are exposed. Install a speech voice for your OS, then press Refresh voices.';
  }
  if (!input.error) {
    return 'Speech is ready. If you hear nothing, check the system output device and volume.';
  }
  if (/blocked|not allowed|permission/i.test(input.error)) {
    return 'Browsers require a direct click to start speech. Press Play or Test Voice again.';
  }
  if (/network/i.test(input.error)) {
    return 'The selected voice is network-backed. Choose a voice marked local, or check your connection.';
  }
  if (/busy|hardware/i.test(input.error)) {
    return 'Another app may be using the audio device. Close it, then press Retry.';
  }
  return 'Press Retry. If it keeps failing, choose a different voice or reload the page.';
}

const START_TIMEOUT_MS = 8000;
const RESUME_TIMEOUT_MS = 2500;
const VOICE_POLL_DELAYS = [250, 500, 1000, 1500, 2500, 4000];

interface ControllerCallbacks {
  onState: (state: TtsState) => void;
  onVoices: (voices: VoiceOption[]) => void;
}

export class SpeechPlaybackController {
  private synth: SpeechSynthesis | null;
  private callbacks: ControllerCallbacks;
  private state: TtsState;
  private voices: VoiceOption[] = [];
  private settings: SpeechSettings = DEFAULT_SPEECH_SETTINGS;
  private chunks: string[] = [];
  private index = 0;
  private generation = 0;
  private lastText = '';
  private startTimer: number | null = null;
  private resumeTimer: number | null = null;
  private voicesTimer: number | null = null;
  private voicesAttempts = 0;
  private fallbackUsed = false;
  private noticeShown = false;
  private disposed = false;
  private readonly pauseSupported: boolean;
  private readonly boundVoicesChanged: () => void;

  constructor(callbacks: ControllerCallbacks) {
    this.callbacks = callbacks;
    this.synth = getSynth();
    const capabilities = detectCapabilities();
    this.pauseSupported = capabilities.pause;
    this.state = {
      ...EMPTY_TTS_STATE,
      status: capabilities.supported ? 'loading' : 'unsupported',
    };
    this.boundVoicesChanged = () => {
      this.voicesAttempts = 0;
      this.refreshVoices();
    };
    if (this.synth && capabilities.voicesChanged) {
      try {
        this.synth.addEventListener('voiceschanged', this.boundVoicesChanged);
      } catch {
        // Older engines only expose onvoiceschanged; polling below covers it.
      }
    }
    this.emit();
  }

  getState(): TtsState {
    return this.state;
  }

  getVoices(): VoiceOption[] {
    return this.voices;
  }

  refreshVoices(): VoiceOption[] {
    if (!this.synth) {
      this.emit();
      return [];
    }

    let raw: SpeechSynthesisVoice[] = [];
    try {
      raw = this.synth.getVoices() ?? [];
    } catch {
      raw = [];
    }

    this.voices = toVoiceOptions(raw);
    this.callbacks.onVoices(this.voices);

    if (this.voices.length > 0) {
      this.clearVoicesTimer();
      this.voicesAttempts = VOICE_POLL_DELAYS.length;
      if (this.state.status === 'loading') this.patch({ status: 'ready' });
    } else {
      if (this.state.status === 'loading') this.patch({ status: 'ready' });
      this.scheduleVoicesPoll();
    }

    return this.voices;
  }

  speak(text: string, settings: SpeechSettings): boolean {
    if (!this.synth) {
      this.patch({
        status: 'unsupported',
        error: 'This browser does not expose the Web Speech API.',
        hint: 'Use a Chromium-based browser with a system speech voice installed.',
      });
      return false;
    }

    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) {
      this.patch({
        error: 'There is no text to speak.',
        hint: 'Type or dictate a message first, or press Test Voice.',
      });
      return false;
    }

    this.stopInternal();
    const generation = this.generation;
    this.settings = settings;
    this.lastText = text;
    this.chunks = chunkText(clean);
    this.index = 0;
    this.fallbackUsed = false;
    this.noticeShown = false;

    this.patch({
      status: 'loading',
      error: null,
      hint: null,
      notice: null,
      chunkIndex: 0,
      chunkCount: this.chunks.length,
      activeVoice: null,
      replayable: true,
    });

    this.startChunk(generation);
    return true;
  }

  pause(): void {
    if (!this.synth || this.state.status !== 'speaking') return;
    if (!this.pauseSupported) {
      this.patch({ notice: 'Pause is not supported by this browser speech engine.' });
      return;
    }
    try {
      this.synth.pause();
    } catch {
      this.patch({ notice: 'The browser rejected pause; use Stop and Play again.' });
      return;
    }
    this.clearStartTimer();
    this.patch({ status: 'paused' });
  }

  resume(): void {
    if (!this.synth || this.state.status !== 'paused') return;
    try {
      this.synth.resume();
    } catch {
      this.patch({ notice: 'Resume failed; restarting the current part.' });
      this.restartCurrentChunk();
      return;
    }

    this.patch({ status: 'speaking' });
    const generation = this.generation;
    this.clearResumeTimer();
    this.resumeTimer = window.setTimeout(() => {
      this.resumeTimer = null;
      if (generation !== this.generation || !this.synth) return;
      if (this.synth.speaking || this.synth.pending) return;
      // Chromium/Opera can drop resume() for local voices. Restart the chunk
      // instead of leaving the UI stuck in "Speaking".
      this.patch({
        notice: 'Resume did not take effect in this browser; restarting the current part.',
      });
      this.restartCurrentChunk();
    }, RESUME_TIMEOUT_MS);
  }

  stop(): void {
    this.stopInternal();
    this.chunks = [];
    this.index = 0;
    this.patch({
      status: this.synth ? 'ready' : 'unsupported',
      error: null,
      hint: null,
      notice: null,
      chunkIndex: 0,
      chunkCount: 0,
      activeVoice: null,
    });
  }

  replay(): void {
    if (!this.lastText) return;
    this.speak(this.lastText, this.settings);
  }

  dispose(): void {
    this.disposed = true;
    this.generation += 1;
    this.clearAllTimers();
    if (this.synth) {
      try {
        this.synth.removeEventListener('voiceschanged', this.boundVoicesChanged);
      } catch {
        // ignore
      }
      try {
        this.synth.cancel();
      } catch {
        // ignore
      }
    }
  }

  private stopInternal(): void {
    this.generation += 1;
    this.clearAllTimers();
    if (this.synth) {
      try {
        // Some Chromium builds keep a stuck queue after cancel(); resume first.
        this.synth.resume();
        this.synth.cancel();
      } catch {
        // ignore
      }
    }
  }

  private restartCurrentChunk(): void {
    if (!this.synth) return;
    const generation = this.generation;
    try {
      this.synth.cancel();
    } catch {
      // ignore
    }
    this.startChunk(generation);
  }

  private startChunk(generation: number): void {
    if (!this.synth || generation !== this.generation) return;

    const text = this.chunks[this.index];
    if (!text) {
      this.finish(generation);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const preferred = pickVoice(this.voices, this.settings.voiceURI, this.settings.lang);
    const requested = this.voices.find(voice => voice.voiceURI === this.settings.voiceURI);

    if (preferred) {
      const rawVoice = this.synth
        .getVoices()
        .find(voice => voice.voiceURI === preferred.voiceURI);
      if (rawVoice) {
        utterance.voice = rawVoice;
        utterance.lang = rawVoice.lang || preferred.lang;
      } else {
        utterance.lang = preferred.lang;
      }
      if (requested && preferred.voiceURI !== requested.voiceURI && !this.noticeShown) {
        this.noticeShown = true;
        this.patch({
          notice: `"${requested.name}" is unavailable; using "${preferred.name}" instead.`,
        });
      }
      this.patch({ activeVoice: preferred.name });
    } else {
      utterance.lang = this.settings.lang || 'en-US';
      this.patch({ activeVoice: 'System default' });
    }

    utterance.rate = clamp(this.settings.rate, 0.5, 2);
    utterance.pitch = clamp(this.settings.pitch, 0, 2);
    utterance.volume = clamp(this.settings.volume, 0, 1);

    utterance.onstart = () => {
      if (generation !== this.generation) return;
      this.clearStartTimer();
      this.patch({ status: 'speaking', error: null, hint: null });
    };

    utterance.onend = () => {
      if (generation !== this.generation) return;
      this.clearStartTimer();
      if (this.state.status === 'paused') return;
      this.index += 1;
      this.patch({ chunkIndex: this.index });
      if (this.index >= this.chunks.length) {
        this.finish(generation);
      } else {
        this.startChunk(generation);
      }
    };

    utterance.onerror = event => {
      if (generation !== this.generation) return;
      const code = (event as SpeechSynthesisErrorEvent).error;
      if (code === 'interrupted' || code === 'canceled') return;
      this.clearStartTimer();
      this.handleUtteranceError(code, generation);
    };

    try {
      this.synth.speak(utterance);
    } catch {
      this.handleUtteranceError('synthesis-failed', generation);
      return;
    }

    this.clearStartTimer();
    this.startTimer = window.setTimeout(() => {
      this.startTimer = null;
      if (generation !== this.generation || !this.synth) return;
      if (this.state.status === 'speaking') return;
      if (this.synth.speaking) {
        this.patch({ status: 'speaking' });
        return;
      }
      // No onstart and nothing playing: surface the failure instead of hanging.
      this.handleUtteranceError('synthesis-failed', generation);
    }, START_TIMEOUT_MS);
  }

  private handleUtteranceError(code: string, generation: number): void {
    if (generation !== this.generation) return;

    const voiceRelated =
      code === 'voice-unavailable' ||
      code === 'language-unavailable' ||
      code === 'synthesis-failed' ||
      code === 'synthesis-unavailable';

    if (voiceRelated && !this.fallbackUsed) {
      this.fallbackUsed = true;
      const requested = this.voices.find(voice => voice.voiceURI === this.settings.voiceURI);
      const fallback = pickFallbackVoice(
        this.voices,
        this.settings.lang,
        browserLanguage(),
      );

      if (fallback && fallback.voiceURI !== this.settings.voiceURI) {
        this.settings = {
          ...this.settings,
          voiceURI: fallback.voiceURI,
          lang: fallback.lang,
        };
        this.patch({
          notice: `${requested ? `"${requested.name}"` : 'The selected voice'} failed; switched to "${
            fallback.name
          }"${fallback.localService ? ' (local)' : ''} instead.`,
          activeVoice: fallback.name,
        });
      } else {
        this.settings = {
          ...this.settings,
          voiceURI: '',
          lang: browserLanguage(),
        };
        this.patch({
          notice: 'The selected voice failed; retrying with the system default voice.',
          activeVoice: 'System default',
        });
      }

      // Invalidate callbacks from the failed utterance and clear the stuck
      // queue before speaking again, otherwise Chromium re-fires the error.
      this.generation += 1;
      this.clearAllTimers();
      try {
        this.synth?.cancel();
      } catch {
        // ignore
      }
      this.startChunk(this.generation);
      return;
    }

    this.fail(describeSpeechError(code), generation);
  }

  private fail(message: string, generation: number): void {
    if (generation !== this.generation) return;
    this.clearAllTimers();
    try {
      this.synth?.cancel();
    } catch {
      // ignore
    }
    const browser =
      typeof navigator === 'undefined' ? 'Unknown browser' : describeBrowser(navigator.userAgent);
    this.patch({
      status: 'error',
      error: message,
      hint: troubleshootingHint({ error: message, voiceCount: this.voices.length, browser }),
      activeVoice: null,
    });
  }

  private finish(generation: number): void {
    if (generation !== this.generation) return;
    this.clearAllTimers();
    this.patch({
      status: 'completed',
      error: null,
      hint: null,
      chunkIndex: this.chunks.length,
    });
  }

  private scheduleVoicesPoll(): void {
    if (this.disposed || this.voicesTimer !== null) return;
    if (this.voicesAttempts >= VOICE_POLL_DELAYS.length) return;
    const delay = VOICE_POLL_DELAYS[this.voicesAttempts];
    this.voicesAttempts += 1;
    this.voicesTimer = window.setTimeout(() => {
      this.voicesTimer = null;
      if (this.disposed) return;
      this.refreshVoices();
    }, delay);
  }

  private patch(partial: Partial<TtsState>): void {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  private emit(): void {
    if (this.disposed) return;
    this.callbacks.onState(this.state);
  }

  private clearStartTimer(): void {
    if (this.startTimer !== null) {
      window.clearTimeout(this.startTimer);
      this.startTimer = null;
    }
  }

  private clearResumeTimer(): void {
    if (this.resumeTimer !== null) {
      window.clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
  }

  private clearVoicesTimer(): void {
    if (this.voicesTimer !== null) {
      window.clearTimeout(this.voicesTimer);
      this.voicesTimer = null;
    }
  }

  private clearAllTimers(): void {
    this.clearStartTimer();
    this.clearResumeTimer();
  }
}
