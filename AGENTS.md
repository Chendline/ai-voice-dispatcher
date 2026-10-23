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
npm run dev      # runs tsx watch src/index.ts on :3001
npm run build    # tsc -> dist/

# Frontend
cd frontend
npm install
npm run dev      # vite dev server on :5173
npm run build    # tsc -b && vite build
npm run lint     # oxlint
```

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
   - Backend changes -> update `backend/src/tenantStore.ts` and `backend/src/index.ts`.
   - Frontend changes -> follow the Component Map below.
6. React 19 Watch-out: Ensure third-party UI libs/dependencies are React 19 compatible before npm install.
7. Git Rules: NEVER push, PR, or merge without explicit user permission. ALWAYS use separate feature branches (`feat/*`, `fix/*`). Zero direct pushes to main.

---

## CODEBASE ATLAS & NAVIGATION MAP
*Use this index as files grow larger to locate exact logic, styles, and audio hooks without hunting.*

### 1. Frontend Component & Logic Map (`frontend/src/App.tsx`)
- **Lines 1–38**: Type interfaces (`IntegrationStatus`, `Tenant`, `DispatchLog`).
- **Lines 39–68**: `PRESET_SCENARIOS` constant array (Critical DB Outage, Invoice Overcharge, Fleet Route Lost, Enterprise Demo).
- **Lines 70–95**: Core state variables:
  - `activeTenantId`: `'tenant-a' | 'tenant-b'`
  - `tenantData`: Current tenant metadata + 5 integrations status.
  - `logs`: Current tenant's dispatch event list.
  - `callerName`, `callerContact`, `rawQuery`: Simulation form state.
  - `isDispatching`, `dispatchStage`: 4-step pipeline animation state (1=Twilio, 2=Claude, 3=Router, 4=Connectors).
  - `selectedCategory`, `searchQuery`: Event filtering state.
  - `expandedLogId`: JSON payload inspector toggle.
  - `activeTab`: `'simulator' | 'connectors'`.
- **Lines 96–120**: `Lenis` smooth scroll setup with `requestAnimationFrame` loop and cleanup.
- **Lines 121–150**: Data fetch hooks (`/api/tenants`, `/api/tenants/:id`, `/api/tenants/:id/logs`).
- **Lines 151–215**: Interaction handlers:
  - `handleApplyPreset()`: Populates form + fires `playTap()`.
  - `handleTriggerDispatch()`: Fires `playDispatchLaunch()`, triggers step progression timers with `playStepTick(1-4)`, posts to backend, updates state, and fires `playDispatchComplete()`.
  - `handleCopyId()`: Copies event ID + fires `playTap()`.
- **Lines 220–285**: **Header Navigation & Segmented Tenant Switcher**:
  - Apple-style sliding pill track, status indicator dot, and isolation badge.
  - Fires `playSwitch()` on tenant click.
- **Lines 286–550**: **Left Panel (Simulator & Connectors)**:
  - Subnav tabs (Voice Simulation vs FastN Connectors).
  - Live audio waveform bars (`.wave-bar.bar-1..5`).
  - Quick preset scenario chips.
  - Voice form inputs + 4-step stepper (`.dispatch-stepper`).
  - Copper dispatch trigger button (`.dispatch-button`).
  - Connectors view: HubSpot, Slack, Gmail, Sheets, Twilio status rows.
  - Metrics strip (Dispatched count, Connectors count, 100% Isolation badge).
- **Lines 551–774**: **Right Panel (Live Event Stream)**:
  - Stream header + Category filter pills (All, Emergency, Tech, Billing, Sales).
  - Filter search bar.
  - Empty stream placeholder state.
  - Event cards (`.event-card`): category pill, priority tag, timestamp, caller initials avatar, speech quote blockquote, connector dispatch badges.
  - Expandable JSON payload trace inspector (`.payload-inspector`).

### 2. Audio-Haptic Engine (`frontend/src/utils/soundEffects.ts`)
- Zero-dependency Web Audio API synthesizer. Auto-resumes on first pointer interaction.
- `playTap()`: Tactile downward chirp (520Hz → 180Hz, 45ms). Used for tabs, presets, filters, copy, and expand buttons.
- `playSwitch()`: Dual-transient mechanical switch (320Hz → 140Hz triangle + 540Hz sine). Used for tenant switching.
- `playDispatchLaunch()`: Ascending warm sine ramp (260Hz → 580Hz, 140ms). Used on voice simulation submit.
- `playStepTick(stepIndex)`: Pentatonic acoustic ticks (440Hz, 523Hz, 659Hz, 784Hz). Used across the 4 pipeline steps.
- `playDispatchComplete()`: Warm triad chord chime (587Hz, 740Hz, 880Hz, 300ms tail). Used on successful dispatch logging.

### 3. Styling & Color Tokens (`frontend/src/index.css` & `frontend/src/App.css`)
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

### 4. Backend Engine (`backend/src`)
- `tenantStore.ts`:
  - `TenantStore` class holding `Map<string, Tenant>`.
  - Seeded accounts for `tenant-a` (Acme Corp) and `tenant-b` (Nexus Logistics).
  - All operations strictly indexed by `tenantId`.
- `index.ts`:
  - `GET /api/tenants`: Returns list of tenants.
  - `GET /api/tenants/:tenantId`: Returns tenant status + 5 connected integration states.
  - `POST /api/tenants/:tenantId/integrations/:integrationId`: Toggles or updates account details.
  - `POST /api/dispatch/trigger`: Ingests speech, classifies category & priority, triggers mock connector outputs, appends to tenant's log stream.
  - `GET /api/tenants/:tenantId/logs`: Returns tenant-isolated dispatch history.

---

## DIRECTORY STRUCTURE
```
.
├── .agents/skills/          # Installed agent skills (apple-design, emil-design-eng, shadcn)
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express API, dispatch trigger, tenant endpoints
│   │   └── tenantStore.ts        # In-memory tenant store, isolation logic, dual seed
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── utils/
│   │   │   └── soundEffects.ts   # Web Audio procedural sound engine (zero assets)
│   │   ├── App.tsx               # Primary dashboard, simulator, live stream
│   │   ├── App.css               # Component styling, animations, waveform keyframes
│   │   ├── index.css             # Organic color tokens, Lenis styles, scrollbars
│   │   └── main.tsx
│   ├── index.html                # App title, font preconnects, meta theme-color
│   ├── package.json              # React 19, Lenis, TypeScript, Vite
│   └── vite.config.ts
├── .env.example                  # FASTN_API_KEY, FASTN_WORKSPACE_ID, CLAUDE_API_KEY
├── README.md                     # User-facing summary & submission checklist
├── AGENTS.md                     # Agent operational runbook & codebase atlas (this file)
└── SPECSHEET.md                  # Technical specs, architecture & progress tracker
```

## COMMON AGENT PITFALLS
- Backend port conflict: Backend default port is 3001; frontend proxies/fetches `http://localhost:3001`. Do not hardcode 3000.
- State loss on backend reload: `tenantStore.ts` is in-memory. Dev server restart resets logs to empty and tenant integrations to defaults. Keep seed data intact.
- Missing tenantId in payload: All POST requests to `/api/dispatch/trigger` require `tenantId` and `rawQuery`.
- Audio autoplay policy: AudioContext must be unlocked via user pointer gesture (handled in `soundEffects.ts`).
