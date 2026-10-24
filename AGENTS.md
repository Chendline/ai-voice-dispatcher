# AGENTS.md

## CONTEXT & GOAL
Repo: `ai-voice-dispatcher`
Target: FastN Online Hackathon 2026.
System: Multi-tenant SaaS embedding AI voice dispatch. Inbound call/form -> AI classify -> trigger FastN connectors (HubSpot, Slack, Gmail, Sheets, Twilio). Isolated per tenant.

## TECH STACK
- Frontend: React 19, Vite, TypeScript, Lenis Smooth Scroll. Port 5173.
- Backend: Node.js, Express, TypeScript, tsx. Port 3001.
- Audio Engine: Zero-dependency Web Audio API procedural synthesis.
- Middleware: FastN SDK / iframe widget.
- AI: Claude via API / FastN workflow.

## SKILLS INSTALLED (.agents/skills)
- `apple-design`: Polish UI, fluid motion, spring mechanics, typography, optical ergonomics.
- `emil-design-eng`: Micro-interactions, layout craft, interaction states, UI physics.
- `shadcn`: Component patterns, registry management, theme config, Radix/Base UI.
Rule: Consult skill files before writing new UI or animation code.

## RUN & BUILD COMMANDS
```bash
# Backend
cd backend
npm install
npm run dev      # runs tsx watch src/main.ts on :3001
npm run build    # tsc -> dist/main.js

# Frontend
cd frontend
npm install
npm run dev      # vite dev server on :5173
npm run build    # tsc -b && vite build
npm run lint     # oxlint

# Deploy (from repo root; linked to chendline/aivoicedispatcher)
vercel --prod
```

Live: https://aivoicedispatcher.vercel.app

## AGENT OPERATING DIRECTIVES
1. Zero Fluff: Code and docs stay compact. No unnecessary comments.
2. Tenant Isolation: Every DB read/write/trigger MUST scope to `tenantId`. Never leak Tenant A data to Tenant B.
3. Two-Tenant Test Compliance: Code must always support dual tenant verification (Tenant A = Acme Corp, Tenant B = Nexus Logistics). Each tenant connects distinct accounts.
4. FastN Connectors: Target 5 required integrations:
   - `hubspot` (tickets/contacts)
   - `slack` (channel alerts)
   - `gmail` (followup emails)
   - `sheets` (audit logging)
   - `twilio` (voice ingestion trigger)
5. Modifying Code:
   - Backend changes -> update `backend/src/tenantStore.ts` and `backend/src/main.ts`.
   - Frontend changes -> follow the Component Map below.
6. React 19 Watch-out: Ensure third-party UI libs/dependencies are React 19 compatible before npm install.
7. Git Rules: NEVER push, PR, or merge without explicit user permission. ALWAYS use separate feature branches (`feat/*`, `fix/*`). Zero direct pushes to main.

---

## CODEBASE ATLAS & NAVIGATION MAP
*Use this index as files grow larger to locate exact logic, styles, and audio hooks without hunting.*

### 1. Frontend Component & Logic Map (`frontend/src/App.tsx`, ~1,110 lines)
- **Lines 1–30**: Imports, tab/category constants, `DEFAULT_TENANTS`.
- **Lines 31–86**: `PRESET_SCENARIOS` constant array (Critical DB Outage, Invoice Overcharge, Fleet Route Lost, Enterprise Demo) + URL/deep-link helpers.
- **Lines 132–170**: Core state: active tenant, tenant data, logs, loading/mode, simulation form, pipeline animation, filters, active workspace tab.
- **Lines 171–248**: Lenis setup (skips reduced motion), URL sync (`?tenant=&tab=`), tenant directory bootstrap, isolated vault loading with cancellation guards.
- **Lines 250–452**: Interaction handlers:
  - `handleApplyPreset()`, `handleTriggerDispatch()` (in-flight tenant guard, step ticks, completion chime), `handleToggleIntegration()` (optimistic connector switch), `handleCopyId()`.
  - `handleWorkspaceKeyDown()` / `handleTenantKeyDown()`: Arrow/Home/End tab navigation with focus handoff.
  - `handleResetSandbox()`: clears the session vault in demo mode.
- **Lines 455–526**: **Header**: brand, API/sandbox mode pill, vault status, sliding segmented tenant tabs.
- **Lines 528–825**: **Left Panel**: accessible subnav tabs, voice waveform, presets, form, stepper, connector toggles/skeletons, metrics strip.
- **Lines 826–1083**: **Right Panel**: category filters, search, loading/empty/no-match states, event cards, JSON payload inspector.
- **Lines 1085–1112**: Footer with domain-ready attribution and sandbox reset.

### 2. Client Data Layer (`frontend/src/lib`, `frontend/src/types.ts`)
- `api.ts`: `VITE_API_BASE_URL` resolution, JSON/timeout client, live→sandbox fallback, tenant/log/dispatch/connector operations.
- `demoStore.ts`: session-scoped in-browser vault mirroring backend seeds, keyword classification, and connector routing. Keeps the static Vercel demo functional.
- `types.ts`: shared tenant, integration, dispatch log, tab, and connection-mode contracts.

