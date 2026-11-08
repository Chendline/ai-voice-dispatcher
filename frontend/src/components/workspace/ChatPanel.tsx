import { useEffect, useRef, useState } from 'react';
import type { Agent, Conversation, ConversationMessage, WorkspaceBootstrap } from '../../types';
import { api } from '../../lib/api';
import { navigate } from '../../lib/router';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import {
  ChatIcon,
  MicIcon,
  PlusIcon,
  SendIcon,
  SparkIcon,
  TrashIcon,
} from '../Icons';
import { EmptyState, Notice, Pill, Spinner, formatRelative, initials } from '../ui';
import { playTap } from '../../utils/soundEffects';

interface ChatPanelProps {
  data: WorkspaceBootstrap;
  agent?: Agent;
  conversation: Conversation | null;
  conversationLoading: boolean;
  sending: boolean;
  error: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onSend: (message: string) => Promise<ConversationMessage | null>;
  onRefresh: () => void;
}

const SUGGESTIONS = [
  'Summarize what this workspace can do.',
  'Draft an urgent escalation for a production outage.',
  'Explain which dispatch targets are configured.',
];

export function ChatPanel({
  data,
  agent,
  conversation,
  conversationLoading,
  sending,
  error,
  onSelectConversation,
  onNewConversation,
  onSend,
  onRefresh,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<{ text: string; createdAt: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const recognition = useSpeechRecognition();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const provider = data.config.providers.find(item => item.id === agent?.providerId);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [conversation?.messages.length, sending, pending]);

  useEffect(() => {
    if (!recognition.listening) return;
    return () => recognition.stop();
  }, [recognition.listening, recognition.stop]);

  const submit = async () => {
    const text = draft.trim();
    if (!text || sending || !agent) return;
    if (recognition.listening) recognition.stop();
    setDraft('');
    setPending({ text, createdAt: new Date().toISOString() });
    const reply = await onSend(text);
    setPending(null);
    if (!reply) setDraft(text);
  };

  const deleteConversation = async (conversationId: string) => {
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return;
    setDeletingId(conversationId);
    try {
      await api.deleteConversation(conversationId);
      if (conversation?.id === conversationId) onNewConversation();
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="chat-layout">
      <aside className="conversation-rail" aria-label="Conversation history">
        <div className="rail-head">
          <span>History</span>
          <button type="button" className="icon-button small" onClick={onNewConversation} title="New conversation" aria-label="New conversation">
            <PlusIcon size={16} />
          </button>
        </div>

        {data.conversations.length === 0 ? (
          <p className="rail-empty">No saved conversations yet.</p>
        ) : (
          <ul className="conversation-list">
            {data.conversations.map(item => {
              const active = item.id === conversation?.id;
              return (
                <li key={item.id} className={active ? 'active' : ''}>
                  <button
                    type="button"
                    className="conversation-item"
                    onClick={() => {
                      playTap();
                      onSelectConversation(item.id);
                    }}
                  >
                    <span className="conversation-title">{item.title}</span>
                    <span className="conversation-meta">
                      {item.agentName} · {formatRelative(item.updatedAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="conversation-delete"
                    aria-label={`Delete ${item.title}`}
                    title="Delete conversation"
                    disabled={deletingId === item.id}
                    onClick={() => void deleteConversation(item.id)}
                  >
                    {deletingId === item.id ? <Spinner /> : <TrashIcon size={14} />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <section className="chat-surface" aria-label="Conversation">
        <div className="chat-head">
          <div>
            <h2>{conversation?.title ?? 'New conversation'}</h2>
            <p>
              {agent ? `${agent.name} · ${agent.modelId}` : 'No agent selected'}
              {conversation ? ` · ${conversation.messages.length} messages` : ''}
            </p>
          </div>
          <div className="chat-head-actions">
            {provider ? (
              <Pill tone={provider.configured ? 'ok' : 'warn'}>
                {provider.configured ? provider.label : `${provider.label} key missing`}
              </Pill>
            ) : null}
            <button type="button" className="button button-quiet button-small" onClick={onNewConversation}>
              <PlusIcon size={15} />
              New
            </button>
          </div>
        </div>

        {agent && provider && !provider.configured ? (
          <div className="chat-banner">
            <Notice
              tone="warn"
              title="This agent's provider is not configured"
              action={
                <button type="button" className="text-link" onClick={() => navigate('/app/settings')}>
                  Open settings
                </button>
              }
            >
              Add an API key for {provider.label} to the backend environment, then restart the API. AEGIS does not
              fall back to a fake local reply.
            </Notice>
          </div>
        ) : null}

        {error ? (
          <div className="chat-banner">
            <Notice tone="danger" title="The message did not complete">{error}</Notice>
          </div>
        ) : null}

        {recognition.error ? (
          <div className="chat-banner">
            <Notice tone="warn" title="Microphone">{recognition.error}</Notice>
          </div>
        ) : null}

        <div className="chat-scroll" ref={scrollRef}>
          {conversationLoading ? (
            <div className="chat-loading"><Spinner label="Loading conversation" /></div>
          ) : !conversation && !pending ? (
            <EmptyState
              icon={<ChatIcon size={26} />}
              title="Start with a sentence."
              action={
                <div className="suggestion-grid">
                  {SUGGESTIONS.map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      className="suggestion"
                      onClick={() => {
                        setDraft(suggestion);
                        textareaRef.current?.focus();
                      }}
                    >
                      <SparkIcon size={15} />
                      {suggestion}
                    </button>
                  ))}
                </div>
              }
            >
              Messages are stored by the AEGIS API and can be resumed from the history rail.
            </EmptyState>
          ) : (
            <div className="message-list">
              {conversation?.messages.map(message => (
                <MessageRow key={message.id} message={message} agentName={agent?.name ?? 'Agent'} />
              ))}
              {pending ? (
                <>
                  <MessageRow
                    message={{
                      id: 'pending-user',
                      role: 'user',
                      content: pending.text,
                      createdAt: pending.createdAt,
                    }}
                    agentName={agent?.name ?? 'Agent'}
                  />
                  <div className="message-row assistant">
                    <div className="message-avatar">AI</div>
                    <div className="message-bubble assistant typing">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        <div className="composer">
          <div className="composer-box">
            <textarea
              ref={textareaRef}
              rows={2}
              value={draft}
              placeholder={recognition.listening ? 'Listening…' : 'Type a message, or use the microphone.'}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
              disabled={sending}
              aria-label="Message"
            />
            <div className="composer-tools">
              <button
                type="button"
                className={`icon-button ${recognition.listening ? 'recording' : ''}`}
                onClick={() => {
                  if (recognition.listening) {
                    recognition.stop();
                    return;
                  }
                  recognition.start(text => {
                    setDraft(previous => `${previous}${previous ? ' ' : ''}${text}`);
                  });
                }}
                disabled={!recognition.supported || sending}
                aria-pressed={recognition.listening}
                title={recognition.supported ? 'Dictate a message' : 'Speech recognition is unavailable in this browser'}
              >
                <MicIcon size={17} />
              </button>
              <span className="composer-hint">
                {recognition.interim || (sending ? 'Waiting for the agent…' : 'Enter to send · Shift+Enter for a new line')}
              </span>
              <button
                type="button"
                className="button button-dark button-small"
                onClick={() => void submit()}
                disabled={!draft.trim() || sending || !agent}
              >
                {sending ? <Spinner /> : <SendIcon size={15} />}
                Send
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MessageRow({ message, agentName }: { message: ConversationMessage; agentName: string }) {
  const assistant = message.role === 'assistant';
  return (
    <div className={`message-row ${assistant ? 'assistant' : 'user'}`}>
      <div className={`message-avatar ${assistant ? 'assistant' : 'user'}`}>
        {assistant ? 'AI' : initials('You')}
      </div>
      <div className="message-stack">
        <div className="message-meta">
          <strong>{assistant ? agentName : 'You'}</strong>
          <span>{formatRelative(message.createdAt)}</span>
          {assistant && message.modelId ? <span className="model-tag">{message.modelId}</span> : null}
        </div>
        <div className={`message-bubble ${assistant ? 'assistant' : 'user'}`}>{message.content}</div>
      </div>
    </div>
  );
}
