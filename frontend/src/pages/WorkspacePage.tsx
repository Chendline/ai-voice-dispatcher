import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { navigate, pathForSection, sectionFromPath, usePathname, type WorkspaceSection } from '../lib/router';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import type { Conversation, ConversationMessage } from '../types';
import { ChatPanel } from '../components/workspace/ChatPanel';
import { VoicePanel } from '../components/workspace/VoicePanel';
import { DispatchPanel } from '../components/workspace/DispatchPanel';
import { AgentsPanel } from '../components/workspace/AgentsPanel';
import { SettingsPanel } from '../components/workspace/SettingsPanel';
import {
  AgentsIcon,
  ArrowUpRight,
  ChatIcon,
  DispatchIcon,
  LogoMark,
  RefreshIcon,
  SettingsIcon,
  VoiceIcon,
} from '../components/Icons';
import { Pill, Spinner } from '../components/ui';
import { playTap } from '../utils/soundEffects';
import '../styles/workspace.css';

const AGENT_KEY = 'aegis.selected-agent';

const SECTIONS: { id: WorkspaceSection; label: string; icon: ReactNode }[] = [
  { id: 'chat', label: 'Chat', icon: <ChatIcon size={18} /> },
  { id: 'voice', label: 'Voice', icon: <VoiceIcon size={18} /> },
  { id: 'dispatch', label: 'Dispatch', icon: <DispatchIcon size={18} /> },
  { id: 'agents', label: 'Agents', icon: <AgentsIcon size={18} /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} /> },
];

const SECTION_COPY: Record<WorkspaceSection, { title: string; copy: string }> = {
  chat: { title: 'Chat', copy: 'Text conversations with your configured agent.' },
  voice: { title: 'Voice', copy: 'Speak with the agent and hear the reply.' },
  dispatch: { title: 'Dispatch', copy: 'Plan, review, and send an approved dispatch.' },
  agents: { title: 'Agents', copy: 'Create the instructions, model, voice and targets for each agent.' },
  settings: { title: 'Settings', copy: 'Providers, dispatch targets, speech and deployment status.' },
};

function readAgentId(): string {
  try {
    return window.localStorage.getItem(AGENT_KEY) ?? '';
  } catch {
    return '';
  }
}

