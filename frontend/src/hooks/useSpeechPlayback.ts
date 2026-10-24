import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_SPEECH_SETTINGS,
  EMPTY_TTS_STATE,
  SpeechPlaybackController,
  describeBrowser,
  detectCapabilities,
  troubleshootingHint,
  type SpeechSettings,
  type TtsState,
  type VoiceOption,
} from '../utils/tts';

const STORAGE_KEY = 'aegis.tts.settings.v1';

export const TEST_VOICE_SAMPLE =
  'This is a voice preview for AEGIS dispatch. Emergency routing is active and all connectors are standing by.';

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function readSettings(): SpeechSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SPEECH_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SPEECH_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<SpeechSettings>;
    return {
      voiceURI: typeof parsed.voiceURI === 'string' ? parsed.voiceURI : '',
      lang: typeof parsed.lang === 'string' && parsed.lang ? parsed.lang : 'en-US',
      rate: clamp(parsed.rate, 0.5, 2, 1),
      pitch: clamp(parsed.pitch, 0, 2, 1),
      volume: clamp(parsed.volume, 0, 1, 1),
    };
  } catch {
    return { ...DEFAULT_SPEECH_SETTINGS };
  }
}

function persistSettings(settings: SpeechSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private mode / storage disabled: preferences simply do not persist.
  }
}

export function useSpeechPlayback() {
  const capabilities = useMemo(() => detectCapabilities(), []);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [state, setState] = useState<TtsState>(() => ({
    ...EMPTY_TTS_STATE,
    status: capabilities.supported ? 'loading' : 'unsupported',
  }));
  const [settings, setSettings] = useState<SpeechSettings>(readSettings);
  const controllerRef = useRef<SpeechPlaybackController | null>(null);

  useEffect(() => {
    const controller = new SpeechPlaybackController({
      onState: setState,
      onVoices: setVoices,
    });
    controllerRef.current = controller;
    controller.refreshVoices();

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    persistSettings(settings);
  }, [settings]);

  // A stored voice can disappear between machines or browser updates. Derive a
  // safe select value instead of writing state from an effect.
  const effectiveVoiceURI = useMemo(() => {
    if (!settings.voiceURI) return '';
    if (voices.length === 0) return settings.voiceURI;
    return voices.some(voice => voice.voiceURI === settings.voiceURI) ? settings.voiceURI : '';
  }, [settings.voiceURI, voices]);

  const updateSettings = useCallback((patch: Partial<SpeechSettings>) => {
    setSettings(current => ({ ...current, ...patch }));
  }, []);

  const play = useCallback(
    (text: string) => controllerRef.current?.speak(text, settings) ?? false,
    [settings],
  );
  const testVoice = useCallback(
    () => controllerRef.current?.speak(TEST_VOICE_SAMPLE, settings) ?? false,
    [settings],
  );
  const pause = useCallback(() => controllerRef.current?.pause(), []);
  const resume = useCallback(() => controllerRef.current?.resume(), []);
  const stop = useCallback(() => controllerRef.current?.stop(), []);
  const replay = useCallback(() => controllerRef.current?.replay(), []);
  const refreshVoices = useCallback(() => {
    controllerRef.current?.refreshVoices();
  }, []);

  const selectedVoice = useMemo(
    () => voices.find(voice => voice.voiceURI === effectiveVoiceURI) ?? null,
    [voices, effectiveVoiceURI],
  );

  const browser = useMemo(
    () => describeBrowser(typeof navigator === 'undefined' ? '' : navigator.userAgent),
    [],
  );

  const hint = useMemo(
    () => troubleshootingHint({ error: state.error, voiceCount: voices.length, browser }),
    [state.error, voices.length, browser],
  );

  return {
    capabilities,
    voices,
    state,
    settings,
    effectiveVoiceURI,
    selectedVoice,
    browser,
    hint,
    play,
    testVoice,
    pause,
    resume,
    stop,
    replay,
    refreshVoices,
    updateSettings,
  };
}
