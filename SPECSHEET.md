# SPECSHEET.md

## SYSTEM ARCHITECTURE
```
Inbound Voice Event (Twilio / Simulator)
  │
  ▼
POST /api/dispatch/trigger
  │
  ├─ 1. Tenant Context Isolation (tenantId: 'tenant-a' | 'tenant-b')
  │
  ├─ 2. Claude AI Classification Pipeline
  │     ├─ Category: Emergency | Technical Support | Billing | Sales Inquiry
  │     ├─ Priority: low | medium | high | urgent
  │     └─ Contextual Summary Extraction
  │
  ├─ 3. FastN Connector Routing (strictly scoped to tenant account)
  │     ├─ Live: POST /api/v1/workflows/{id}/execute per published workflow
  │     ├─ Simulated: explicit sandbox results when no workflow id is configured
  │     ├─ HubSpot: Create Ticket (ticketId)
  │     ├─ Slack: Dispatch Alert (channel)
  │     ├─ Gmail: Follow-up Email (messageId)
  │     ├─ Google Sheets: Append Audit Row (rowId)
  │     └─ Twilio: Inbound Voice Trigger (external telephony config required)
  │
  └─ 4. Real-Time Isolated Event Feed, Per-Connector Outcomes & Payload Inspector
```

---

## HACKATHON CHECKLIST & PROGRESS

| Requirement | Target | Status | Notes |
|---|---|---|---|
| **Two-Tenant Isolation Test** | Tenant A vs B isolation | **DONE** | Complete isolation: distinct states, channels, and logs. Verified in 1-click. |
| **Dispatch Workflow** | Trigger → Classify → Route | **DONE** | Working end-to-end via simulator and API with 4-step stepper visualizer. |
| **5+ FastN Integrations** | HubSpot, Slack, Gmail, Sheets, Twilio | **DONE** | Connector workflows live and verified for HubSpot, Slack, Gmail, Sheets via FastN published workflow execution; Twilio inbound simulated. |
| **FastN Live Workflow Execution** | Documented execute endpoint | **DONE** | Fully wired and verified against live FastN API (`https://api.fastn.dev/v1/workflows/{id}/execute`). Correctly handles FastN output envelopes, returns live references, and maintains dual-tenant scoping. |
| **Truthful Outcomes** | success / failed / pending / simulated | **DONE** | Missing ids, upstream errors, timeouts and `202` queued runs are never reported as success; status aggregates to `dispatched`, `partial` or `failed`. |
| **Security Hardening** | Server-side secrets, validation, limits | **DONE** | Helmet, CORS allowlist, 64kb JSON cap, 120 req/min/IP rate limit, input validation, sanitized errors, secret redaction, no stack traces. |
| **Automated Tests** | Config, FastN client, connectors, routes | **DONE** | 43 `node:test` cases via `tsx --test`; FastN fetch is mocked, route tests use an ephemeral server. No real calls are made. |
| **Organic UI/UX Overhaul** | Apple & Emil design standards | **DONE** | Cornsilk, Olive Leaf, Black Forest, Light Caramel, Copper palette. |
| **Smooth Scrolling** | Lenis smooth scroll engine | **DONE** | Integrated with RAF loop & `lenis.css`. Fluid momentum. |
| **Procedural Sound Engine** | Web Audio API audio-haptics | **DONE** | Zero-latency synthesized feedback (tenant switch, tap, launch, ticks, chime). |
| **Event Stream & Inspection** | Live feed + search + payload trace | **DONE** | Filter by category, keyword search, and collapsible JSON inspector. |
| **AI Classification** | Claude model | **DONE** | Claude Messages API with strict JSON parsing; deterministic fallback when no key/network. |
| **Shareable Tabs & Deep Links** | `?tenant=&tab=` state | **DONE** | Tenant/tab state syncs to the URL; arrow/Home/End keyboard navigation; correct tab semantics. |
| **Public Demo Resilience** | Static deploy parity | **DONE** | In-browser sandbox vault activates when the API is unreachable. Session-persisted logs and connector toggles. |
| **Demo Video** | <= 3 min, English | **TODO** | Script prepared; ready to record dual-tenant test and audio demo. |
| **Public Deployment** | Live URL + API | **DONE** | Full-stack on Vercel's free default domain: Vite frontend + Express container API at `aivoicedispatcher.vercel.app`. `/api/*` routed to the container; `VITE_API_BASE_URL=/` enables Live API mode. No custom domain configured. |

