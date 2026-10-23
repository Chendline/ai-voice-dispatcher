# AGENTS.md

## CONTEXT & GOAL
Repo: `ai-voice-dispatcher`
Target: FastN Online Hackathon 2026.
System: Multi-tenant SaaS embedding AI voice dispatch. Inbound call/form -> AI classify -> trigger FastN connectors (HubSpot, Slack, Gmail, Sheets, Twilio). Isolated per tenant.

## TECH STACK
- Frontend: React 19, Vite, TypeScript. Port 5173.
- Backend: Node.js, Express, TypeScript, tsx. Port 3001.
- Middleware: FastN SDK / iframe widget.
- AI: Claude via API / FastN workflow.

## SKILLS INSTALLED (.agents/skills)
- `apple-design`: Polish UI, fluid motion, spring mechanics, typography, dark mode ergonomics.
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
   - Frontend changes -> maintain responsive grid, tenant switcher state, live log updates.
6. React 19 Watch-out: Ensure third-party UI libs/dependencies are React 19 compatible before npm install.
7. Git Rules: NEVER push, PR, or merge without explicit user permission. ALWAYS use separate feature branches (`feat/*`, `fix/*`). Zero direct pushes to main.

## DIRECTORY STRUCTURE
```
.
├── .agents/skills/    # Installed agent skills (apple-design, emil-design-eng, shadcn)
├── backend/
│   ├── src/
│   │   ├── index.ts        # Express API, dispatch trigger, tenant endpoints
│   │   └── tenantStore.ts  # In-memory tenant state, isolation logic, default seed
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # Dashboard UI, tenant switcher, form sim, log feed
│   │   ├── App.css         # Component styling & glassmorphism
│   │   ├── index.css       # Design tokens, theme colors
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── .env.example            # FASTN_API_KEY, FASTN_WORKSPACE_ID, CLAUDE_API_KEY
├── README.md               # User-facing summary & submission checklist
├── AGENTS.md               # Agent operational runbook (this file)
└── SPECSHEET.md            # Technical specs & progress tracker
```

## COMMON AGENT PITFALLS
- Backend port conflict: Backend default port is 3001; frontend proxies/fetches `http://localhost:3001`. Do not hardcode 3000.
- State loss on backend reload: `tenantStore.ts` is in-memory. Dev server restart resets logs to empty and tenant integrations to defaults. Keep seed data intact.
- Missing tenantId in payload: All POST requests to `/api/dispatch/trigger` require `tenantId` and `rawQuery`.
