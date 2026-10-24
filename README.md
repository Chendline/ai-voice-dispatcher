# AEGIS · AI Voice Agent Dispatcher

A multi-tenant SaaS platform where businesses embed an AI-powered voice dispatch agent into their own product. Each customer connects their own communication and CRM tools through FastN — the agent handles call routing, ticket creation, notifications, and logging automatically.

Built for the **FastN Online Hackathon 2026**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Chendline/ai-voice-dispatcher&project-name=aivoicedispatcher&repository-name=ai-voice-dispatcher)

**Live demo:** [aivoicedispatcher.vercel.app](https://aivoicedispatcher.vercel.app) — deployed and publicly accessible on Vercel's free default domain.

---

## What it does

- **Receive inbound voice requests** — real-time simulation with an active audio waveform and preset enterprise scenarios.
- **Classify & route** — Claude AI intent classification (with deterministic keyword fallback) into Emergency, Technical Support, Billing, and Sales Inquiry.
- **FastN multi-tenant connector dispatch**:
  - **HubSpot** — creates a support ticket with a unique ID.
  - **Slack** — posts to the tenant's private channel (`#acme-dispatch` vs `#nexus-alerts`).
  - **Gmail** — sends a dispatch receipt to the caller.
  - **Google Sheets** — appends a row to the tenant's isolated audit ledger.
  - **Twilio** — simulates inbound voice ingestion and telephone routing.
- **Truthful connector outcomes** — every dispatch records `success`, `failed`, `pending` (FastN queued the workflow) or `simulated` per connector. The UI never reports a sandbox or failed run as a real success.
- **Two-tenant complete isolation** — Tenant A never sees or modifies Tenant B's data, connectors, or event feed.
- **Tactile UI/UX** — Apple Design and Emil Kowalski design engineering principles, Lenis smooth scrolling, and zero-dependency Web Audio feedback.
- **Shareable workspace state** — `?tenant=tenant-b&tab=connectors` deep links restore the exact vault and tab.
- **Resilient public demo** — if the Express API is unreachable (offline static preview, container cold failure), the frontend switches to an in-browser sandbox vault instead of breaking.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React 19, TypeScript, Vite, Lenis Smooth Scroll |
| Backend | Node.js, Express, TypeScript, `tsx` |
| Audio Engine | Zero-dependency Web Audio API procedural synthesis |
| Integrations Platform | FastN (embedded connectors & routing) |
| AI Classifier | Claude Messages API + heuristic fallback |
| Deployment | Vercel (Vite frontend + Express container API) |
| Persistence | Vercel Blob (per-tenant JSON state; memory fallback) |

---

## Design System & Refreshing Organic Aesthetic

- **Color Palette**:
  - `Cornsilk` (`#fefae0`): sunlit organic canvas
  - `Black Forest` (`#283618`): high-contrast typography and active controls
  - `Olive Leaf` (`#606c38`): waveform bars, category tags, secondary text
  - `Light Caramel` (`#dda15e`): warm neutral badges and borders
  - `Copper` (`#bc6c25`): primary action buttons and focus rings
- **Micro-interactions**:
  - Procedural audio feedback for taps, tenant switches, pipeline ticks, and completion
  - Sliding segmented tenant control with an isolated-vault status pill
  - Four-step dispatch stepper (Twilio → Claude → Router → Connectors)
  - Live event stream with category filters, search, and an expandable JSON trace inspector
- **Accessibility**: real `tablist`/`tabpanel` semantics, arrow/Home/End keyboard navigation, visible focus rings, reduced-motion and reduced-transparency fallbacks.

---

## Two-Tenant Test

1. **Tenant A (Acme Corp)**: `#acme-dispatch`, `support@acmecorp.com`, Acme audit sheet.
2. **Tenant B (Nexus Logistics)**: `#nexus-alerts`, `dispatch@nexuslogistics.io`, Nexus fleet sheet.
3. **Zero data bleed**: switching tenants immediately clears the previous feed while the new vault loads. In-flight dispatches are only committed to the tenant that started them.

Open the deep link [`/?tenant=tenant-b&tab=connectors`](http://localhost:5173/?tenant=tenant-b&tab=connectors) to verify isolation in one click.

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Run locally

```bash
# 1. Backend (port 3001)
cd backend
npm install
npm run dev

# 2. Frontend (port 5173)
cd ../frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The header badge shows **Live API** when the Express server is reachable and **Demo Sandbox** when it is not.

### Environment variables

Copy `.env.example` to `.env` at the repository root for the backend:

```env
FASTN_API_KEY=your_fastn_api_key_here
FASTN_WORKSPACE_ID=your_fastn_workspace_id_here
FASTN_WORKFLOW_HUBSPOT=wf_...
FASTN_WORKFLOW_SLACK=wf_...
FASTN_WORKFLOW_GMAIL=wf_...
FASTN_WORKFLOW_SHEETS=wf_...
FASTN_MODE=auto
FASTN_TIMEOUT_MS=7000
CLAUDE_API_KEY=your_claude_api_key_here
CLAUDE_MODEL=claude-3-5-haiku-latest
PORT=3001
FRONTEND_URL=http://localhost:5173
```

For a split frontend/API deployment, set `VITE_API_BASE_URL` in the Vercel project. The live project uses `/` so the frontend calls the same-origin container API:

```env
VITE_API_BASE_URL=https://your-api-host.example.com
```

Without `CLAUDE_API_KEY`, classification falls back to the deterministic keyword engine. Without `VITE_API_BASE_URL`, the production build uses its in-browser sandbox.

### FastN workflow contract

FastN exposes no generic "run connector action" endpoint. The supported server-side surface is workflow execution:

```
POST https://api.fastn.dev/api/v1/workflows/{workflowId}/execute
Authorization: Bearer $FASTN_API_KEY
Content-Type: application/json

{ "input": { ... } }
```

`FASTN_API_KEY` is read only on the server; it is never bundled into the frontend. The workspace id is **not** part of the execute URL — each connector needs its own published workflow id from the workflow's **API** tab.

| Variable | Purpose |
|---|---|
| `FASTN_WORKFLOW_HUBSPOT` | Workflow that creates a HubSpot ticket |
| `FASTN_WORKFLOW_SLACK` | Workflow that posts the channel alert |
| `FASTN_WORKFLOW_GMAIL` | Workflow that sends the follow-up email |
| `FASTN_WORKFLOW_SHEETS` | Workflow that appends the audit row |
| `FASTN_WORKFLOW_TWILIO` | Optional inbound-call workflow (not used for outbound dispatch) |
| `FASTN_MODE` | `auto` (default), `live` or `simulated` |
| `FASTN_TIMEOUT_MS` | Per-workflow timeout, 1000–25000 ms (default 7000) |
| `FASTN_ENV` | Optional `x-fastn-env` header value |

**Dispatch input** sent to every workflow:

```json
{
  "input": {
    "tenantId": "tenant-a",
    "tenantName": "Tenant A (Acme Corp)",
    "connector": "hubspot",
    "callerName": "Alex Rivers",
    "callerContact": "+1 (555) 321-9876",
    "rawQuery": "…",
    "classification": { "category": "Emergency", "priority": "urgent", "summary": "…" },
    "dispatch": { "id": "disp_…", "timestamp": "2026-…" }
  }
}
```

Each request also carries `x-end-org-ref: <tenantId>` so workflows can scope to the right customer. Test keys (`fsk_test_…`) automatically send `X-fastn-Test-Mode: true`.

**Expected workflow output** (the dispatcher refuses to claim success without a confirmation):

| Connector | Confirmed by |
|---|---|
| HubSpot | `ticketId`, `ticket_id` or `id` |
| Slack | `channel`, `channelId`, `reference` or `id` |
| Gmail | `messageId` / `message_id` / `id`, or `{ "ok": true }` |
| Sheets | `rowId` / `row_id` / `id`, or `{ "ok": true }` |

**Modes and outcomes**

- `auto` — live when at least one `FASTN_WORKFLOW_*` id is configured, otherwise simulated.
- `live` — every enabled connector must have a workflow id; a missing id is a per-connector failure, never a fake success.
- `simulated` — no FastN call is made; every result is labelled `mode: "simulated"` and the UI shows a **Sandbox** badge.
- HTTP `202` means FastN queued the run; the connector is recorded as `pending` because FastN documents no polling endpoint for queued executions.
- The log status becomes `dispatched` only when every target succeeded, `partial` when some failed or are pending, and `failed` when nothing completed. The API returns `201` with `success: false` for a failed dispatch.

**Required FastN key scope:** the API key must include workflow execution (`workflows.execute`). A key without it returns `403 Permission denied by API key`; the backend surfaces that as a connector failure with the required permission in the detail. Workflows must also be **published**, otherwise FastN returns `WORKFLOW_NOT_PUBLISHED`.

---


## Deploy to Vercel

The repository ships with a root [`vercel.json`](./vercel.json) that declares two services:

- **`frontend`** — Vite build published from `frontend/dist`
- **`backend`** — Express API built from `backend/Dockerfile` (container runtime)

`/api/*` routes to the backend container; every other request goes to the frontend. The container image installs its own dependencies, so the API does not depend on Vercel's dependency tracing.

### Option A — CLI (fastest)

```bash
vercel login
vercel link --project aivoicedispatcher   # one-time
vercel --prod
```

The project is already deployed at **https://aivoicedispatcher.vercel.app** (Vercel account `chendline`, project `aivoicedispatcher`). The GitHub repository is connected, so pushes to `main` deploy to production automatically and other branches produce Preview deployments. `vercel --prod` remains available for manual deploys.

### Option B — Dashboard

1. **Add New → Project** and import `Chendline/ai-voice-dispatcher`.
2. Keep the root directory as `./` — `vercel.json` defines both services.
3. Add `VITE_API_BASE_URL=/` for **Production** and **Preview** so the frontend calls the same-origin API (already configured on the live project).
4. Deploy.

### Domain

The live project uses Vercel's free default domain: **https://aivoicedispatcher.vercel.app**. No custom domain is configured or required. Vercel assigns the production alias automatically on deploy; `frontend/index.html` canonical/OG tags already point at it.

If you later want a custom domain, register one and add it under **Project → Settings → Domains**; no code changes are needed because `VITE_API_BASE_URL=/` keeps API calls same-origin.

### Deploying the API

The API runs in the same Vercel project as a container service defined by [`backend/Dockerfile`](./backend/Dockerfile). The image builds TypeScript in a first stage and ships production dependencies in the runtime stage. `vercel.json` routes `/api/*` to it.

Set `VITE_API_BASE_URL=/` for Production and Preview so the built frontend calls that same-origin API. Without it, the frontend stays in sandbox mode.

To host the API separately instead (Render, Railway, Fly.io, any Node 20 host):

```bash
cd backend
npm install
npm run build
npm start
```

Then set `VITE_API_BASE_URL=https://your-api-host` in Vercel and redeploy. Keep `FRONTEND_URL` on the API set to your public domain so CORS stays scoped.

> Dispatch logs and connector toggles are mirrored to a private Vercel Blob store (`tenants/<tenantId>.json`) whenever `BLOB_READ_WRITE_TOKEN` is present, so they survive container restarts and scale-out. Without that token the API degrades to memory-only state. The seeded tenants always remain available.

---

## Project Structure

```
ai-voice-dispatcher/
├── backend/
│   ├── src/
│   │   ├── main.ts               # Startup, config warnings, HTTP listen
│   │   ├── app.ts                # Express app factory, routes, validation, limits
│   │   ├── config.ts             # FastN env parsing, workflow ids, live/simulated mode
│   │   ├── fastn.ts              # Workflow execute client, timeout, error taxonomy
│   │   ├── connectors.ts         # Per-connector dispatch, result mapping, status
│   │   ├── validation.ts         # Dispatch and integration payload validation
│   │   ├── classifier.ts         # Claude classifier with heuristic fallback
│   │   ├── persistence.ts        # Vercel Blob hydration & persistence
│   │   └── tenantStore.ts        # Tenant store & isolation logic
│   ├── test/                     # node:test suites (config, FastN, connectors, API)
│   ├── Dockerfile                # Multi-stage container build for Vercel
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── public/favicon.svg        # Branded browser tab icon
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts            # Live API client with sandbox fallback
│   │   │   └── demoStore.ts      # Session-scoped in-browser tenant vault
│   │   ├── utils/soundEffects.ts # Web Audio procedural synthesis
│   │   ├── types.ts              # Shared frontend domain types
│   │   ├── App.tsx               # Dashboard, tabs, simulator, stream
│   │   ├── App.css               # Component styling & motion
│   │   ├── index.css             # Organic tokens & Lenis styles
│   │   └── main.tsx
│   ├── index.html                # SEO, Open Graph, favicon, fonts
│   ├── package.json
│   └── vite.config.ts
├── vercel.json                   # Vercel services config (frontend + container API)
├── .env.example
├── README.md
├── AGENTS.md
└── SPECSHEET.md
```

---

## Team

- Muhammad Aqil
- Rihix ([@rihix](https://github.com/rihix))

## License

MIT
