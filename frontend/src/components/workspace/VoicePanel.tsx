import { useCallback, useEffect, useRef, useState } from 'react';
import type { Agent, Conversation, ConversationMessage, ProviderInfo } from '../../types';
import { useSpeechPlayback } from '../../hooks/useSpeechPlayback';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { navigate } from '../../lib/router';
import { ChatIcon, PlusIcon, StopIcon, VoiceIcon } from '../Icons';
import { EmptyState, Notice, Pill, Spinner, formatRelative } from '../ui';
import { SpeechSettingsPanel } from './SpeechSettings';
import { playDispatchLaunch, playTap } from '../../utils/soundEffects';

interface VoicePanelProps {
  agent?: Agent;
  provider?: ProviderInfo;
  conversation: Conversation | null;
  sending: boolean;
  error: string | null;
  onSend: (message: string) => Promise<ConversationMessage | null>;
  onNewConversation: () => void;
}

const SPEAK_KEY = 'aegis.voice.speak-replies';

function readSpeakSetting(): boolean {
  try {
    return window.localStorage.getItem(SPEAK_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function VoicePanel({
  agent,
  provider,
  conversation,
  sending,
  error,
  onSend,
  onNewConversation,
}: VoicePanelProps) {
  const tts = useSpeechPlayback();
  const recognition = useSpeechRecognition();
  const [speakReplies, setSpeakReplies] = useState(readSpeakSetting);
  const [handsFree, setHandsFree] = useState(false);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [turnError, setTurnError] = useState<string | null>(null);
  const sendingRef = useRef(false);
  const speakRef = useRef(speakReplies);
  const playRef = useRef(tts.play);
  const agentIdRef = useRef(agent?.id);

  useEffect(() => {
    speakRef.current = speakReplies;
  }, [speakReplies]);

  useEffect(() => {
    playRef.current = tts.play;
  }, [tts.play]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SPEAK_KEY, speakReplies ? 'on' : 'off');
    } catch {
      // Preferences are optional.
    }
  }, [speakReplies]);

  useEffect(() => {
    if (!agent) return;
    if (agentIdRef.current === agent.id) return;
    agentIdRef.current = agent.id;
    tts.updateSettings({ rate: agent.voiceRate, pitch: agent.voicePitch });
  }, [agent, tts.updateSettings]);

  const handleTurn = useCallback(
    async (text: string) => {
      if (sendingRef.current) return;
      sendingRef.current = true;
      setPendingText(text);
      setTurnError(null);
      playDispatchLaunch();
      const reply = await onSend(text);
      setPendingText(null);
      sendingRef.current = false;
      if (!reply) {
        setTurnError('The agent did not reply. Check the API and provider configuration.');
        return;
      }
      if (speakRef.current) playRef.current(reply.content);
    },
    [onSend],
  );

  const beginListening = useCallback(() => {
    setTurnError(null);
    recognition.start(text => {
      recognition.stop();
      void handleTurn(text);
    });
  }, [handleTurn, recognition.start, recognition.stop]);

  useEffect(() => {
    if (!handsFree || !speakReplies) return;
    if (tts.state.status !== 'completed') return;
    const timer = window.setTimeout(() => beginListening(), 500);
    return () => window.clearTimeout(timer);
  }, [handsFree, speakReplies, tts.state.status, beginListening]);

  useEffect(
    () => () => {
      tts.stop();
      recognition.stop();
    },
    // The controllers are stable for the lifetime of the panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const phase = recognition.listening
    ? 'listening'
    : sending
      ? 'thinking'
      : tts.state.status === 'speaking'
        ? 'speaking'
        : tts.state.status === 'paused'
          ? 'paused'
          : 'ready';

  const phaseCopy: Record<typeof phase, string> = {
    listening: recognition.interim || 'Listening… speak naturally.',
    thinking: 'The agent is composing a reply.',
    speaking: 'AEGIS is speaking. Speak again when the turn ends.',
    paused: 'Playback paused.',
    ready: 'Tap the microphone to start a voice turn.',
  };

  const openChat = () => {
    playTap();
    navigate('/app');
  };

  const reset = () => {
    tts.stop();
    recognition.stop();
    onNewConversation();
  };

  return (
    <div className="voice-layout">
      <section className="voice-console" aria-label="Voice console">
        <div className="voice-console-head">
          <div>
            <div className="eyebrow muted">Live voice session</div>
            <h2>{agent?.name ?? 'Voice agent'}</h2>
            <p>{agent ? `${agent.modelId} · browser speech` : 'No agent selected'}</p>
          </div>
          <div className="voice-head-actions">
            {provider && !provider.configured ? <Pill tone="warn">Provider key missing</Pill> : null}
            <button type="button" className="button button-quiet button-small" onClick={reset}>
              <PlusIcon size={15} />
              New session
            </button>
            <button type="button" className="button button-quiet button-small" onClick={openChat}>
              <ChatIcon size={15} />
              Open chat
            </button>
          </div>
        </div>

        {agent && provider && !provider.configured ? (
          <Notice tone="warn" title={`${provider.label} is not configured`}>
            Add a provider key to the backend environment before starting a voice turn. Speech recognition
            still works, but the agent cannot reply.
          </Notice>
        ) : null}

        {error || turnError ? <Notice tone="danger" title="Voice turn failed">{error ?? turnError}</Notice> : null}
        {recognition.error ? <Notice tone="warn" title="Microphone">{recognition.error}</Notice> : null}

        <div className={`voice-stage ${phase}`}>
          <div className="voice-wave" aria-hidden="true">
            {[18, 30, 22, 44, 34, 58, 28, 52, 40, 66, 36, 54, 26, 46, 20, 38, 24, 50, 32, 60, 30, 42, 18, 34].map((height, index) => (
              <span key={index} style={{ height }} />
            ))}
          </div>

          <div className="voice-orb-wrap">
            <button
              type="button"
              className={`voice-mic ${recognition.listening ? 'listening' : ''}`}
              onClick={() => {
                playTap();
                if (recognition.listening) recognition.stop();
                else beginListening();
              }}
              disabled={!recognition.supported || sending}
              aria-pressed={recognition.listening}
              aria-label={recognition.listening ? 'Stop listening' : 'Start listening'}
            >
              {sending ? <Spinner /> : recognition.listening ? <StopIcon size={28} /> : <VoiceIcon size={30} />}
            </button>
            <div className="voice-status">
              <Pill tone={phase === 'listening' ? 'info' : phase === 'thinking' ? 'warn' : phase === 'speaking' ? 'ok' : 'muted'}>
                <span className="status-dot" />
                {phase}
              </Pill>
              <p>{phaseCopy[phase]}</p>
            </div>
          </div>
        </div>

        <div className="voice-toggles">
          <label className="toggle-row">
            <input type="checkbox" checked={speakReplies} onChange={event => setSpeakReplies(event.target.checked)} />
            <span>
              <strong>Speak replies</strong>
              <em>Read each assistant message with the selected browser voice.</em>
            </span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={handsFree} onChange={event => setHandsFree(event.target.checked)} />
            <span>
              <strong>Hands-free turns</strong>
              <em>Reopen the microphone after the reply finishes speaking.</em>
            </span>
          </label>
          <button type="button" className="button button-quiet button-small" onClick={tts.stop} disabled={tts.state.status !== 'speaking' && tts.state.status !== 'paused'}>
            <StopIcon size={13} />
            Stop speech
          </button>
        </div>

        <div className="voice-transcript" aria-live="polite">
          <div className="transcript-head">
            <h3>Transcript</h3>
            <span>{conversation ? `${conversation.messages.length} turns` : 'New session'}</span>
          </div>

          {!conversation && !pendingText ? (
            <EmptyState icon={<VoiceIcon size={24} />} title="No voice turns yet.">
              Tap the microphone and ask the agent something. Your speech is transcribed in the browser and
              the turn is stored by the AEGIS API.
            </EmptyState>
          ) : (
            <div className="transcript-list">
              {conversation?.messages.map(message => (
                <div key={message.id} className={`transcript-turn ${message.role}`}>
                  <span className="transcript-role">{message.role === 'assistant' ? 'AEGIS' : 'You'}</span>
                  <p>{message.content}</p>
                  <span className="transcript-time">{formatRelative(message.createdAt)}</span>
                </div>
              ))}
              {pendingText ? (
                <>
                  <div className="transcript-turn user">
                    <span className="transcript-role">You</span>
                    <p>{pendingText}</p>
                  </div>
                  <div className="transcript-turn assistant">
                    <span className="transcript-role">AEGIS</span>
                    <p className="typing-line"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></p>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <aside className="voice-side">
        <SpeechSettingsPanel tts={tts} sampleText={agent ? `Hello, I am ${agent.name}. How can I help?` : 'This is a voice preview for AEGIS.'} compact />
      </aside>
    </div>
  );
}