---

## DETAILED COMPONENT ARCHITECTURE

### 1. Frontend Architecture (`frontend/src`)

| Component / File | Location | Key Functionality |
|---|---|---|
| **`App.tsx`** | `frontend/src/App.tsx` | Main application dashboard, Apple segmented tenant switcher, accessible workspace tabs, voice simulation form, live audio waveform, quick preset chips, 4-step stepper, connectors panel with live toggles, event feed stream, JSON payload inspector, shareable URL state. |
| **`api.ts`** | `frontend/src/lib/api.ts` | Live Express API client with request timeouts and automatic switch to the browser sandbox when the API is unavailable. |
| **`demoStore.ts`** | `frontend/src/lib/demoStore.ts` | Session-scoped in-browser tenant vault used by the static Vercel demo. Mirrors tenant seeds, classification, and connector routing. |
| **`types.ts`** | `frontend/src/types.ts` | Shared tenant, integration, dispatch log, tab, and connection-mode types. |
| **`soundEffects.ts`** | `frontend/src/utils/soundEffects.ts` | Zero-dependency procedural Web Audio synthesizer. Exports `playTap()`, `playSwitch()`, `playDispatchLaunch()`, `playStepTick()`, `playDispatchComplete()`. Automatically unlocks audio context on first user pointer event. |
| **`index.css`** | `frontend/src/index.css` | Design tokens for the 5-color organic system (`--c-olive`, `--c-forest`, `--c-cornsilk`, `--c-caramel`, `--c-copper`), Lenis smooth scrolling rules, custom ergonomic scrollbar, and ambient radial background gradients. |
| **`App.css`** | `frontend/src/App.css` | Glassmorphic layout surfaces, tactile button active states (`scale(0.98)`), audio waveform animation keyframes (`@keyframes wave-motion`), pipeline stepper lines, and responsive 2-column grid. |
| **`index.html`** | `frontend/index.html` | Google Fonts preconnect (`Plus Jakarta Sans` & `JetBrains Mono`), viewport meta, theme color `#fefae0`. |

### 2. Backend Architecture (`backend/src`)

| Component / File | Location | Key Functionality |
|---|---|---|
| **`tenantStore.ts`** | `backend/src/tenantStore.ts` | In-memory multi-tenant state store. Houses seeded accounts for `tenant-a` (Acme Corp) and `tenant-b` (Nexus Logistics). Guarantees complete data isolation via `Map<string, Tenant>`. Preserves channel identity across connector pauses. Stores per-connector `results` and `mode`. |
| **`classifier.ts`** | `backend/src/classifier.ts` | Claude Messages API classifier with strict JSON validation, prompt-injection isolation, 7s timeout, and keyword fallback. |
| **`config.ts`** | `backend/src/config.ts` | Parses `FASTN_*` env, validates workflow ids, resolves `auto|live|simulated`, collects startup warnings. |
| **`fastn.ts`** | `backend/src/fastn.ts` | Executes published FastN workflows with bearer auth, tenant header, timeout, `202` queued handling, error taxonomy and secret redaction. |
| **`connectors.ts`** | `backend/src/connectors.ts` | Fans out to connected connectors, maps workflow output to references, fails explicitly when confirmation is missing, aggregates log status. |
| **`validation.ts`** | `backend/src/validation.ts` | Validates dispatch and integration payloads (tenant id, query length, booleans). |
| **`app.ts`** | `backend/src/app.ts` | `createApp(deps)` factory, all routes, Helmet, CORS, rate limiting, JSON body cap, sanitized error handler. |
| **`main.ts`** | `backend/src/main.ts` | Loads config, prints warnings, starts the server on port 3001. |
| **`persistence.ts`** | `backend/src/persistence.ts` | Vercel Blob hydration/persistence per tenant with memory fallback. |

---

## API CONTRACTS

### 0. Health Probe
`GET /api/health`