### 3. Audio-Haptic Engine (`frontend/src/utils/soundEffects.ts`)
- Zero-dependency Web Audio API synthesizer. Auto-resumes on first pointer interaction.
- `playTap()`: Tactile downward chirp (520Hz → 180Hz, 45ms). Used for tabs, presets, filters, copy, and expand buttons.
- `playSwitch()`: Dual-transient mechanical switch (320Hz → 140Hz triangle + 540Hz sine). Used for tenant switching.
- `playDispatchLaunch()`: Ascending warm sine ramp (260Hz → 580Hz, 140ms). Used on voice simulation submit.
- `playStepTick(stepIndex)`: Pentatonic acoustic ticks (440Hz, 523Hz, 659Hz, 784Hz). Used across the 4 pipeline steps.
- `playDispatchComplete()`: Warm triad chord chime (587Hz, 740Hz, 880Hz, 300ms tail). Used on successful dispatch logging.

### 4. Styling & Color Tokens (`frontend/src/index.css` & `frontend/src/App.css`)
- **Color Palette (Refreshing Organic Aesthetic)**:
  - `--c-olive`: `#606c38` (Olive Leaf - badges, waveform, secondary text)
  - `--c-forest`: `#283618` (Black Forest - primary high-contrast text, active pills, headings)
  - `--c-cornsilk`: `#fefae0` (Cornsilk - warm organic background canvas, button text)
  - `--c-caramel`: `#dda15e` (Light Caramel - warm neutral tags, borders, accents)
  - `--c-copper`: `#bc6c25` (Copper - primary call-to-action button, focus rings, speech quotes)
- **Lenis Smooth Scroll**:
  - `html.lenis, html.lenis body { height: auto; }`
  - `.lenis.lenis-smooth { scroll-behavior: auto !important; }`
- **Surface Elevation**:
  - Base: Cornsilk (`#fefae0`) with ambient radial gradients.
  - Panels: Frosted white glass `rgba(255, 255, 255, 0.86)` with `backdrop-filter: blur(20px)`.
  - Specular sheen: `inset 0 1px 0 0 rgba(255, 255, 255, 0.95)`.

### 5. Backend Engine (`backend/src`)
- `tenantStore.ts`:
  - `TenantStore` class holding `Map<string, Tenant>`.
  - Seeded accounts for `tenant-a` (Acme Corp) and `tenant-b` (Nexus Logistics).
  - All operations strictly indexed by `tenantId`; connector pauses preserve channel identity.
  - `DispatchLog.actionsTaken` carries `mode` (`live|simulated`) and per-connector `results`.
- `config.ts`:
  - Reads `FASTN_API_KEY`, `FASTN_WORKSPACE_ID`, `FASTN_WORKFLOW_*`, `FASTN_MODE`, `FASTN_TIMEOUT_MS`, `FASTN_ENV`.
  - Resolves `auto|live|simulated`; `auto` is live only when a workflow id exists.
  - Rejects malformed workflow ids and non-HTTPS base URLs; collects warnings.
- `fastn.ts`:
  - Executes `POST /api/v1/workflows/{id}/execute` with bearer auth, `x-end-org-ref`, optional `x-fastn-env`.
  - Test keys add `X-fastn-Test-Mode: true`; timeout via `AbortController`.
  - Error taxonomy: `not_configured|unauthorized|forbidden|not_found|not_published|rate_limited|timeout|network|invalid_response|upstream_error`.
  - `202` is queued; sanitizes details and redacts the API key.
- `connectors.ts`:
  - Fans out to connected HubSpot/Slack/Gmail/Sheets only.
  - Live mode requires a workflow per connector; missing ids fail explicitly.
  - Maps workflow output (`ticketId`, `channel`, `messageId`, `rowId`, `ok`) into references.
  - Aggregates `dispatched|partial|failed`; never reports fake success.
- `validation.ts`: dispatch/integration payload validation (tenant id, query length, boolean flags).
- `app.ts`:
  - `createApp(deps)` factory for tests (store, executor, hydrate/persist, rate limit).
  - Helmet, CORS via `FRONTEND_URL`, 64kb JSON limit, 120 req/min/IP rate limit (health exempt).
  - Routes: health, tenant directory/detail, integration toggle, dispatch trigger, tenant logs.
  - Sanitized 400/404/413/500 responses; no stack traces or secrets.
- `main.ts`: loads config, logs warnings, starts the server on `:3001`.
- `persistence.ts`: Vercel Blob hydration/persistence per tenant.
- `backend/test/`: `node:test` via `tsx --test`; mocked FastN fetch plus real ephemeral HTTP route tests.

---

