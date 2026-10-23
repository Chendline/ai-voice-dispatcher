import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { tenantStore, IntegrationType } from './tenantStore.js';

dotenv.config({ path: '../.env' });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
}));
app.use(express.json());

// 1. Get all available tenants
app.get('/api/tenants', (req: Request, res: Response) => {
  res.json({ tenants: tenantStore.getAllTenants() });
});

// 2. Get specific tenant details and integrations
app.get('/api/tenants/:tenantId', (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const tenant = tenantStore.getTenant(tenantId);
  if (!tenant) {
    return res.status(404).json({ error: `Tenant ${tenantId} not found` });
  }
  res.json(tenant);
});

// 3. Connect / Disconnect an integration for a tenant
app.post('/api/tenants/:tenantId/integrations/:integrationId', (req: Request, res: Response) => {
  const { tenantId, integrationId } = req.params;
  const { connected, accountEmail } = req.body;

  const updated = tenantStore.updateIntegration(
    tenantId,
    integrationId as IntegrationType,
    Boolean(connected),
    accountEmail
  );

  if (!updated) {
    return res.status(404).json({ error: `Tenant ${tenantId} not found` });
  }
  res.json(updated);
});

// 4. Inbound Dispatch Trigger (Simulated Voice Agent or Fastn Webhook)
app.post('/api/dispatch/trigger', (req: Request, res: Response) => {
  const { tenantId, callerName, callerContact, rawQuery } = req.body;

  if (!tenantId || !rawQuery) {
    return res.status(400).json({ error: 'tenantId and rawQuery are required' });
  }

  const tenant = tenantStore.getTenant(tenantId);
  if (!tenant) {
    return res.status(404).json({ error: `Tenant ${tenantId} not found` });
  }

  // AI Classification logic (Mock/Claude Agent pipeline)
  const lowerQuery = (rawQuery as string).toLowerCase();
  let category: 'Billing' | 'Technical Support' | 'Sales Inquiry' | 'Emergency' = 'Technical Support';
  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

  if (lowerQuery.includes('bill') || lowerQuery.includes('refund') || lowerQuery.includes('invoice') || lowerQuery.includes('charge')) {
    category = 'Billing';
    priority = 'medium';
  } else if (lowerQuery.includes('emergency') || lowerQuery.includes('server down') || lowerQuery.includes('critical') || lowerQuery.includes('crash')) {
    category = 'Emergency';
    priority = 'urgent';
  } else if (lowerQuery.includes('pricing') || lowerQuery.includes('demo') || lowerQuery.includes('quote') || lowerQuery.includes('buy')) {
    category = 'Sales Inquiry';
    priority = 'high';
  }

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
    classification: {
      category,
      priority,
      summary: `Automated dispatch for: "${rawQuery.substring(0, 60)}..."`,
    },
    actionsTaken: {
      hubspotTicketId: tenant.integrations.hubspot.connected ? `HS-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
      slackChannelNotified: tenant.integrations.slack.connected ? (tenant.integrations.slack.accountEmail || '#alerts') : undefined,
      gmailSentTo: tenant.integrations.gmail.connected ? (callerContact.includes('@') ? callerContact : 'caller-followup@example.com') : undefined,
      sheetsRowAppended: tenant.integrations.sheets.connected,
    },
    status: 'dispatched' as const,
  };

  tenantStore.addDispatchLog(tenantId, dispatchLog);

  res.status(201).json({
    success: true,
    message: `Dispatch successfully processed for ${tenant.name}`,
    log: dispatchLog,
  });
});

// 5. Get dispatch history for a tenant
app.get('/api/tenants/:tenantId/logs', (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const logs = tenantStore.getDispatchLogs(tenantId);
  res.json({ tenantId, logs });
});

app.listen(port, () => {
  console.log(`[Dispatcher Backend] Running on http://localhost:${port}`);
});
