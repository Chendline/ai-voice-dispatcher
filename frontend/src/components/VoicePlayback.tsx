import { useMemo } from 'react';
import { useSpeechPlayback } from '../hooks/useSpeechPlayback';
import { chunkText, browserLanguage, languageLabel, type TtsStatus, type VoiceOption } from '../utils/tts';

const STATUS_LABEL: Record<TtsStatus, string> = {
  unsupported: 'Unsupported',
  loading: 'Loading',
  ready: 'Ready',
  speaking: 'Speaking',
  paused: 'Paused',
  completed: 'Completed',
  error: 'Error',
};

function groupVoices(voices: VoiceOption[]) {
  const groups = new Map<string, VoiceOption[]>();
  for (const voice of voices) {
    const key = voice.lang || 'und';
    const list = groups.get(key);
    if (list) list.push(voice);
    else groups.set(key, [voice]);
  }
  return Array.from(groups, ([lang, list]) => ({
    lang,
    label: `${languageLabel(lang)} (${lang})`,
    voices: list,
  }));
}

interface VoicePlaybackProps {
  text: string;
}

export function VoicePlayback({ text }: VoicePlaybackProps) {
  const tts = useSpeechPlayback();
  const { state, capabilities, settings, voices } = tts;

  const trimmed = text.trim();
  const groupedVoices = useMemo(() => groupVoices(voices), [voices]);
  const plannedChunks = useMemo(() => chunkText(text).length, [text]);
  const localCount = voices.filter(voice => voice.localService).length;
  const networkCount = voices.length - localCount;

  const isSpeaking = state.status === 'speaking';
  const isPaused = state.status === 'paused';
  const isBusy = isSpeaking || isPaused || state.status === 'loading';
  const canPause = capabilities.pause;
  const retryText = trimmed ? text : undefined;

  return (
    <section className="panel-card voice-playback-card" aria-labelledby="tts-heading">
      <div className="panel-header">
        <div>
          <h2 className="panel-heading" id="tts-heading">Voice Playback</h2>
          <p className="panel-subtext">
            Read the transcription aloud with a voice installed on this device. Audio never leaves the browser.
          </p>
        </div>
        <span className={`tts-status ${state.status}`} role="status" aria-live="polite">
          <span className="tts-status-dot" aria-hidden="true" />
          {STATUS_LABEL[state.status]}
        </span>
      </div>

      <div className="tts-meta-row">
        <span className="tts-engine-badge">Browser · local</span>
        <span className="tts-voice-count">
          {voices.length === 0
            ? 'No voices detected'
            : `${voices.length} voice${voices.length === 1 ? '' : 's'} · ${localCount} local${networkCount ? ` · ${networkCount} network` : ''}`}
        </span>
        {state.chunkCount > 1 && (
          <span className="tts-chunk-progress">
            Part {Math.min(state.chunkIndex + 1, state.chunkCount)} of {state.chunkCount}
          </span>
        )}
      </div>

      <div className="tts-field">
        <label className="input-label" htmlFor="tts-voice">Voice</label>
        <select
          id="tts-voice"
          className="clean-input tts-select"
          value={tts.effectiveVoiceURI}
          onChange={event => {
            const nextURI = event.target.value;
            const nextVoice = voices.find(voice => voice.voiceURI === nextURI);
            tts.updateSettings({
              voiceURI: nextURI,
              // "System default" must not inherit the previous voice's language,
              // or it would re-select the same (possibly network) voice.
              lang: nextVoice?.lang ?? browserLanguage(),
            });
          }}
        >
          <option value="">System default</option>
          {groupedVoices.map(group => (
            <optgroup key={group.lang} label={group.label}>
              {group.voices.map(voice => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name}
                  {voice.localService ? '' : ' · network'}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="tts-slider-grid">
        <label className="tts-slider">
          <span className="tts-slider-label">
            Speed
            <output>{settings.rate.toFixed(2)}×</output>
          </span>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.05"
            value={settings.rate}
            onChange={event => tts.updateSettings({ rate: Number(event.target.value) })}
          />
        </label>
        <label className="tts-slider">
          <span className="tts-slider-label">
            Pitch
            <output>{settings.pitch.toFixed(2)}</output>
          </span>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={settings.pitch}
            onChange={event => tts.updateSettings({ pitch: Number(event.target.value) })}
          />
        </label>
        <label className="tts-slider">
          <span className="tts-slider-label">
            Volume
            <output>{Math.round(settings.volume * 100)}%</output>
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.volume}
            onChange={event => tts.updateSettings({ volume: Number(event.target.value) })}
          />
        </label>
      </div>

      <div className="tts-controls">
        <button
          type="button"
          className="tts-btn primary"
          onClick={() => tts.play(text)}
          disabled={!capabilities.supported || !trimmed}
          title={!trimmed ? 'Enter a transcription first' : 'Read the transcription aloud'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="6 3 20 12 6 21 6 3" />
          </svg>
          Play
        </button>

        {canPause && (
          <button
            type="button"
            className="tts-btn"
            onClick={() => (isPaused ? tts.resume() : tts.pause())}
            disabled={!isSpeaking && !isPaused}
          >
            {isPaused ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="7 4 20 12 7 20 7 4" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            )}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        )}

        <button
          type="button"
          className="tts-btn"
          onClick={() => tts.stop()}
          disabled={!isBusy}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="5" y="5" width="14" height="14" rx="2" />
          </svg>
          Stop
        </button>

        <button
          type="button"
          className="tts-btn"
          onClick={() => tts.replay()}
          disabled={!state.replayable}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Replay
        </button>

        <button
          type="button"
          className="tts-btn ghost"
          onClick={() => tts.testVoice()}
          disabled={!capabilities.supported}
          title="Speak a short sample with the current voice settings"
        >
          Test Voice
        </button>
      </div>

      {state.notice && (
        <p className="tts-notice" role="status">{state.notice}</p>
      )}

      {state.error && (
        <div className="tts-error" role="alert">
          <p>{state.error}</p>
          <button
            type="button"
            className="tts-retry-btn"
            onClick={() => {
              if (retryText) tts.play(retryText);
              else tts.testVoice();
            }}
            disabled={!capabilities.supported}
          >
            Retry
          </button>
        </div>
      )}

      {!capabilities.supported && (
        <p className="tts-hint">
          This browser does not expose <code>speechSynthesis</code>. Opera, Chrome and Edge normally do — try
          updating the browser or enabling system speech voices.
        </p>
      )}

      {capabilities.supported && voices.length === 0 && (
        <p className="tts-hint">
          Voices are still loading. Opera sometimes exposes them only after the page settles — press
          <strong> Refresh voices</strong>. On Windows, add one in Settings → Time &amp; language → Speech.
        </p>
      )}

      <details className="tts-diagnostics">
        <summary>Audio Diagnostics</summary>
        <dl className="tts-diag-grid">
          <div><dt>Browser</dt><dd>{tts.browser}</dd></div>
          <div><dt>Engine</dt><dd>Browser SpeechSynthesis (local)</dd></div>
          <div><dt>Voices</dt><dd>{voices.length} total · {localCount} local · {networkCount} network</dd></div>
          <div>
            <dt>Selected</dt>
            <dd>
              {tts.selectedVoice
                ? `${tts.selectedVoice.name} · ${tts.selectedVoice.lang}`
                : 'System default'}
            </dd>
          </div>
          <div><dt>State</dt><dd>{STATUS_LABEL[state.status]}</dd></div>
          <div><dt>Active voice</dt><dd>{state.activeVoice ?? '—'}</dd></div>
          <div><dt>Chunks</dt><dd>{state.chunkCount || plannedChunks || 0}</dd></div>
          <div><dt>Pause / Resume</dt><dd>{capabilities.pause ? 'supported' : 'not supported'}</dd></div>
          <div><dt>voiceschanged</dt><dd>{capabilities.voicesChanged ? 'supported' : 'not supported'}</dd></div>
          <div><dt>Cloud TTS</dt><dd>Not configured — local voices only</dd></div>
        </dl>
        {state.error && <p className="tts-diag-error"><strong>Last error:</strong> {state.error}</p>}
        <p className="tts-diag-hint">{tts.hint}</p>
        <button type="button" className="tts-diag-refresh" onClick={() => tts.refreshVoices()}>
          Refresh voices
        </button>
        <p className="tts-diag-ua"><code>{typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent}</code></p>
      </details>
    </section>
  );
}
