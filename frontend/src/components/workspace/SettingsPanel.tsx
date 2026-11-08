import { useState } from 'react';
import type { PublicDispatchTarget, TargetInput, TargetType, WorkspaceBootstrap } from '../../types';
import { api } from '../../lib/api';
import { useSpeechPlayback } from '../../hooks/useSpeechPlayback';
import { CheckIcon, PlusIcon, RefreshIcon, SlackIcon, TrashIcon, WebhookIcon } from '../Icons';
import { EmptyState, Notice, Pill, Spinner, formatRelative } from '../ui';
import { SpeechSettingsPanel } from './SpeechSettings';
import { playTap } from '../../utils/soundEffects';

const ENV_KEYS: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  groq: 'GROQ_API_KEY',
  compatible: 'AI_COMPATIBLE_API_KEY',
};

const EMPTY_FORM: TargetInput = { name: '', type: 'webhook', url: '', enabled: true };

function targetTone(target: PublicDispatchTarget): 'ok' | 'warn' | 'danger' | 'muted' {
  if (!target.enabled) return 'muted';
  if (target.lastStatus === 'failed') return 'danger';
  if (target.lastStatus === 'success') return 'ok';
  return 'warn';
}

function targetStatus(target: PublicDispatchTarget): string {
  if (!target.enabled) return 'paused';
  if (target.lastStatus === 'success') return 'last test passed';
  if (target.lastStatus === 'failed') return 'last test failed';
  return 'not tested';
}

