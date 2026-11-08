import type { Agent, Conversation, ConversationMessage } from './types.js';
import type { ProviderRegistry } from './providers/registry.js';
import { ProviderError, type ChatMessage } from './providers/types.js';
import type { WorkspaceStore } from './store.js';

const MAX_HISTORY_MESSAGES = 24;

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

export interface ChatInput {
  agentId: string;
  conversationId?: string;
  message: string;
}

export interface ChatOutput {
  conversation: Conversation;
  reply: ConversationMessage;
}

function buildSystemPrompt(agent: Agent): string {
  return [
    agent.systemPrompt.trim(),
    '',
    'Operating context:',
    '- You are part of AEGIS, an AI voice and operations workspace.',
    '- The user may be speaking through a microphone and listening through text-to-speech.',
    '- Keep spoken answers compact. Use short paragraphs or a brief list.',
    '- External actions only happen through the Dispatch workspace. Never imply an action already ran unless a dispatch result is present in this conversation.',
  ].join('\n');
}

export async function runChat(
  input: ChatInput,
  store: WorkspaceStore,
  registry: ProviderRegistry,
): Promise<ChatOutput> {
  const agent = store.getAgent(input.agentId);
  if (!agent) {
    throw new ProviderError('not_configured', 'The selected agent no longer exists.');
  }

  let conversation: Conversation | undefined;
  if (input.conversationId) {
    conversation = store.getConversation(input.conversationId);
    if (!conversation) {
      throw new ProviderError('not_configured', 'The selected conversation no longer exists.');
    }
    if (conversation.agentId !== agent.id) {
      throw new ProviderError('not_configured', 'This conversation belongs to a different agent.');
    }
  } else {
    conversation = store.createConversation(agent);
  }

  const userMessage: ConversationMessage = {
    id: id('msg'),
    role: 'user',
    content: input.message,
    createdAt: now(),
  };
  store.appendMessage(conversation, userMessage);

  const history: ChatMessage[] = conversation.messages
    .filter(message => message.role === 'user' || message.role === 'assistant')
    .slice(-MAX_HISTORY_MESSAGES)
    .map(message => ({ role: message.role, content: message.content.slice(0, 8000) }));

  const adapter = registry.get(agent.providerId);
  const result = await adapter.chat({
    model: agent.modelId,
    system: buildSystemPrompt(agent),
    messages: history,
    temperature: agent.temperature,
    maxTokens: agent.maxTokens,
  });

  const reply: ConversationMessage = {
    id: id('msg'),
    role: 'assistant',
    content: result.text,
    createdAt: now(),
    providerId: result.providerId,
    modelId: result.model,
    usage: result.usage,
  };
  store.appendMessage(conversation, reply);
  conversation.providerId = agent.providerId;
  conversation.modelId = agent.modelId;

  return { conversation, reply };
}
