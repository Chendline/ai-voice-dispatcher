# AEGIS · AI Voice Agent Dispatcher

A multi-tenant SaaS platform where businesses embed an AI-powered voice dispatch agent into their own product. Each customer connects their own communication and CRM tools through FastN — the agent handles call routing, ticket creation, notifications, and logging automatically.

Built for the **FastN Online Hackathon 2026**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Chendline/ai-voice-dispatcher&project-name=aivoicedispatcher&repository-name=ai-voice-dispatcher)

**Live demo target:** [aivoicedispatcher.vercel.app](https://aivoicedispatcher.vercel.app)
**Custom domain:** [aivoicedispatcher.com](https://aivoicedispatcher.com) (recommended upgrade)

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
- **Two-tenant complete isolation** — Tenant A never sees or modifies Tenant B's data, connectors, or event feed.
- **Tactile UI/UX** — Apple Design and Emil Kowalski design engineering principles, Lenis smooth scrolling, and zero-dependency Web Audio feedback.
- **Shareable workspace state** — `?tenant=tenant-b&tab=connectors` deep links restore the exact vault and tab.
- **Resilient public demo** — if the Express API is unreachable (for example a static Vercel deploy), the frontend switches to an in-browser sandbox vault instead of breaking.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React 19, TypeScript, Vite, Lenis Smooth Scroll |
| Backend | Node.js, Express, TypeScript, `tsx` |
| Audio Engine | Zero-dependency Web Audio API procedural synthesis |
| Integrations Platform | FastN (embedded connectors & routing) |
| AI Classifier | Claude Messages API + heuristic fallback |
| Deployment | Vercel (static frontend), optional Node host for the API |

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
CLAUDE_API_KEY=your_claude_api_key_here
CLAUDE_MODEL=claude-3-5-haiku-latest
PORT=3001
FRONTEND_URL=http://localhost:5173
```

For a split frontend/API deployment, set `VITE_API_BASE_URL` in the Vercel project:

```env
VITE_API_BASE_URL=https://your-api-host.example.com
```

Without `CLAUDE_API_KEY`, classification falls back to the deterministic keyword engine. Without `VITE_API_BASE_URL`, the production build uses its in-browser sandbox.

---

## Deploy to Vercel

The repository ships with a root [`vercel.json`](./vercel.json) that builds the frontend and publishes `frontend/dist`.

### Option A — CLI (fastest)

```bash
npx vercel login
npx vercel link          # create a project named: aivoicedispatcher
npx vercel --prod
```

Vercel assigns `https://aivoicedispatcher.vercel.app` when that project name is available. If it is taken, use `aivoicedispatcher-app` or `aegis-voice-dispatcher`.

### Option B — Dashboard

1. **Add New → Project** and import `Chendline/ai-voice-dispatcher`.
2. Keep the root directory as `./` — `vercel.json` supplies the install/build commands.
3. Add `VITE_API_BASE_URL` only if you host the Express backend separately.
4. Deploy.

### Custom domain

1. Register `aivoicedispatcher.com` (verify availability at your registrar).
2. In Vercel: **Project → Settings → Domains → Add**.
3. Add both the apex domain and `www`, then follow the DNS records Vercel shows (nameservers or `A`/`CNAME`).

Alternative names: `aegis-voice-dispatcher.vercel.app`, `aegisdispatch.com`, `aivoicedispatch.ai`.

### Deploying the API

The Vercel configuration is intentionally static, so the public demo always works. To run the full live API, deploy `backend/` to Render, Railway, Fly.io, or any Node 20 host:

```bash
cd backend
npm install
npm run build
npm start
```

Then set `VITE_API_BASE_URL=https://your-api-host` in Vercel and redeploy. Keep `FRONTEND_URL` on the API set to your public domain so CORS stays scoped.

---

## Project Structure

```
ai-voice-dispatcher/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express API server (port 3001) + health probe
│   │   ├── classifier.ts         # Claude classifier with heuristic fallback
│   │   └── tenantStore.ts        # In-memory tenant store & isolation logic
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
├── vercel.json                   # One-click static deployment
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
