import { useEffect, useState } from 'react';
import type { Agent, AgentInput, WorkspaceBootstrap } from '../../types';
import { api } from '../../lib/api';
import { AgentsIcon, PlusIcon, TrashIcon } from '../Icons';
import { Notice, Pill, Spinner } from '../ui';
import { playTap } from '../../utils/soundEffects';

function toInput(agent: Agent): AgentInput {
  return {
    name: agent.name,
    description: agent.description,
    providerId: agent.providerId,
    modelId: agent.modelId,
    systemPrompt: agent.systemPrompt,
    temperature: agent.temperature,
    maxTokens: agent.maxTokens,
    voiceRate: agent.voiceRate,
    voicePitch: agent.voicePitch,
    targetIds: agent.targetIds,
  };
}

export function AgentsPanel({
  data,
  selectedAgentId,
  onSelectAgent,
  onChanged,
}: {
  data: WorkspaceBootstrap;
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
  onChanged: () => void;
}) {
  const selected = data.agents.find(agent => agent.id === selectedAgentId) ?? data.agents[0];
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<AgentInput>(() => toInput(selected));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isNew) return;
    setForm(toInput(selected));
    setError(null);
    setSaved(false);
  }, [selected.id, selected.updatedAt, isNew]);

  const provider = data.config.providers.find(item => item.id === form.providerId);
  const models = provider?.models ?? [];

  const update = <K extends keyof AgentInput>(key: K, value: AgentInput[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const startNew = () => {
    playTap();
    const configured = data.config.providers.find(item => item.configured) ?? data.config.providers[0];
    setIsNew(true);
    setError(null);
    setSaved(false);
    setForm({
      name: 'New agent',
      description: '',
      providerId: configured?.id ?? 'anthropic',
      modelId: configured?.defaultModel ?? 'claude-sonnet-4-5',
      systemPrompt:
        'You are an AEGIS operations agent. Be concise, accurate and explicit about what you can and cannot do. Never claim an external action ran unless a dispatch result is present.',
      temperature: 0.6,
      maxTokens: 900,
      voiceRate: 1,
      voicePitch: 1,
      targetIds: [],
    });
  };

  const save = async () => {
    if (!form.name.trim() || !form.modelId.trim() || !form.systemPrompt.trim() || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      if (isNew) {
        const created = await api.createAgent(form);
        setIsNew(false);
        onSelectAgent(created.id);
        setSaved(true);
      } else if (selected) {
        await api.updateAgent(selected.id, form);
        setSaved(true);
      }
      onChanged();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The agent could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected || deleting) return;
    if (!window.confirm(`Delete “${selected.name}”? Conversations keep their existing messages.`)) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteAgent(selected.id);
      const next = data.agents.find(agent => agent.id !== selected.id);
      if (next) onSelectAgent(next.id);
      onChanged();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'The agent could not be deleted.');
    } finally {
      setDeleting(false);
    }
  };

  const toggleTarget = (targetId: string) => {
    playTap();
    update(
      'targetIds',
      form.targetIds.includes(targetId)
        ? form.targetIds.filter(id => id !== targetId)
        : [...form.targetIds, targetId],
    );
  };

  return (
    <div className="agents-layout">
      <aside className="agent-list" aria-label="Agents">
        <div className="rail-head">
          <span>Agents</span>
          <button type="button" className="icon-button small" onClick={startNew} title="New agent" aria-label="New agent">
            <PlusIcon size={16} />
          </button>
        </div>
        <ul>
          {data.agents.map(agent => {
            const agentProvider = data.config.providers.find(item => item.id === agent.providerId);
            return (
              <li key={agent.id}>
                <button
                  type="button"
                  className={`agent-list-item ${!isNew && agent.id === selected?.id ? 'active' : ''}`}
                  onClick={() => {
                    playTap();
                    setIsNew(false);
                    onSelectAgent(agent.id);
                  }}
                >
                  <span className="agent-avatar">{agent.name.slice(0, 1).toUpperCase()}</span>
                  <span className="agent-list-copy">
                    <strong>{agent.name}</strong>
                    <em>{agent.modelId}</em>
                  </span>
                  <span className={`agent-dot ${agentProvider?.configured ? 'ok' : 'warn'}`} />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="rail-note">The dot shows whether the agent's provider has a server-side key.</p>
      </aside>

      <section className="agent-editor">
        <div className="workbench-head">
          <div>
            <div className="eyebrow muted">{isNew ? 'New agent' : 'Agent configuration'}</div>
            <h2>{isNew ? 'Define a new operator.' : selected?.name}</h2>
            <p>Model, instructions, voice and dispatch targets are all scoped to this agent.</p>
          </div>
          {!isNew && selected ? (
            <button type="button" className="button button-danger button-small" onClick={() => void remove()} disabled={deleting || data.agents.length <= 1}>
              {deleting ? <Spinner /> : <TrashIcon size={15} />}
              Delete
            </button>
          ) : null}
        </div>

        {error ? <Notice tone="danger" title="Agent error">{error}</Notice> : null}
        {saved ? <Notice tone="success" title="Agent saved">Changes are active for the next conversation turn.</Notice> : null}
        {provider && !provider.configured ? (
          <Notice tone="warn" title={`${provider.label} is not configured`}>
            You can save this agent, but chat and voice replies will return a clear configuration error until
            a key is added on the server.
          </Notice>
        ) : null}

        <div className="field-grid">
          <label className="field">
            <span className="field-label">Name</span>
            <input className="input" value={form.name} maxLength={80} onChange={event => update('name', event.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Description</span>
            <input className="input" value={form.description} maxLength={400} placeholder="What this agent handles" onChange={event => update('description', event.target.value)} />
          </label>
        </div>

        <div className="field-grid">
          <label className="field">
            <span className="field-label">Provider</span>
            <select
              className="input"
              value={form.providerId}
              onChange={event => {
                const next = data.config.providers.find(item => item.id === event.target.value);
                update('providerId', event.target.value);
                if (next) update('modelId', next.defaultModel);
              }}
            >
              {data.config.providers.map(item => (
                <option key={item.id} value={item.id}>
                  {item.label}{item.configured ? '' : ' — no key'}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Model</span>
            <input
              className="input"
              list="agent-model-options"
              value={form.modelId}
              maxLength={120}
              onChange={event => update('modelId', event.target.value)}
            />
            <datalist id="agent-model-options">
              {models.map(model => <option key={model} value={model} />)}
            </datalist>
            <span className="field-hint">Any model id the provider accepts can be entered.</span>
          </label>
        </div>

        <label className="field">
          <span className="field-label">System prompt</span>
          <textarea
            className="input"
            rows={7}
            value={form.systemPrompt}
            maxLength={8000}
            onChange={event => update('systemPrompt', event.target.value)}
          />
          <span className="field-hint">{form.systemPrompt.length} / 8000 characters</span>
        </label>

        <div className="field-grid thirds">
          <label className="field">
            <span className="field-label">Temperature <output>{form.temperature.toFixed(2)}</output></span>
            <input type="range" min="0" max="2" step="0.05" value={form.temperature} onChange={event => update('temperature', Number(event.target.value))} />
          </label>
          <label className="field">
            <span className="field-label">Max tokens</span>
            <input className="input" type="number" min={64} max={4096} step={32} value={form.maxTokens} onChange={event => update('maxTokens', Number(event.target.value))} />
          </label>
          <label className="field">
            <span className="field-label">Voice speed <output>{form.voiceRate.toFixed(2)}×</output></span>
            <input type="range" min="0.5" max="2" step="0.05" value={form.voiceRate} onChange={event => update('voiceRate', Number(event.target.value))} />
          </label>
          <label className="field">
            <span className="field-label">Voice pitch <output>{form.voicePitch.toFixed(2)}</output></span>
            <input type="range" min="0" max="2" step="0.05" value={form.voicePitch} onChange={event => update('voicePitch', Number(event.target.value))} />
          </label>
        </div>

        <div className="agent-targets">
          <div className="section-mini-head">
            <div>
              <h3>Default dispatch targets</h3>
              <p>Used as a suggestion when this agent creates a plan. You still approve targets before execution.</p>
            </div>
          </div>
          {data.targets.length === 0 ? (
            <p className="muted-copy">No targets configured yet. Add one in Settings.</p>
          ) : (
            <div className="target-options compact">
              {data.targets.map(target => (
                <label key={target.id} className="target-option">
                  <input
                    type="checkbox"
                    checked={form.targetIds.includes(target.id)}
                    onChange={() => toggleTarget(target.id)}
                  />
                  <span className="target-option-copy">
                    <strong>{target.name}</strong>
                    <em>{target.type} · {target.host}{target.enabled ? '' : ' · paused'}</em>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="editor-actions">
          <button type="button" className="button button-dark" onClick={() => void save()} disabled={saving || !form.name.trim() || !form.modelId.trim() || !form.systemPrompt.trim()}>
            {saving ? <Spinner /> : <AgentsIcon size={16} />}
            {isNew ? 'Create agent' : 'Save changes'}
          </button>
          {!isNew ? <Pill tone="muted">{form.targetIds.length} target{form.targetIds.length === 1 ? '' : 's'}</Pill> : null}
        </div>
      </section>
    </div>
  );
}
