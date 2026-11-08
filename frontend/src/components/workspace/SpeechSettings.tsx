import { useMemo } from 'react';
import { useSpeechPlayback } from '../../hooks/useSpeechPlayback';
import { browserLanguage, languageLabel, type TtsStatus, type VoiceOption } from '../../utils/tts';
import { PlayIcon, StopIcon } from '../Icons';
import { Pill } from '../ui';
import '../../styles/tts.css';

const STATUS_LABEL: Record<TtsStatus, string> = {
  unsupported: 'Unsupported',
  loading: 'Loading',
  ready: 'Ready',
  speaking: 'Speaking',
  paused: 'Paused',
  completed: 'Completed',
  error: 'Error',
};

function statusTone(status: TtsStatus): 'ok' | 'warn' | 'danger' | 'muted' | 'info' {
  if (status === 'speaking') return 'info';
  if (status === 'error') return 'danger';
  if (status === 'unsupported') return 'warn';
  if (status === 'paused' || status === 'loading') return 'warn';
  return 'ok';
}

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

export type SpeechController = ReturnType<typeof useSpeechPlayback>;

export function SpeechSettingsPanel({
  tts,
  sampleText,
  compact = false,
}: {
  tts: SpeechController;
  sampleText: string;
  compact?: boolean;
}) {
  const { state, capabilities, settings, voices } = tts;
  const grouped = useMemo(() => groupVoices(voices), [voices]);
  const localCount = voices.filter(voice => voice.localService).length;
  const isSpeaking = state.status === 'speaking';
  const isPaused = state.status === 'paused';

  return (
    <section className={`speech-panel ${compact ? 'compact' : ''}`} aria-labelledby="speech-heading">
      <div className="speech-head">
        <div>
          <h3 id="speech-heading">Voice &amp; speech</h3>
          <p>Browser speech synthesis. Audio is generated locally and never sent to a cloud TTS provider.</p>
        </div>
        <Pill tone={statusTone(state.status)}><span className="status-dot" />{STATUS_LABEL[state.status]}</Pill>
      </div>

      <div className="speech-meta">
        <span className="speech-badge">Browser · local</span>
        <span>{voices.length === 0 ? 'No voices detected' : `${voices.length} voices · ${localCount} local`}</span>
        {state.chunkCount > 1 ? <span>Part {Math.min(state.chunkIndex + 1, state.chunkCount)} of {state.chunkCount}</span> : null}
      </div>

      <label className="field">
        <span className="field-label">Voice</span>
        <select
          className="input"
          value={tts.effectiveVoiceURI}
          onChange={event => {
            const nextURI = event.target.value;
            const nextVoice = voices.find(voice => voice.voiceURI === nextURI);
            tts.updateSettings({
              voiceURI: nextURI,
              lang: nextVoice?.lang ?? browserLanguage(),
            });
          }}
        >
          <option value="">System default</option>
          {grouped.map(group => (
            <optgroup key={group.lang} label={group.label}>
              {group.voices.map(voice => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name}{voice.localService ? '' : ' (network)'}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="speech-sliders">
        <label className="speech-slider">
          <span>Speed <output>{settings.rate.toFixed(2)}×</output></span>
          <input type="range" min="0.5" max="2" step="0.05" value={settings.rate} onChange={event => tts.updateSettings({ rate: Number(event.target.value) })} />
        </label>
        <label className="speech-slider">
          <span>Pitch <output>{settings.pitch.toFixed(2)}</output></span>
          <input type="range" min="0" max="2" step="0.05" value={settings.pitch} onChange={event => tts.updateSettings({ pitch: Number(event.target.value) })} />
        </label>
        <label className="speech-slider">
          <span>Volume <output>{Math.round(settings.volume * 100)}%</output></span>
          <input type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={event => tts.updateSettings({ volume: Number(event.target.value) })} />
        </label>
      </div>

      <div className="speech-actions">
        <button
          type="button"
          className="button button-dark button-small"
          onClick={() => tts.play(sampleText)}
          disabled={!capabilities.supported || !sampleText.trim()}
        >
          <PlayIcon size={14} />
          Play sample
        </button>
        {capabilities.pause ? (
          <button
            type="button"
            className="button button-quiet button-small"
            onClick={() => (isPaused ? tts.resume() : tts.pause())}
            disabled={!isSpeaking && !isPaused}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        ) : null}
        <button type="button" className="button button-quiet button-small" onClick={tts.stop} disabled={!isSpeaking && !isPaused && state.status !== 'loading'}>
          <StopIcon size={13} />
          Stop
        </button>
        <button type="button" className="button button-quiet button-small" onClick={tts.refreshVoices}>
          Refresh voices
        </button>
      </div>

      {state.notice ? <p className="speech-notice" role="status">{state.notice}</p> : null}
      {state.error ? <p className="speech-error" role="alert">{state.error}</p> : null}
      {!capabilities.supported ? (
        <p className="speech-notice">
          This browser does not expose <code>speechSynthesis</code>. Text chat still works; try a current
          Chrome, Edge or Safari build.
        </p>
      ) : null}
      {capabilities.supported && voices.length === 0 ? (
        <p className="speech-notice">
          Voices load asynchronously. Press <strong>Refresh voices</strong>. On Windows, add one in
          Settings → Time &amp; language → Speech.
        </p>
      ) : null}

      <details className="speech-diagnostics">
        <summary>Audio diagnostics</summary>
        <dl>
          <div><dt>Browser</dt><dd>{tts.browser}</dd></div>
          <div><dt>Engine</dt><dd>Browser SpeechSynthesis (local)</dd></div>
          <div><dt>Voices</dt><dd>{voices.length} total · {localCount} local</dd></div>
          <div><dt>Selected</dt><dd>{tts.selectedVoice ? `${tts.selectedVoice.name} · ${tts.selectedVoice.lang}` : 'System default'}</dd></div>
          <div><dt>State</dt><dd>{STATUS_LABEL[state.status]}</dd></div>
          <div><dt>Chunks</dt><dd>{state.chunkCount || 0}</dd></div>
          <div><dt>Pause / resume</dt><dd>{capabilities.pause ? 'supported' : 'not supported'}</dd></div>
          <div><dt>Cloud TTS</dt><dd>Not configured — local voices only</dd></div>
        </dl>
        {state.error ? <p><strong>Last error:</strong> {state.error}</p> : null}
        <p className="speech-hint">{tts.hint}</p>
        <p className="speech-ua"><code>{typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent}</code></p>
      </details>
    </section>
  );
}