```json
{
  "status": "ok",
  "service": "aegis-voice-dispatcher",
  "classifiers": ["claude", "heuristic"],
  "storage": "blob",
  "fastn": {
    "configured": true,
    "workspaceConfigured": true,
    "mode": "live",
    "workflows": ["hubspot", "slack", "gmail", "sheets"],
    "warnings": []
  }
}
```

The health probe never exposes the API key, workflow ids, or account details.

### 1. Inbound Dispatch Trigger
`POST /api/dispatch/trigger`

**Request:**
```json
{
  "tenantId": "tenant-a",
  "callerName": "Alex Rivers",
  "callerContact": "+1 (555) 321-9876",
  "rawQuery": "Production database cluster eu-west-1 connection timeouts"
}
```

**Response (201 Created — also used for failed dispatches, with `success: false`):**
```json
{
  "success": true,
  "outcome": "dispatched",
  "message": "Dispatch successfully processed for Tenant A (Acme Corp)",
  "log": {
    "id": "disp_1729738000_k9x2m",
    "timestamp": "2026-10-24T02:45:00.000Z",
    "tenantId": "tenant-a",
    "callerName": "Alex Rivers",
    "callerContact": "+1 (555) 321-9876",
    "rawQuery": "Production database cluster eu-west-1 connection timeouts",
    "classification": {
      "category": "Emergency",
      "priority": "urgent",
      "summary": "Automated dispatch for: \"Production database cluster...\"",
      "source": "claude"
    },
    "actionsTaken": {
      "mode": "live",
      "hubspotTicketId": "HS-591240",
      "slackChannelNotified": "#acme-dispatch",
      "gmailSentTo": "caller-followup@example.com",
      "sheetsRowAppended": true,
      "results": [
        { "connector": "hubspot", "status": "success", "mode": "live", "reference": "HS-591240" },
        { "connector": "slack", "status": "success", "mode": "live", "reference": "#acme-dispatch" },
        { "connector": "gmail", "status": "success", "mode": "live", "reference": "caller-followup@example.com" },
        { "connector": "sheets", "status": "success", "mode": "live", "reference": "row_9" }
      ]
    },
    "status": "dispatched"
  }
}
```

Outcome semantics:

| `outcome` | Meaning |
|---|---|
| `dispatched` | Every targeted connector confirmed success (or the whole run was explicitly simulated). |
| `partial` | At least one connector failed or is `pending` (FastN queued it). |
| `failed` | No connector action completed. `success` is `false` and the message says the dispatch failed. |

Per-connector `status` is one of `success`, `failed`, `pending`, `simulated`; `mode` is `live` or `simulated`. Failed connectors include a sanitized `detail` such as `403 Permission denied by API key (requires: workflows.execute)`. Validation errors return `400`, unknown tenants `404`, oversized bodies `413`, and rate limits `429`.

### 2. Fetch Isolated Logs
`GET /api/tenants/:tenantId/logs`

**Response (200 OK):**
```json
{
  "tenantId": "tenant-a",
  "logs": [ ... ]
}
```

---

## UPCOMING MILESTONES
1. **Live FastN Execution**: **DONE** — Published workflows for HubSpot (`wf_b15c50451e1b`), Slack (`wf_d6b91e70dca3`), Gmail (`wf_154919590fd4`), and Sheets (`wf_0d832df9f2e1`) are wired up with live API token `fsk_live_...`. Outbound dispatch verified end-to-end with live references and dual-tenant scoping.
2. **Telephony & Server-Side STT (BLOCKED)**: no Twilio account/phone number or STT provider key is configured. Browser dictation remains a UI affordance; production voice ingestion needs Twilio (or another carrier) plus a webhook endpoint and STT provider credentials.
3. **Persistent Storage**: **DONE** — tenant state (integrations + dispatch logs) is mirrored to Vercel Blob via `backend/src/persistence.ts`, so it survives container restarts and scale-out.
4. **Demo Video Recording**: 2-minute walkthrough showing dual-tenant isolation, audio feedback, and end-to-end dispatch execution.
5. **Optional Custom Domain**: Only if desired later — the project runs on `aivoicedispatcher.vercel.app` with HTTPS by default.