## DIRECTORY STRUCTURE
```
.
├── .agents/skills/          # Installed agent skills (apple-design, emil-design-eng, shadcn)
├── backend/
│   ├── src/
│   │   ├── app.ts                # Express app factory, routes, validation, rate limit, CORS
│   │   ├── classifier.ts         # Claude API classifier + heuristic fallback
│   │   ├── config.ts             # FastN env parsing, workflow ids, live/simulated mode
│   │   ├── connectors.ts         # Per-connector dispatch, output mapping, status
│   │   ├── fastn.ts              # FastN workflow execute client, timeout, error taxonomy
│   │   ├── main.ts               # Startup, config warnings, listen
│   │   ├── persistence.ts        # Vercel Blob hydration/persistence for tenant state
│   │   ├── tenantStore.ts        # Tenant store, isolation logic, dual seed
│   │   └── validation.ts         # Dispatch/integration payload validation
│   ├── test/                     # node:test suites (config, fastn, connectors, api)
│   ├── Dockerfile                # Multi-stage container build (Vercel backend service)
│   ├── .dockerignore
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── public/
│   │   └── favicon.svg           # Branded browser tab icon
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts            # Live API client + automatic sandbox fallback
│   │   │   └── demoStore.ts      # Session-scoped in-browser tenant vault
│   │   ├── utils/
│   │   │   └── soundEffects.ts   # Web Audio procedural sound engine (zero assets)
│   │   ├── types.ts              # Shared frontend domain contracts
│   │   ├── App.tsx               # Primary dashboard, simulator, tabs, live stream
│   │   ├── App.css               # Component styling, animations, waveform keyframes
│   │   ├── index.css             # Organic color tokens, Lenis styles, scrollbars
│   │   └── main.tsx
│   ├── index.html                # Title, favicon, SEO/OG meta, font preconnects
│   ├── package.json              # React 19, Lenis, TypeScript, Vite
│   └── vite.config.ts
├── .env.example                  # FASTN_*, CLAUDE_*, VITE_API_BASE_URL
├── vercel.json                   # Vercel services config (frontend service + routing)
├── README.md                     # User-facing summary, domain & deploy guide
├── AGENTS.md                     # Agent operational runbook & codebase atlas (this file)
└── SPECSHEET.md                  # Technical specs, architecture & progress tracker
```

## COMMON AGENT PITFALLS
- Backend port conflict: Backend default port is 3001; frontend proxies/fetches `http://localhost:3001`. Do not hardcode 3000.
- State loss without storage: `tenantStore.ts` keeps state in memory, but `persistence.ts` mirrors each tenant to Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set. Local dev without the token resets logs/toggles on restart. Keep seed data intact.
- Missing tenantId in payload: All POST requests to `/api/dispatch/trigger` require `tenantId` and `rawQuery`.
- Audio autoplay policy: AudioContext must be unlocked via user pointer gesture (handled in `soundEffects.ts`).
- Vercel is full-stack: `vercel.json` declares a Vite `frontend` service and a containerized Express `backend` service; `/api/*` routes to the backend, everything else to the frontend. The live project sets `VITE_API_BASE_URL=/` so the built frontend calls the same-origin API. Without that env var, production falls back to `demoStore.ts` sandbox mode.
- Container state is durable via Vercel Blob: each write persists `{ integrations, dispatchLogs }` to `tenants/<tenantId>.json` in the private `aivoicedispatcher-logs` store. If `BLOB_READ_WRITE_TOKEN` is missing the API falls back to memory-only and state resets on restart. Do not assume the API and browser sandbox logs stay identical.
- Custom domain is intentionally not configured: production runs on the free Vercel alias `aivoicedispatcher.vercel.app`. Keep canonical/OG tags and docs on that host; no purchase is required.
- Sandbox data is sessionStorage-scoped: demo logs/connector pauses survive reload but not a new browser tab/session. The footer "Reset sandbox" clears them.
- Tab state lives in the URL: `?tenant=tenant-a|tenant-b&tab=simulator|connectors`. Do not remove `replaceState` sync or deep links regress.
- Tenant switches replace the vault snapshot keyed by `tenantId`; never render `tenantData`/`logs` unless `vault.tenantId === activeTenantId`. Preserve the snapshot guard and `activeTenantRef` dispatch guard to avoid cross-tenant bleed.
- FastN has no generic connector-action endpoint: live dispatch runs published workflows via `POST /api/v1/workflows/{id}/execute`. The API key must include `workflows.execute`; without it FastN returns `403` and the connector is recorded as failed. Workflow ids are not discoverable from the documented API — copy them from each workflow's API tab.
- FastN `auto` mode is simulated until at least one `FASTN_WORKFLOW_*` id exists. Never label simulated results as live: `actionsTaken.mode` must stay truthful and the UI shows a Sandbox badge.
- FastN `202` means queued, not done. There is no documented polling endpoint, so queued connectors stay `pending` and the log becomes `partial`, never `dispatched`.
- Frontend API errors: structured `ApiError` responses (4xx/5xx) must propagate to the UI. Only network/timeout/non-JSON failures may fall back to `demoStore.ts`; falling back after a real connector failure would fabricate success.
