import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { tenantStore, IntegrationType } from './tenantStore.js';
import { classifyIntent } from './classifier.js';
import { hydrateTenant, persistTenant, persistenceEnabled } from './persistence.js';

dotenv.config({ path: '../.env' });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
}));
app.use(express.json());

// 0. Health probe (used by uptime checks and the deployment smoke test)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'aegis-voice-dispatcher',
    classifiers: process.env.CLAUDE_API_KEY ? ['claude', 'heuristic'] : ['heuristic'],
    storage: persistenceEnabled ? 'blob' : 'memory',
  });
});

// 1. Get all available tenants
app.get('/api/tenants', (_req: Request, res: Response) => {
  res.json({ tenants: tenantStore.getAllTenants() });
});

// 2. Get specific tenant details and integrations
app.get('/api/tenants/:tenantId', async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  await hydrateTenant(tenantId);
  const tenant = tenantStore.getTenant(tenantId);
  if (!tenant) {
    return res.status(404).json({ error: `Tenant ${tenantId} not found` });
  }
  res.json(tenant);
});

// 3. Connect / Disconnect an integration for a tenant
app.post('/api/tenants/:tenantId/integrations/:integrationId', async (req: Request, res: Response) => {
  const { tenantId, integrationId } = req.params;
  const { connected, accountEmail } = req.body;

  await hydrateTenant(tenantId);
  const updated = tenantStore.updateIntegration(
    tenantId,
    integrationId as IntegrationType,
    Boolean(connected),
    accountEmail
  );

  if (!updated) {
    return res.status(404).json({ error: `Tenant ${tenantId} not found` });
  }
  await persistTenant(tenantId);
  res.json(updated);
});

// 4. Inbound Dispatch Trigger (Simulated Voice Agent or Fastn Webhook)
app.post('/api/dispatch/trigger', async (req: Request, res: Response) => {
  const { tenantId, callerName, callerContact, rawQuery } = req.body;

  if (!tenantId || !rawQuery) {
    return res.status(400).json({ error: 'tenantId and rawQuery are required' });
  }

  await hydrateTenant(tenantId);
  const tenant = tenantStore.getTenant(tenantId);
  if (!tenant) {
    return res.status(404).json({ error: `Tenant ${tenantId} not found` });
  }

  // Claude classification with deterministic keyword fallback.
  const classification = await classifyIntent(rawQuery as string);

  const dispatchId = `disp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();

  // Create isolated dispatch log with actions simulated through tenant-specific channels
  const dispatchLog = {
    id: dispatchId,
    timestamp,
    tenantId,
    callerName: callerName || 'Anonymous Caller',
    callerContact: callerContact || '+1 (555) 012-3456',
    rawQuery,
    classification,
    actionsTaken: {
      hubspotTicketId: tenant.integrations.hubspot.connected ? `HS-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
      slackChannelNotified: tenant.integrations.slack.connected ? (tenant.integrations.slack.accountEmail || '#alerts') : undefined,
      gmailSentTo: tenant.integrations.gmail.connected ? (callerContact.includes('@') ? callerContact : 'caller-followup@example.com') : undefined,
      sheetsRowAppended: tenant.integrations.sheets.connected,
    },
    status: 'dispatched' as const,
  };

  tenantStore.addDispatchLog(tenantId, dispatchLog);
  await persistTenant(tenantId);

  res.status(201).json({
    success: true,
    message: `Dispatch successfully processed for ${tenant.name}`,
    log: dispatchLog,
  });
});

// 5. Get dispatch history for a tenant
app.get('/api/tenants/:tenantId/logs', async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  await hydrateTenant(tenantId);
  const logs = tenantStore.getDispatchLogs(tenantId);
  res.json({ tenantId, logs });
});

app.listen(port, () => {
  console.log(`[Dispatcher Backend] Running on http://localhost:${port} (storage: ${persistenceEnabled ? 'blob' : 'memory'})`);
});
