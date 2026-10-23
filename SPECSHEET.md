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
  ├─ 3. FastN Multi-Tenant Connector Routing (Strictly scoped to tenant account)
  │     ├─ HubSpot: Generate Ticket (e.g. HS-481920)
  │     ├─ Slack: Dispatch Alert to Channel (#acme-dispatch vs #nexus-alerts)
  │     ├─ Gmail: Inbound Confirmation Receipt to Caller
  │     ├─ Google Sheets: Append Row to Tenant Audit Ledger
  │     └─ Twilio: Real-time Inbound Voice Ack
  │
  └─ 4. Real-Time Isolated Event Feed & Payload Inspector
```

---

## HACKATHON CHECKLIST & PROGRESS

| Requirement | Target | Status | Notes |
|---|---|---|---|
| **Two-Tenant Isolation Test** | Tenant A vs B isolation | **DONE** | Complete isolation: distinct states, channels, and logs. Verified in 1-click. |
| **Dispatch Workflow** | Trigger → Classify → Route | **DONE** | Working end-to-end via simulator and API with 4-step stepper visualizer. |
| **5+ FastN Integrations** | HubSpot, Slack, Gmail, Sheets, Twilio | **DONE** | All 5 integrated in backend store and frontend status panels. |
| **Organic UI/UX Overhaul** | Apple & Emil design standards | **DONE** | Cornsilk, Olive Leaf, Black Forest, Light Caramel, Copper palette. |
| **Smooth Scrolling** | Lenis smooth scroll engine | **DONE** | Integrated with RAF loop & `lenis.css`. Fluid momentum. |
| **Procedural Sound Engine** | Web Audio API audio-haptics | **DONE** | Zero-latency synthesized feedback (tenant switch, tap, launch, ticks, chime). |
| **Event Stream & Inspection** | Live feed + search + payload trace | **DONE** | Filter by category, keyword search, and collapsible JSON inspector. |
| **AI Classification** | Claude model | **WIP** | Regex/keyword logic active; direct Claude API hook ready in backend. |
| **Demo Video** | <= 3 min, English | **TODO** | Script prepared; ready to record dual-tenant test and audio demo. |
| **Public Deployment** | Live URL | **TODO** | Local production build passing cleanly (`oxlint` + `vite build`). |

---

## DETAILED COMPONENT ARCHITECTURE

### 1. Frontend Architecture (`frontend/src`)

| Component / File | Location | Key Functionality |
|---|---|---|
| **`App.tsx`** | `frontend/src/App.tsx` | Main application dashboard, Apple segmented tenant switcher, voice simulation form, live audio waveform, quick preset chips, 4-step stepper, connectors panel, event feed stream, JSON payload inspector. |
| **`soundEffects.ts`** | `frontend/src/utils/soundEffects.ts` | Zero-dependency procedural Web Audio synthesizer. Exports `playTap()`, `playSwitch()`, `playDispatchLaunch()`, `playStepTick()`, `playDispatchComplete()`. Automatically unlocks audio context on first user pointer event. |
| **`index.css`** | `frontend/src/index.css` | Design tokens for the 5-color organic system (`--c-olive`, `--c-forest`, `--c-cornsilk`, `--c-caramel`, `--c-copper`), Lenis smooth scrolling rules, custom ergonomic scrollbar, and ambient radial background gradients. |
| **`App.css`** | `frontend/src/App.css` | Glassmorphic layout surfaces, tactile button active states (`scale(0.98)`), audio waveform animation keyframes (`@keyframes wave-motion`), pipeline stepper lines, and responsive 2-column grid. |
| **`index.html`** | `frontend/index.html` | Google Fonts preconnect (`Plus Jakarta Sans` & `JetBrains Mono`), viewport meta, theme color `#fefae0`. |

### 2. Backend Architecture (`backend/src`)

| Component / File | Location | Key Functionality |
|---|---|---|
| **`tenantStore.ts`** | `backend/src/tenantStore.ts` | In-memory multi-tenant state store. Houses seeded accounts for `tenant-a` (Acme Corp) and `tenant-b` (Nexus Logistics). Guarantees complete data isolation via `Map<string, Tenant>`. |
| **`index.ts`** | `backend/src/index.ts` | Express server running on port 3001. Exposes `/api/tenants`, `/api/tenants/:id`, `/api/dispatch/trigger`, `/api/tenants/:id/logs`. |

---

## API CONTRACTS

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

**Response (201 Created):**
```json
{
  "success": true,
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
      "summary": "Automated dispatch for: \"Production database cluster...\""
    },
    "actionsTaken": {
      "hubspotTicketId": "HS-591240",
      "slackChannelNotified": "#acme-dispatch",
      "gmailSentTo": "caller-followup@example.com",
      "sheetsRowAppended": true
    },
    "status": "dispatched"
  }
}
```

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
1. **Direct Claude API Integration**: Replace mock classification logic in backend with `anthropic` SDK when `CLAUDE_API_KEY` is present.
2. **FastN Webhook Handlers**: Support external inbound webhooks from FastN workflow events.
3. **Demo Video Recording**: 2-minute walkthrough showing dual-tenant isolation, audio feedback, and end-to-end dispatch execution.