export function WorkspacePage() {
  const path = usePathname();
  const section = sectionFromPath(path);
  const { data, status, error, refreshing, reload } = useWorkspaceData();
  const [agentId, setAgentId] = useState(readAgentId);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const agent = data?.agents.find(item => item.id === agentId) ?? data?.agents[0];
  const provider = data?.config.providers.find(item => item.id === agent?.providerId);

  useEffect(() => {
    document.title = `AEGIS · ${SECTION_COPY[section].title}`;
  }, [section]);

  useEffect(() => {
    if (!agent) return;
    try {
      window.localStorage.setItem(AGENT_KEY, agent.id);
    } catch {
      // Storage can be unavailable in private mode.
    }
  }, [agent]);

  const changeAgent = (nextAgentId: string) => {
    if (nextAgentId === agentId) return;
    setAgentId(nextAgentId);
    setConversation(null);
    setSendError(null);
    playTap();
  };

  const openConversation = async (conversationId: string) => {
    setConversationLoading(true);
    setSendError(null);
    try {
      const next = await api.getConversation(conversationId);
      setConversation(next);
      if (next.agentId !== agentId) setAgentId(next.agentId);
    } catch (loadError) {
      setSendError(loadError instanceof Error ? loadError.message : 'The conversation could not be loaded.');
    } finally {
      setConversationLoading(false);
    }
  };

  const newConversation = () => {
    setConversation(null);
    setSendError(null);
    playTap();
  };

  const conversationId = conversation?.id;
  const sendMessage = useCallback(
    async (message: string): Promise<ConversationMessage | null> => {
      if (!agent) {
        setSendError('Create an agent before sending a message.');
        return null;
      }
      if (!message.trim() || sending) return null;

      setSending(true);
      setSendError(null);
      try {
        const result = await api.chat({
          agentId: agent.id,
          conversationId,
          message: message.trim(),
        });
        setConversation(result.conversation);
        await reload();
        return result.reply;
      } catch (chatError) {
        setSendError(chatError instanceof Error ? chatError.message : 'The agent could not reply.');
        return null;
      } finally {
        setSending(false);
      }
    },
    [agent, conversationId, reload, sending],
  );

  if (status === 'loading') {
    return (
      <div className="app-gate">
        <div className="gate-brand"><LogoMark size={24} /><span>AEGIS</span></div>
        <Spinner label="Opening workspace" />
      </div>
    );
  }

  if (status === 'error' || !data) {
    return (
      <div className="app-gate">
        <div className="gate-card">
          <div className="gate-brand"><LogoMark size={24} /><span>AEGIS</span></div>
          <h1>The workspace API is offline.</h1>
          <p>{error ?? 'AEGIS could not reach its API.'}</p>
          <div className="gate-actions">
            <button type="button" className="button button-dark" onClick={() => void reload()}>
              <RefreshIcon size={16} />
              Retry connection
            </button>
            <button type="button" className="button button-quiet" onClick={() => navigate('/')}>
              Back to website
            </button>
          </div>
          <div className="gate-hint">
            <code>{api.baseUrl}</code>
            <span>Start the backend with <code>cd backend &amp;&amp; npm run dev</code>, or set <code>VITE_API_BASE_URL</code>.</span>
          </div>
        </div>
      </div>
    );
  }

  const configuredProviders = data.config.providers.filter(item => item.configured).length;
  const copy = SECTION_COPY[section];

  return (
    <div className="workspace">
      <aside className="ws-sidebar">
        <a
          className="ws-brand"
          href="/"
          onClick={event => {
            event.preventDefault();
            navigate('/');
          }}
        >
          <span className="brand-mark"><LogoMark size={20} /></span>
          <span>AEGIS</span>
        </a>

        <nav className="ws-nav" aria-label="Workspace">
          {SECTIONS.map(item => {
            const active = item.id === section;
            return (
              <button
                key={item.id}
                type="button"
                className={`ws-nav-item ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  if (active) return;
                  playTap();
                  navigate(pathForSection(item.id));
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="ws-sidebar-foot">
          <div className="ws-health">
            <span className={`status-dot ${refreshing ? 'pending' : 'ok'}`} />
            <div>
              <strong>API connected</strong>
              <span>{data.storage === 'blob' ? 'Durable storage' : 'Memory storage'}</span>
            </div>
          </div>
          <div className="ws-health">
            <span className={`status-dot ${configuredProviders > 0 ? 'ok' : 'warn'}`} />
            <div>
              <strong>{configuredProviders > 0 ? 'AI provider ready' : 'No provider key'}</strong>
              <span>{configuredProviders} of {data.config.providers.length} configured</span>
            </div>
          </div>
          <a className="ws-site-link" href="/" onClick={event => { event.preventDefault(); navigate('/'); }}>
            Back to website <ArrowUpRight size={13} />
          </a>
        </div>
      </aside>

      <div className="ws-main">
        <header className="ws-topbar">
          <div className="ws-title">
            <div className="ws-breadcrumb">Workspace / {copy.title}</div>
            <div className="ws-title-row">
              <h1>{copy.title}</h1>
              <span className="ws-subtitle">{copy.copy}</span>
            </div>
          </div>

          <div className="ws-topbar-actions">
            {(section === 'chat' || section === 'voice' || section === 'dispatch') && agent ? (
              <label className="agent-switcher">
                <span>Agent</span>
                <select value={agent.id} onChange={event => changeAgent(event.target.value)}>
                  {data.agents.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {provider && !provider.configured ? (
              <Pill tone="warn">Provider key missing</Pill>
            ) : (
              <Pill tone="ok"><span className="status-dot ok" /> Ready</Pill>
            )}
            <button
              type="button"
              className="icon-button"
              aria-label="Refresh workspace"
              title="Refresh workspace"
              onClick={() => void reload()}
            >
              <RefreshIcon size={17} className={refreshing ? 'spin' : undefined} />
            </button>
          </div>
        </header>

        <main className="ws-content">
          {section === 'chat' ? (
            <ChatPanel
              data={data}
              agent={agent}
              conversation={conversation}
              conversationLoading={conversationLoading}
              sending={sending}
              error={sendError}
              onSelectConversation={id => void openConversation(id)}
              onNewConversation={newConversation}
              onSend={sendMessage}
              onRefresh={() => void reload()}
            />
          ) : null}

          {section === 'voice' ? (
            <VoicePanel
              agent={agent}
              provider={provider}
              conversation={conversation}
              sending={sending}
              error={sendError}
              onSend={sendMessage}
              onNewConversation={newConversation}
            />
          ) : null}

          {section === 'dispatch' ? (
            <DispatchPanel
              data={data}
              agent={agent}
              onChanged={() => void reload()}
            />
          ) : null}

          {section === 'agents' ? (
            <AgentsPanel
              data={data}
              selectedAgentId={agent?.id ?? ''}
              onSelectAgent={changeAgent}
              onChanged={() => void reload()}
            />
          ) : null}

          {section === 'settings' ? (
            <SettingsPanel data={data} onChanged={() => void reload()} />
          ) : null}
        </main>
      </div>
    </div>
  );
}
