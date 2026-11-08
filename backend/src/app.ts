import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { publicConfig, readConfig, type AppConfig } from './config.js';
import { ProviderRegistry } from './providers/registry.js';
import { ProviderError } from './providers/types.js';
import { runChat } from './chat.js';
import { checkTargetUrl, executeDispatch, planDispatch, testTarget } from './dispatch.js';
import { hydrateWorkspace as defaultHydrate, persistWorkspace as defaultPersist, persistenceEnabled } from './persistence.js';
import { WorkspaceStore, publicTarget } from './store.js';
import type { DispatchPlan, DispatchTarget } from './types.js';
import {
  parseAgentRequest,
  parseChatRequest,
  parseConversationRequest,
  parseExecuteRequest,
  parsePlanRequest,
  parseTargetRequest,
} from './validation.js';

export interface AppDeps {
  config?: AppConfig;
  store?: WorkspaceStore;
  registry?: ProviderRegistry;
  hydrate?: (store: WorkspaceStore) => Promise<void>;
  persist?: (store: WorkspaceStore) => Promise<void>;
  rateLimit?: { windowMs: number; limit: number } | false;
  aiRateLimit?: { windowMs: number; limit: number } | false;
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

function asyncHandler(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

function providerErrorStatus(code: ProviderError['code']): number {
  switch (code) {
    case 'not_configured':
      return 503;
    case 'unauthorized':
    case 'forbidden':
    case 'not_found':
      return 502;
    case 'rate_limited':
      return 429;
    case 'timeout':
      return 504;
    default:
      return 502;
  }
}

function sendProviderError(res: Response, error: ProviderError) {
  res.status(providerErrorStatus(error.code)).json({
    error: error.message,
    code: error.code,
  });
}

export function createApp(deps: AppDeps = {}) {
  const config = deps.config ?? readConfig();
  const store = deps.store ?? new WorkspaceStore(config);
  const registry = deps.registry ?? new ProviderRegistry(config);
  const hydrate = deps.hydrate ?? defaultHydrate;
  const persist = deps.persist ?? defaultPersist;
  const rateLimitConfig = deps.rateLimit === undefined ? { windowMs: 60_000, limit: 120 } : deps.rateLimit;
  const aiRateLimitConfig = deps.aiRateLimit === undefined ? { windowMs: 60_000, limit: 40 } : deps.aiRateLimit;

  const app = express();
  app.disable('x-powered-by');
  if (process.env.VERCEL) app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  const origins = config.frontendOrigins;
  app.use(cors(origins.length > 0
    ? {
        origin: (origin, callback) => {
          callback(null, !origin || origins.includes(origin));
        },
      }
    : {}));

  app.use(express.json({ limit: '128kb' }));

  if (rateLimitConfig) {
    app.use('/api', rateLimit({
      windowMs: rateLimitConfig.windowMs,
      limit: rateLimitConfig.limit,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      skip: req => req.path === '/health',
      message: { error: 'Too many requests. Please slow down.' },
    }));
  }

  if (aiRateLimitConfig) {
    app.use(['/api/chat', '/api/dispatch'], rateLimit({
      windowMs: aiRateLimitConfig.windowMs,
      limit: aiRateLimitConfig.limit,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Too many AI or dispatch requests. Please wait a moment.' },
    }));
  }

  // Health never exposes keys, webhook URLs, prompts or conversation data.
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'aegis',
      version: '2.0.0',
      storage: persistenceEnabled ? 'blob' : 'memory',
      ai: {
        defaultProvider: config.defaultProvider,
        defaultModel: config.defaultModel,
        providers: config.providers.map(provider => ({
          id: provider.id,
          label: provider.label,
          configured: Boolean(provider.apiKey),
        })),
      },
      dispatch: {
        targets: store.listTargets().length,
        insecureWebhooks: config.allowInsecureWebhooks,
      },
    });
  });

  app.get('/api/workspace', asyncHandler(async (_req, res) => {
    await hydrate(store);
    res.json({
      config: publicConfig(config),
      storage: persistenceEnabled ? 'blob' : 'memory',
      agents: store.listAgents(),
      conversations: store.listConversations(),
      targets: store.listPublicTargets(),
      logs: store.listDispatchLogs(),
    });
  }));

  app.get('/api/providers', (_req, res) => {
    res.json(publicConfig(config));
  });

  // ---------------------------------------------------------------------
  // Agents
  // ---------------------------------------------------------------------
  app.get('/api/agents', (_req, res) => {
    res.json({ agents: store.listAgents() });
  });

  app.post('/api/agents', asyncHandler(async (req, res) => {
    const parsed = parseAgentRequest(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    if (!registry.providerConfig(parsed.value.providerId)) {
      res.status(400).json({ error: 'Unknown AI provider.' });
      return;
    }
    const unknownTarget = parsed.value.targetIds.find(targetId => !store.getTarget(targetId));
    if (unknownTarget) {
      res.status(400).json({ error: 'The agent references a dispatch target that does not exist.' });
      return;
    }

    const agent = store.createAgent(parsed.value);
    await persist(store);
    res.status(201).json({ agent });
  }));

  app.put('/api/agents/:agentId', asyncHandler(async (req, res) => {
    const parsed = parseAgentRequest(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    if (!registry.providerConfig(parsed.value.providerId)) {
      res.status(400).json({ error: 'Unknown AI provider.' });
      return;
    }
    const unknownTarget = parsed.value.targetIds.find(targetId => !store.getTarget(targetId));
    if (unknownTarget) {
      res.status(400).json({ error: 'The agent references a dispatch target that does not exist.' });
      return;
    }

    const agent = store.updateAgent(req.params.agentId, parsed.value);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found.' });
      return;
    }
    await persist(store);
    res.json({ agent });
  }));

  app.delete('/api/agents/:agentId', asyncHandler(async (req, res) => {
    const result = store.deleteAgent(req.params.agentId);
    if (result === 'not_found') {
      res.status(404).json({ error: 'Agent not found.' });
      return;
    }
    if (result === 'last_agent') {
      res.status(409).json({ error: 'At least one agent must remain.' });
      return;
    }
    await persist(store);
    res.json({ deleted: true });
  }));

  // ---------------------------------------------------------------------
  // Conversations
  // ---------------------------------------------------------------------
  app.get('/api/conversations', (_req, res) => {
    res.json({ conversations: store.listConversations() });
  });

  app.post('/api/conversations', asyncHandler(async (req, res) => {
    const parsed = parseConversationRequest(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const agent = store.getAgent(parsed.value.agentId);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found.' });
      return;
    }
    const conversation = store.createConversation(agent);
    await persist(store);
    res.status(201).json({ conversation });
  }));

  app.get('/api/conversations/:conversationId', (req, res) => {
    const conversation = store.getConversation(req.params.conversationId);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    res.json({ conversation });
  });

  app.delete('/api/conversations/:conversationId', asyncHandler(async (req, res) => {
    if (!store.deleteConversation(req.params.conversationId)) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    await persist(store);
    res.json({ deleted: true });
  }));

  // ---------------------------------------------------------------------
  // Chat
  // ---------------------------------------------------------------------
  app.post('/api/chat', asyncHandler(async (req, res) => {
    const parsed = parseChatRequest(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    try {
      const output = await runChat(parsed.value, store, registry);
      await persist(store);
      res.json(output);
    } catch (error) {
      if (error instanceof ProviderError) {
        sendProviderError(res, error);
        return;
      }
      throw error;
    }
  }));

  // ---------------------------------------------------------------------
  // Dispatch
  // ---------------------------------------------------------------------
  app.post('/api/dispatch/plan', asyncHandler(async (req, res) => {
    const parsed = parsePlanRequest(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const agent = parsed.value.agentId ? store.getAgent(parsed.value.agentId) : undefined;
    if (parsed.value.agentId && !agent) {
      res.status(404).json({ error: 'Agent not found.' });
      return;
    }

    const plan = await planDispatch({
      instruction: parsed.value.instruction,
      agent,
      targets: store.listTargets(),
      registry,
      config,
    });

    res.json({ plan, targets: store.listPublicTargets() });
  }));

  app.post('/api/dispatch/execute', asyncHandler(async (req, res) => {
    const parsed = parseExecuteRequest(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const selectedIds = parsed.value.targetIds ?? parsed.value.plan.targetIds;
    const targets: DispatchTarget[] = [];
    for (const targetId of selectedIds) {
      const target = store.getTarget(targetId);
      if (!target) {
        res.status(400).json({ error: 'A selected dispatch target no longer exists.' });
        return;
      }
      targets.push(target);
    }

    const plan: DispatchPlan = {
      ...parsed.value.plan,
      id: `plan_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };

    const log = await executeDispatch({
      plan,
      targets,
      store,
      config,
      agentId: parsed.value.agentId,
    });
    await persist(store);

    res.status(log.status === 'failed' ? 502 : 200).json({
      success: log.status === 'dispatched',
      status: log.status,
      message: log.message,
      log,
    });
  }));

  app.get('/api/dispatch/logs', (_req, res) => {
    res.json({ logs: store.listDispatchLogs() });
  });

  // ---------------------------------------------------------------------
  // Dispatch targets
  // ---------------------------------------------------------------------
  app.get('/api/targets', (_req, res) => {
    res.json({ targets: store.listPublicTargets() });
  });

  app.post('/api/targets', asyncHandler(async (req, res) => {
    const parsed = parseTargetRequest(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const safety = await checkTargetUrl(parsed.value.url, config.allowInsecureWebhooks);
    if (!safety.ok) {
      res.status(400).json({ error: safety.reason });
      return;
    }

    const target = store.createTarget(parsed.value);
    await persist(store);
    res.status(201).json({ target: publicTarget(target) });
  }));

  app.put('/api/targets/:targetId', asyncHandler(async (req, res) => {
    const existing = store.getTarget(req.params.targetId);
    if (!existing) {
      res.status(404).json({ error: 'Dispatch target not found.' });
      return;
    }

    const parsed = parseTargetRequest(req.body, { requireUrl: false });
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const nextUrl = parsed.value.url || existing.url;
    if (parsed.value.url) {
      const safety = await checkTargetUrl(nextUrl, config.allowInsecureWebhooks);
      if (!safety.ok) {
        res.status(400).json({ error: safety.reason });
        return;
      }
    }

    const target = store.updateTarget(existing.id, {
      name: parsed.value.name,
      type: parsed.value.type,
      enabled: parsed.value.enabled,
      ...(parsed.value.url ? { url: nextUrl } : {}),
    });
    await persist(store);
    res.json({ target: target ? publicTarget(target) : null });
  }));

  app.delete('/api/targets/:targetId', asyncHandler(async (req, res) => {
    if (!store.deleteTarget(req.params.targetId)) {
      res.status(404).json({ error: 'Dispatch target not found.' });
      return;
    }
    await persist(store);
    res.json({ deleted: true });
  }));

  app.post('/api/targets/:targetId/test', asyncHandler(async (req, res) => {
    const target = store.getTarget(req.params.targetId);
    if (!target) {
      res.status(404).json({ error: 'Dispatch target not found.' });
      return;
    }

    const result = await testTarget(target, config);
    store.markTargetTested(target.id, result.status);
    await persist(store);
    res.json({ result, target: publicTarget(store.getTarget(target.id) ?? target) });
  }));

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found.' });
  });

  app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    const type = (error as { type?: string })?.type;
    if (type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Request body must be valid JSON.' });
      return;
    }
    if (type === 'entity.too.large') {
      res.status(413).json({ error: 'Request body is too large.' });
      return;
    }

    if (error instanceof ProviderError) {
      sendProviderError(res, error);
      return;
    }

    console.error(`[api] ${req.method} ${req.path} failed: ${(error as Error)?.name ?? 'Error'}`);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}
