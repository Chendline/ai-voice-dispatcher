import { useState } from 'react';
import type { Agent, DispatchLog, DispatchPlan, Priority, WorkspaceBootstrap } from '../../types';
import { api } from '../../lib/api';
import { navigate } from '../../lib/router';
import { CheckIcon, ChevronIcon, DispatchIcon, WebhookIcon, SlackIcon } from '../Icons';
import { EmptyState, Notice, Pill, Spinner, formatTime } from '../ui';
import { playDispatchComplete, playDispatchLaunch, playTap, playStepTick } from '../../utils/soundEffects';

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];

function statusTone(status: string): 'ok' | 'warn' | 'danger' | 'muted' | 'info' {
  if (status === 'dispatched') return 'ok';
  if (status === 'partial') return 'warn';
  if (status === 'failed') return 'danger';
  return 'muted';
}

export function DispatchPanel({
  data,
  agent,
  onChanged,
}: {
  data: WorkspaceBootstrap;
  agent?: Agent;
  onChanged: () => void;
}) {
  const [instruction, setInstruction] = useState('');
  const [plan, setPlan] = useState<DispatchPlan | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [planning, setPlanning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DispatchLog | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const enabledTargets = data.targets.filter(target => target.enabled);
  const provider = data.config.providers.find(item => item.id === agent?.providerId);

  const buildPlan = async () => {
    if (!instruction.trim() || planning) return;
    setPlanning(true);
    setError(null);
    setResult(null);
    playDispatchLaunch();
    try {
      const response = await api.planDispatch({ instruction: instruction.trim(), agentId: agent?.id });
      setPlan(response.plan);
      setSelectedIds(
        response.plan.targetIds.filter(targetId => response.targets.some(target => target.id === targetId && target.enabled)),
      );
      playStepTick(2);
    } catch (planError) {
      setError(planError instanceof Error ? planError.message : 'The dispatch plan could not be created.');
    } finally {
      setPlanning(false);
    }
  };

  const execute = async () => {
    if (!plan || executing) return;
    if (selectedIds.length === 0) {
      setError('Select at least one enabled dispatch target.');
      return;
    }
    setExecuting(true);
    setError(null);
    playDispatchLaunch();
    try {
      const response = await api.executeDispatch({
        plan: { ...plan, targetIds: selectedIds },
        agentId: agent?.id,
        targetIds: selectedIds,
      });
      setResult(response.log);
      onChanged();
      if (response.log.status === 'dispatched' || response.log.status === 'partial') playDispatchComplete();
    } catch (executeError) {
      setError(executeError instanceof Error ? executeError.message : 'The dispatch could not be executed.');
    } finally {
      setExecuting(false);
    }
  };

  const toggleTarget = (targetId: string) => {
    playTap();
    setSelectedIds(current =>
      current.includes(targetId) ? current.filter(id => id !== targetId) : [...current, targetId],
    );
  };

  return (
    <div className="dispatch-layout">
      <section className="dispatch-workbench">
        <div className="workbench-head">
          <div>
            <div className="eyebrow muted">Dispatch workbench</div>
            <h2>Plan the action, then approve the targets.</h2>
            <p>Nothing is sent until you execute. Plans can be edited before delivery.</p>
          </div>
          {provider ? <Pill tone={provider.configured ? 'ok' : 'warn'}>{provider.configured ? `Planner: ${provider.label}` : 'Rules planner'}</Pill> : null}
        </div>

        {data.targets.length === 0 ? (
          <Notice
            tone="warn"
            title="No dispatch targets yet"
            action={<button type="button" className="text-link" onClick={() => navigate('/app/settings')}>Configure targets</button>}
          >
            Add an HTTPS webhook or a Slack incoming webhook in Settings. A dispatch with no targets is
            recorded as <strong>skipped</strong>, never as a success.
          </Notice>
        ) : null}

        {error ? <Notice tone="danger" title="Dispatch error">{error}</Notice> : null}

        <div className="dispatch-step">
          <div className="dispatch-step-head">
            <span className="step-index">1</span>
            <div>
              <h3>Instruction</h3>
              <p>Describe the operational action. This text is sent to the planner and is treated as untrusted data.</p>
            </div>
          </div>
          <textarea
            className="input dispatch-instruction"
            rows={4}
            value={instruction}
            onChange={event => setInstruction(event.target.value)}
            placeholder="e.g. Escalate the eu-west database outage to the on-call channel. Include the region, impact and the next action."
          />
          <div className="dispatch-actions">
            <button type="button" className="button button-dark" onClick={() => void buildPlan()} disabled={!instruction.trim() || planning}>
              {planning ? <Spinner /> : <DispatchIcon size={16} />}
              {planning ? 'Planning…' : 'Create plan'}
            </button>
            <span className="hint">A plan does not contact any target.</span>
          </div>
        </div>

        {plan ? (
          <div className="dispatch-step">
            <div className="dispatch-step-head">
              <span className="step-index">2</span>
              <div>
                <h3>Review plan</h3>
                <p>Edit the fields if needed. The instruction itself is preserved in the log.</p>
              </div>
              <Pill tone={plan.source === 'ai' ? 'info' : 'warn'}>{plan.source === 'ai' ? 'AI plan' : 'Rules plan'}</Pill>
            </div>

            {plan.notice ? <Notice tone="warn" title="Planner notice">{plan.notice}</Notice> : null}

            <div className="field-grid">
              <label className="field">
                <span className="field-label">Title</span>
                <input
                  className="input"
                  value={plan.title}
                  maxLength={80}
                  onChange={event => setPlan(current => (current ? { ...current, title: event.target.value } : current))}
                />
              </label>
              <label className="field">
                <span className="field-label">Priority</span>
                <select
                  className="input"
                  value={plan.priority}
                  onChange={event => setPlan(current => (current ? { ...current, priority: event.target.value as Priority } : current))}
                >
                  {PRIORITIES.map(priority => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </label>
            </div>

            <label className="field">
              <span className="field-label">Summary</span>
              <textarea
                className="input"
                rows={3}
                value={plan.summary}
                maxLength={400}
                onChange={event => setPlan(current => (current ? { ...current, summary: event.target.value } : current))}
              />
            </label>

            <div className="target-select">
              <div className="target-select-head">
                <div>
                  <h4>Targets</h4>
                  <p>Only targets approved for this dispatch will receive the event.</p>
                </div>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setSelectedIds(selectedIds.length === enabledTargets.length ? [] : enabledTargets.map(target => target.id))}
                  disabled={enabledTargets.length === 0}
                >
                  {selectedIds.length === enabledTargets.length && enabledTargets.length > 0 ? 'Clear all' : 'Select all'}
                </button>
              </div>

              {data.targets.length === 0 ? (
                <p className="muted-copy">No targets configured.</p>
              ) : (
                <div className="target-options">
                  {data.targets.map(target => (
                    <label key={target.id} className={`target-option ${target.enabled ? '' : 'disabled'}`}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(target.id)}
                        disabled={!target.enabled}
                        onChange={() => toggleTarget(target.id)}
                      />
                      <span className="target-option-icon">
                        {target.type === 'slack' ? <SlackIcon size={16} /> : <WebhookIcon size={16} />}
                      </span>
                      <span className="target-option-copy">
                        <strong>{target.name}</strong>
                        <em>{target.type} · {target.host}</em>
                      </span>
                      {!target.enabled ? <Pill tone="muted">Paused</Pill> : null}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="dispatch-actions">
              <button
                type="button"
                className="button button-accent"
                onClick={() => void execute()}
                disabled={executing || selectedIds.length === 0 || !plan.title.trim() || !plan.summary.trim()}
              >
                {executing ? <Spinner /> : <CheckIcon size={16} />}
                {executing ? 'Executing…' : `Execute dispatch${selectedIds.length ? ` · ${selectedIds.length}` : ''}`}
              </button>
              <span className="hint">Executed server-side. Redirects are disabled.</span>
            </div>
          </div>
        ) : null}

        {result ? (
          <div className="dispatch-result">
            <div className="dispatch-result-head">
              <div>
                <Pill tone={statusTone(result.status)}>{result.status}</Pill>
                <h3>{result.plan.title}</h3>
                <p>{result.message}</p>
              </div>
              <span className="result-time">{formatTime(result.timestamp)}</span>
            </div>
            <div className="result-list">
              {result.results.length === 0 ? (
                <p className="muted-copy">No target was contacted.</p>
              ) : result.results.map(item => (
                <div key={item.targetId} className={`result-row ${item.status}`}>
                  <span className="result-target">
                    {item.type === 'slack' ? <SlackIcon size={15} /> : <WebhookIcon size={15} />}
                    {item.targetName}
                  </span>
                  <span className="result-detail">{item.detail ?? item.host}</span>
                  <span className="result-status">
                    {item.httpStatus ? `HTTP ${item.httpStatus}` : 'No response'} · {item.durationMs} ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <aside className="dispatch-history">
        <div className="history-head">
          <h3>Dispatch history</h3>
          <span>{data.logs.length}</span>
        </div>
        {data.logs.length === 0 ? (
          <EmptyState icon={<DispatchIcon size={22} />} title="No dispatches yet.">
            Completed and failed dispatches both appear here.
          </EmptyState>
        ) : (
          <div className="history-list">
            {data.logs.map(log => {
              const expanded = expandedLog === log.id;
              return (
                <article key={log.id} className={`history-item ${expanded ? 'expanded' : ''}`}>
                  <button
                    type="button"
                    className="history-summary"
                    onClick={() => {
                      playTap();
                      setExpandedLog(expanded ? null : log.id);
                    }}
                    aria-expanded={expanded}
                  >
                    <span className={`history-dot ${log.status}`} />
                    <span className="history-copy">
                      <strong>{log.plan.title}</strong>
                      <em>{formatTime(log.timestamp)} · {log.results.length} target{log.results.length === 1 ? '' : 's'}</em>
                    </span>
                    <Pill tone={statusTone(log.status)}>{log.status}</Pill>
                    <ChevronIcon size={14} className={expanded ? 'rotated' : undefined} />
                  </button>
                  {expanded ? (
                    <div className="history-detail">
                      <p>{log.message}</p>
                      <dl>
                        <div><dt>Priority</dt><dd>{log.plan.priority}</dd></div>
                        <div><dt>Plan source</dt><dd>{log.plan.source}</dd></div>
                        <div><dt>Model</dt><dd>{log.plan.modelId ?? '—'}</dd></div>
                      </dl>
                      {log.results.map(item => (
                        <div key={item.targetId} className={`history-result ${item.status}`}>
                          <span>{item.targetName}</span>
                          <span>{item.httpStatus ? `HTTP ${item.httpStatus}` : item.detail ?? 'No response'} · {item.durationMs} ms</span>
                        </div>
                      ))}
                      <pre className="history-json">{JSON.stringify(log.plan, null, 2)}</pre>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </aside>
    </div>
  );
}