export function SettingsPanel({
  data,
  onChanged,
}: {
  data: WorkspaceBootstrap;
  onChanged: () => void;
}) {
  const [form, setForm] = useState<TargetInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const tts = useSpeechPlayback();

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const startEdit = (target: PublicDispatchTarget) => {
    playTap();
    setEditingId(target.id);
    setForm({ name: target.name, type: target.type, url: '', enabled: target.enabled });
    setError(null);
    setNotice(null);
  };

  const saveTarget = async () => {
    if (!form.name.trim() || saving) return;
    if (!editingId && !form.url.trim()) {
      setError('A target needs a URL before it can be saved.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (editingId) {
        await api.updateTarget(editingId, { ...form, name: form.name.trim() });
        setNotice('Target updated. The stored URL is unchanged unless you entered a new one.');
      } else {
        await api.createTarget({ ...form, name: form.name.trim(), url: form.url.trim() });
        setNotice('Target saved. The URL is write-only and is not returned to the browser.');
      }
      resetForm();
      onChanged();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The target could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const toggleTarget = async (target: PublicDispatchTarget) => {
    playTap();
    setBusyId(target.id);
    setError(null);
    try {
      await api.updateTarget(target.id, {
        name: target.name,
        type: target.type,
        url: '',
        enabled: !target.enabled,
      });
      onChanged();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'The target could not be updated.');
    } finally {
      setBusyId(null);
    }
  };

  const testTarget = async (target: PublicDispatchTarget) => {
    setBusyId(target.id);
    setError(null);
    setNotice(null);
    try {
      const response = await api.testTarget(target.id);
      if (response.result.status === 'success') {
        setNotice(`${target.name} accepted the test event${response.result.httpStatus ? ` (HTTP ${response.result.httpStatus})` : ''}.`);
      } else {
        setError(`${target.name} rejected the test event: ${response.result.detail ?? 'no response'}.`);
      }
      onChanged();
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : 'The test request failed.');
    } finally {
      setBusyId(null);
    }
  };

  const removeTarget = async (target: PublicDispatchTarget) => {
    if (!window.confirm(`Delete “${target.name}”? Agents using it will lose the default target.`)) return;
    setBusyId(target.id);
    setError(null);
    try {
      await api.deleteTarget(target.id);
      if (editingId === target.id) resetForm();
      onChanged();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'The target could not be deleted.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="settings-layout">
      <div className="settings-main">
        <section className="settings-card">
          <div className="settings-card-head">
            <div>
              <h2>AI providers</h2>
              <p>
                Keys are read from the backend environment and never sent to the browser. Add or rotate a
                key, then restart the API.
              </p>
            </div>
            <Pill tone={data.config.providers.some(item => item.configured) ? 'ok' : 'warn'}>
              {data.config.providers.filter(item => item.configured).length} configured
            </Pill>
          </div>

          <div className="provider-grid">
            {data.config.providers.map(provider => (
              <article key={provider.id} className={`provider-card ${provider.configured ? 'ready' : ''}`}>
                <div className="provider-card-head">
                  <strong>{provider.label}</strong>
                  <Pill tone={provider.configured ? 'ok' : 'warn'}>
                    {provider.configured ? 'key present' : 'no key'}
                  </Pill>
                </div>
                <dl>
                  <div><dt>Default model</dt><dd>{provider.defaultModel}</dd></div>
                  <div><dt>Known models</dt><dd>{provider.models.length}</dd></div>
                  <div><dt>Environment</dt><dd><code>{ENV_KEYS[provider.id] ?? 'AI_COMPATIBLE_API_KEY'}</code></dd></div>
                </dl>
                {provider.compatible ? (
                  <p className="provider-note">Custom OpenAI-compatible endpoint from <code>AI_COMPATIBLE_BASE_URL</code>.</p>
                ) : null}
              </article>
            ))}
          </div>

          <Notice tone="info" title="Provider selection order">
            The default provider is the first configured adapter, unless <code>AI_DEFAULT_PROVIDER</code> and{' '}
            <code>AI_DEFAULT_MODEL</code> are set. Each agent stores its own provider and model.
          </Notice>
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <div>
              <h2>Dispatch targets</h2>
              <p>
                Only HTTPS webhooks and Slack incoming webhooks are supported. Saved URLs are write-only;
                AEGIS returns the host so you can identify a target without exposing its secret path.
              </p>
            </div>
            <Pill tone={data.targets.length > 0 ? 'ok' : 'warn'}>{data.targets.length} targets</Pill>
          </div>

          {error ? <Notice tone="danger" title="Target error">{error}</Notice> : null}
          {notice ? <Notice tone="success" title="Target update">{notice}</Notice> : null}

          {data.targets.length === 0 ? (
            <EmptyState icon={<WebhookIcon size={22} />} title="No dispatch targets yet.">
              Add a webhook or Slack incoming webhook below. Without a target, dispatches are recorded as
              skipped.
            </EmptyState>
          ) : (
            <div className="target-table">
              {data.targets.map(target => (
                <article key={target.id} className={`target-row ${target.enabled ? '' : 'paused'}`}>
                  <span className="target-row-icon">
                    {target.type === 'slack' ? <SlackIcon size={17} /> : <WebhookIcon size={17} />}
                  </span>
                  <div className="target-row-copy">
                    <strong>{target.name}</strong>
                    <em>{target.type} · {target.host}</em>
                    <span className="target-row-meta">
                      {target.lastTestedAt ? `Tested ${formatRelative(target.lastTestedAt)}` : 'Never tested'}
                    </span>
                  </div>
                  <Pill tone={targetTone(target)}>{targetStatus(target)}</Pill>
                  <div className="target-row-actions">
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => void testTarget(target)}
                      disabled={busyId === target.id || !target.enabled}
                    >
                      {busyId === target.id ? 'Testing…' : 'Send test'}
                    </button>
                    <button type="button" className="button button-quiet button-small" onClick={() => startEdit(target)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="button button-quiet button-small"
                      onClick={() => void toggleTarget(target)}
                      disabled={busyId === target.id}
                    >
                      {target.enabled ? 'Pause' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      className="icon-button small danger"
                      aria-label={`Delete ${target.name}`}
                      title="Delete target"
                      onClick={() => void removeTarget(target)}
                      disabled={busyId === target.id}
                    >
                      {busyId === target.id ? <Spinner /> : <TrashIcon size={14} />}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="target-form">
            <div className="section-mini-head">
              <div>
                <h3>{editingId ? 'Edit target' : 'Add a target'}</h3>
                <p>{editingId ? 'Leave the URL empty to keep the stored destination.' : 'The URL is validated for HTTPS and private-network access before saving.'}</p>
              </div>
              {editingId ? (
                <button type="button" className="text-link" onClick={resetForm}>Cancel edit</button>
              ) : null}
            </div>

            <div className="field-grid">
              <label className="field">
                <span className="field-label">Name</span>
                <input
                  className="input"
                  value={form.name}
                  maxLength={80}
                  placeholder="Ops webhook"
                  onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label className="field">
                <span className="field-label">Type</span>
                <select
                  className="input"
                  value={form.type}
                  onChange={event => setForm(current => ({ ...current, type: event.target.value as TargetType }))}
                >
                  <option value="webhook">Webhook (JSON POST)</option>
                  <option value="slack">Slack incoming webhook</option>
                </select>
              </label>
            </div>

            <label className="field">
              <span className="field-label">URL {editingId ? '(optional)' : ''}</span>
              <input
                className="input"
                type="url"
                value={form.url}
                maxLength={2000}
                placeholder={form.type === 'slack' ? 'https://hooks.slack.com/services/…' : 'https://ops.example.com/hooks/aegis'}
                onChange={event => setForm(current => ({ ...current, url: event.target.value }))}
              />
              <span className="field-hint">Stored server-side. Redirects are not followed.</span>
            </label>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={event => setForm(current => ({ ...current, enabled: event.target.checked }))}
              />
              <span>
                <strong>Enabled</strong>
                <em>Paused targets are ignored by dispatch planning and execution.</em>
              </span>
            </label>

            <div className="editor-actions">
              <button
                type="button"
                className="button button-dark"
                onClick={() => void saveTarget()}
                disabled={saving || !form.name.trim() || (!editingId && !form.url.trim())}
              >
                {saving ? <Spinner /> : editingId ? <CheckIcon size={16} /> : <PlusIcon size={16} />}
                {editingId ? 'Save target' : 'Add target'}
              </button>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-head">
            <div>
              <h2>Speech</h2>
              <p>Browser speech synthesis is local. AEGIS does not claim a cloud TTS provider.</p>
            </div>
            <button type="button" className="button button-quiet button-small" onClick={tts.refreshVoices}>
              <RefreshIcon size={14} />
              Refresh voices
            </button>
          </div>
          <SpeechSettingsPanel
            tts={tts}
            sampleText="Hello, I am AEGIS. Dispatch targets are reviewed before anything is sent."
          />
        </section>
      </div>

      <aside className="settings-side">
        <section className="settings-card compact">
          <h3>Runtime</h3>
          <dl className="runtime-list">
            <div><dt>API base</dt><dd><code>{api.baseUrl}</code></dd></div>
            <div><dt>Storage</dt><dd>{data.storage === 'blob' ? 'Vercel Blob (durable)' : 'Memory (resets on restart)'}</dd></div>
            <div><dt>Default provider</dt><dd>{data.config.defaultProvider ?? 'none'}</dd></div>
            <div><dt>Default model</dt><dd>{data.config.defaultModel ?? 'none'}</dd></div>
            <div><dt>AI timeout</dt><dd>{Math.round(data.config.aiTimeoutMs / 1000)}s</dd></div>
            <div><dt>Dispatch timeout</dt><dd>{Math.round(data.config.dispatchTimeoutMs / 1000)}s</dd></div>
            <div><dt>Agents</dt><dd>{data.agents.length}</dd></div>
            <div><dt>Conversations</dt><dd>{data.conversations.length}</dd></div>
            <div><dt>Dispatch logs</dt><dd>{data.logs.length}</dd></div>
          </dl>
        </section>

        <section className="settings-card compact">
          <h3>Security model</h3>
          <ul className="settings-list">
            <li>Provider keys never leave the server.</li>
            <li>Dispatch URLs are write-only from the browser.</li>
            <li>Private-network destinations are rejected.</li>
            <li>Request bodies are validated and size-capped.</li>
            <li>Errors are sanitized; no stack traces are returned.</li>
          </ul>
        </section>

        <section className="settings-card compact">
          <h3>Durable state</h3>
          <p className="settings-copy">
            Set <code>BLOB_READ_WRITE_TOKEN</code> to persist agents, targets, conversations and dispatch
            logs across restarts. <code>AEGIS_STATE_ID</code> names the stored workspace.
          </p>
          <Pill tone={data.storage === 'blob' ? 'ok' : 'warn'}>
            {data.storage === 'blob' ? 'Durable' : 'Memory only'}
          </Pill>
        </section>
      </aside>
    </div>
  );
}
