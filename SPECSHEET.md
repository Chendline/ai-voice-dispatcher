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
| **AI Classification** | Claude model | **DONE** | Claude Messages API with strict JSON parsing; deterministic fallback when no key/network. |
| **Shareable Tabs & Deep Links** | `?tenant=&tab=` state | **DONE** | Tenant/tab state syncs to the URL; arrow/Home/End keyboard navigation; correct tab semantics. |
| **Public Demo Resilience** | Static deploy parity | **DONE** | In-browser sandbox vault activates when the API is unreachable. Session-persisted logs and connector toggles. |
| **Demo Video** | <= 3 min, English | **TODO** | Script prepared; ready to record dual-tenant test and audio demo. |
| **Public Deployment** | Live URL + API | **DONE** | Full-stack on Vercel: Vite frontend + Express container API at `aivoicedispatcher.vercel.app`. `/api/*` routed to the container; `VITE_API_BASE_URL=/` enables Live API mode. Custom domain target: `aivoicedispatcher.com`. |

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
| **`tenantStore.ts`** | `backend/src/tenantStore.ts` | In-memory multi-tenant state store. Houses seeded accounts for `tenant-a` (Acme Corp) and `tenant-b` (Nexus Logistics). Guarantees complete data isolation via `Map<string, Tenant>`. Preserves channel identity across connector pauses. |
| **`classifier.ts`** | `backend/src/classifier.ts` | Claude Messages API classifier with strict JSON validation, prompt-injection isolation, 7s timeout, and keyword fallback. |
| **`main.ts`** | `backend/src/main.ts` | Express server running on port 3001. Exposes `/api/health`, `/api/tenants`, `/api/tenants/:id`, `/api/dispatch/trigger`, `/api/tenants/:id/logs`. |

---

## API CONTRACTS

### 0. Health Probe
`GET /api/health`

```json
{ "status": "ok", "service": "aegis-voice-dispatcher", "classifiers": ["claude", "heuristic"] }
```

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
      "summary": "Automated dispatch for: \"Production database cluster...\"",
      "source": "claude"
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
1. **Live FastN Credentials**: Replace simulated connector payloads with real FastN workspace actions when keys are provisioned.
2. **Persistent Storage**: **DONE** — tenant state (integrations + dispatch logs) is mirrored to Vercel Blob via `backend/src/persistence.ts`, so it survives container restarts and scale-out.
3. **Demo Video Recording**: 2-minute walkthrough showing dual-tenant isolation, audio feedback, and end-to-end dispatch execution.
4. **Custom Domain**: Point `aivoicedispatcher.com` at the Vercel project and enable HTTPS.
