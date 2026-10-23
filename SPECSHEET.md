# SPECSHEET.md

## SYSTEM ARCHITECTURE
```
Inbound Event (Voice/Form) 
  → /api/dispatch/trigger 
  → TenantContextResolver (tenantId)
  → AI Classifier (Category, Priority, Summary)
  → FastN Connector Router
      ├─ HubSpot (Create/Update Ticket) [Tenant Isolated]
      ├─ Slack (Dispatch Alert to Tenant Channel) [Tenant Isolated]
      ├─ Gmail (Confirmation Email) [Tenant Isolated]
      ├─ Google Sheets (Append Audit Row) [Tenant Isolated]
      └─ Twilio (Voice Ack) [Tenant Isolated]
  → DispatchLog Store (Isolated Log Stream)
```

## HACKATHON CHECKLIST & PROGRESS

| Requirement | Target | Status | Notes |
|---|---|---|---|
| Embedded FastN Widget | FastN Connect in UI | WIP | Mock UI cards present; real SDK/iframe embed pending |
| 5+ Integrations | HubSpot, Slack, Gmail, Sheets, Twilio | WIP | Simulated in backend; live auth wireup pending |
| Two-Tenant Test | Tenant A vs B isolation | DONE | Verified: Tenant A & B separate states, accounts, logs |
| Dispatch Workflow | Trigger -> Classify -> Action | DONE | Working end-to-end via simulator |
| AI Classification | Claude model | WIP | Regex fallback live; direct Claude API pending |
| Demo Video | <= 3 min, English | TODO | Script ready; waiting for live FastN run |
| Public Deployment | Live URL | TODO | Dev server working locally |

## DETAILED COMPONENT STATUS

### 1. Backend (`backend/src`)
- `tenantStore.ts` [DONE]:
  - Types: `IntegrationType`, `IntegrationStatus`, `Tenant`, `DispatchLog`.
  - Seeded tenants: `tenant-a` (Acme Corp), `tenant-b` (Nexus Logistics).
  - Methods: `getAllTenants()`, `getTenant()`, `updateIntegration()`, `addDispatchLog()`, `getDispatchLogs()`.
  - Isolation: Strict Map lookup by `tenantId`.
- `index.ts` [DONE]:
  - `GET /api/tenants` -> list tenants.
  - `GET /api/tenants/:tenantId` -> single tenant status.
  - `POST /api/tenants/:tenantId/integrations/:integrationId` -> update account.
  - `POST /api/dispatch/trigger` -> ingest call/form, classify, execute mock actions, append log.
  - `GET /api/tenants/:tenantId/logs` -> return isolated tenant logs.
- Next Backend Work [WIP]:
  - Add Claude API SDK call in `/api/dispatch/trigger` when `CLAUDE_API_KEY` present.
  - Add FastN execution webhook / SDK dispatcher.

### 2. Frontend (`frontend/src`)
- `App.tsx` [DONE]:
  - Header with dual-tenant switcher (tests two-tenant isolation in 1 click).
  - FastN connector status panel with distinct account emails per tenant.
  - Inbound voice call simulator form (Caller Name, Contact, Speech text).
  - Real-time dispatch log stream with category badges and action tags.
- `App.css` / `index.css` [DONE]:
  - Dark glassmorphism, responsive CSS grid, category color codes.
- Next Frontend Work [WIP]:
  - Embed official FastN Connect widget component (`@fastn/connect-react` or iframe).
  - Use installed skills (`shadcn`, `apple-design`, `emil-design-eng`) for UI transitions and polished component controls.

### 3. Agent Skills (`.agents/skills`)
- `apple-design` [DONE]: Available at `.agents/skills/apple-design`.
- `emil-design-eng` [DONE]: Available at `.agents/skills/emil-design-eng`.
- `shadcn` [DONE]: Available at `.agents/skills/shadcn`.

## API CONTRACTS

### POST `/api/dispatch/trigger`
Request payload:
```json
{
  "tenantId": "tenant-a",
  "callerName": "Alex Rivers",
  "callerContact": "+1 (555) 321-9876",
  "rawQuery": "Production server DB high latency alert"
}
```
Response payload (201):
```json
{
  "success": true,
  "message": "Dispatch successfully processed for Tenant A (Acme Corp)",
  "log": {
    "id": "disp_1729731234_abcde",
    "timestamp": "2026-10-24T02:00:00.000Z",
    "tenantId": "tenant-a",
    "callerName": "Alex Rivers",
    "callerContact": "+1 (555) 321-9876",
    "rawQuery": "Production server DB high latency alert",
    "classification": {
      "category": "Emergency",
      "priority": "urgent",
      "summary": "Automated dispatch for: ..."
    },
    "actionsTaken": {
      "hubspotTicketId": "HS-481920",
      "slackChannelNotified": "#acme-dispatch",
      "gmailSentTo": "caller-followup@example.com",
      "sheetsRowAppended": true
    },
    "status": "dispatched"
  }
}
```

## IMMEDIATE AGENT ROADMAP
1. Connect Claude API: Hook `ANTHROPIC_API_KEY` into backend dispatch endpoint for zero-shot intent categorization.
2. FastN SDK Wiring: Add FastN workflow trigger logic in backend and connect widget in frontend.
3. UI Refactor: Apply `.agents/skills/shadcn` + `.agents/skills/emil-design-eng` micro-interactions to log cards and simulator inputs.
4. Demo Recording: Run Tenant A dispatch, show actions, switch to Tenant B, prove zero data bleed.
