import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { tenantStore as defaultStore, TenantStore, IntegrationType, DispatchLog } from './tenantStore.js';
import { classifyIntent } from './classifier.js';
import { hydrateTenant as defaultHydrate, persistTenant as defaultPersist, persistenceEnabled } from './persistence.js';
import { describeFastn, readFastnConfig, type FastnConfig } from './config.js';
import { dispatchConnectors, type WorkflowExecutor } from './connectors.js';
import { parseDispatchRequest, parseIntegrationRequest } from './validation.js';

export interface AppDeps {
  config?: FastnConfig;
  store?: TenantStore;
  execute?: WorkflowExecutor;
  hydrate?: (tenantId: string) => Promise<void>;
  persist?: (tenantId: string) => Promise<void>;
  rateLimit?: { windowMs: number; limit: number } | false;
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

function asyncHandler(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

function allowedOrigins(): string[] {
  return (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

const INTEGRATION_IDS: IntegrationType[] = ['hubspot', 'slack', 'gmail', 'sheets', 'twilio'];

export function createApp(deps: AppDeps = {}) {
  const config = deps.config ?? readFastnConfig();
  const store = deps.store ?? defaultStore;
  const hydrate = deps.hydrate ?? defaultHydrate;
  const persist = deps.persist ?? defaultPersist;
  const execute = deps.execute;
  const rateLimitConfig = deps.rateLimit === undefined ? { windowMs: 60_000, limit: 120 } : deps.rateLimit;

  const app = express();
  app.disable('x-powered-by');
  if (process.env.VERCEL) app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  const origins = allowedOrigins();
  app.use(cors(origins.length > 0
    ? {
        origin: (origin, callback) => {
          callback(null, !origin || origins.includes(origin));
        },
      }
    : {}));

  app.use(express.json({ limit: '64kb' }));

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

  // Health probe: exposes readiness, never credentials or workflow ids.
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'aegis-voice-dispatcher',
      classifiers: process.env.CLAUDE_API_KEY ? ['claude', 'heuristic'] : ['heuristic'],
      storage: persistenceEnabled ? 'blob' : 'memory',
      fastn: describeFastn(config),
    });
  });

  app.get('/api/tenants', (_req: Request, res: Response) => {
    res.json({ tenants: store.getAllTenants() });
  });

  app.get('/api/tenants/:tenantId', asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    await hydrate(tenantId);
    const tenant = store.getTenant(tenantId);
    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found.' });
      return;
    }
    res.json(tenant);
  }));

  app.post('/api/tenants/:tenantId/integrations/:integrationId', asyncHandler(async (req, res) => {
    const { tenantId, integrationId } = req.params;
    if (!INTEGRATION_IDS.includes(integrationId as IntegrationType)) {
      res.status(404).json({ error: 'Unknown integration.' });
      return;
    }

    const parsed = parseIntegrationRequest(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    await hydrate(tenantId);
    const updated = store.updateIntegration(
      tenantId,
      integrationId as IntegrationType,
      parsed.value.connected,
      parsed.value.accountEmail,
    );
    if (!updated) {
      res.status(404).json({ error: 'Tenant not found.' });
      return;
    }

    await persist(tenantId);
    res.json(updated);
  }));

  app.post('/api/dispatch/trigger', asyncHandler(async (req, res) => {
    const parsed = parseDispatchRequest(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const { tenantId, callerName, callerContact, rawQuery } = parsed.value;
    await hydrate(tenantId);
    const tenant = store.getTenant(tenantId);
    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found.' });
      return;
    }

    const classification = await classifyIntent(rawQuery);
    const dispatchId = `disp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    const outcome = await dispatchConnectors(
      { tenant, callerName, callerContact, rawQuery, classification, dispatchId, timestamp },
      config,
      execute,
    );

    const log: DispatchLog = {
      id: dispatchId,
      timestamp,
      tenantId,
      callerName,
      callerContact,
      rawQuery,
      classification,
      actionsTaken: outcome.actionsTaken,
      status: outcome.status,
    };

    store.addDispatchLog(tenantId, log);
    await persist(tenantId);

    const message = outcome.status === 'dispatched'
      ? `Dispatch successfully processed for ${tenant.name}`
      : outcome.status === 'partial'
        ? `Dispatch partially completed for ${tenant.name}`
        : `Dispatch failed for ${tenant.name}: no connector action completed`;

    res.status(201).json({
      success: outcome.status !== 'failed',
      outcome: outcome.status,
      message,
      log,
    });
  }));

  app.get('/api/tenants/:tenantId/logs', asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    await hydrate(tenantId);
    res.json({ tenantId, logs: store.getDispatchLogs(tenantId) });
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

    console.error(`[api] ${req.method} ${req.path} failed: ${(error as Error)?.name ?? 'Error'}`);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}
