# AI Voice Agent Dispatcher

A multi-tenant SaaS platform where businesses embed an AI-powered voice dispatch agent into their own product. Each customer connects their own communication and CRM tools through FastN — the agent handles call routing, ticket creation, notifications, and logging automatically.

Built for the **FastN Online Hackathon 2026**.

---

## What it does

The AI Voice Agent Dispatcher lets businesses give their customers a smart voice agent that can:

- **Receive Inbound Voice Requests**: Real-time simulation with active audio waveform and preset enterprise scenarios.
- **Classify & Route**: Automatic intent classification into Emergency, Technical Support, Billing, and Sales Inquiry.
- **FastN Multi-Tenant Connector Dispatch**:
  - **HubSpot**: Automatically generates customer support ticket with unique ID.
  - **Slack**: Sends targeted emergency notifications to tenant channels (e.g. `#acme-dispatch` vs `#nexus-alerts`).
  - **Gmail**: Sends dispatch receipt confirmation to the caller.
  - **Google Sheets**: Logs the interaction to the tenant's isolated audit ledger.
  - **Twilio**: Simulates voice call ingestion and telephone routing.
- **Two-Tenant Complete Isolation**: Verified dual-tenant switching (Acme Corp vs Nexus Logistics) where Tenant A never sees or modifies Tenant B's data or accounts.
- **Tactile UI/UX Ergonomics**: Built with Apple Design and Emil Kowalski design engineering principles, Lenis smooth scrolling, and zero-dependency Web Audio procedural sound effects.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React 19, TypeScript, Vite, Lenis Smooth Scroll |
| Backend | Node.js, Express, TypeScript, `tsx` |
| Audio Engine | Zero-dependency Web Audio API procedural synthesis |
| Integrations Platform | FastN (embedded connectors & routing) |
| AI Classifier | Claude AI pipeline / FastN workflow |
| Installed Skills | Apple Design, Emil Design Engineering, shadcn |

---

## Design System & Refreshing Organic Aesthetic

- **Color Palette**:
  - `Cornsilk` (`#fefae0`): Sunlit, easy-going organic canvas background
  - `Black Forest` (`#283618`): Deep pine green for high-contrast typography & active controls
  - `Olive Leaf` (`#606c38`): Soft herbal green for waveform bars, category tags & secondary text
  - `Light Caramel` (`#dda15e`): Warm amber neutral for badges, borders & accents
  - `Copper` (`#bc6c25`): Terracotta copper for primary action buttons & focus rings
- **Micro-Interactions**:
  - Dynamic audio waveform visualizer bars
  - Apple-style segmented control tenant switcher with isolation status badge
  - 4-step dispatch progress stepper (Twilio → Claude → Router → Connectors)
  - Real-time event log stream with expandable JSON payload trace inspector

---

## Two-Tenant Test

The system passes the hackathon dual-tenant verification:

1. **Tenant A (Acme Corp)**: Connected to `#acme-dispatch`, `support@acmecorp.com`, and Acme Sheet.
2. **Tenant B (Nexus Logistics)**: Connected to `#nexus-alerts`, `dispatch@nexuslogistics.io`, and Nexus Fleet Sheet.
3. **Zero Data Bleed**: Dispatching an event for Tenant A immediately routes through Acme channels and never displays in Tenant B's feed or database.

---

## Project Structure

```
ai-voice-dispatcher/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express API server (port 3001)
│   │   └── tenantStore.ts        # In-memory tenant store & isolation logic
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── utils/
│   │   │   └── soundEffects.ts   # Web Audio procedural synthesis engine
│   │   ├── App.tsx               # Primary dashboard UI & simulator
│   │   ├── App.css               # Component styling & waveform keyframes
│   │   ├── index.css             # Organic design tokens & Lenis styles
│   │   └── main.tsx
│   ├── index.html                # HTML entry point & typography preconnects
│   ├── package.json
│   └── vite.config.ts
├── .env.example                  # Environment variables template
├── README.md                     # User-facing summary (this file)
├── AGENTS.md                     # Codebase Atlas & agent runbook
└── SPECSHEET.md                  # Technical architecture & progress tracker
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup & Run

```bash
# 1. Clone the repository
git clone https://github.com/Chendline/ai-voice-dispatcher.git
cd ai-voice-dispatcher

# 2. Run the Backend (port 3001)
cd backend
npm install
npm run dev

# 3. In a new terminal, run the Frontend (port 5173)
cd ../frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Environment Variables

Copy `.env.example` to `.env` in the root directory:

```env
FASTN_API_KEY=your_fastn_api_key_here
FASTN_WORKSPACE_ID=your_fastn_workspace_id_here
CLAUDE_API_KEY=your_claude_api_key_here
PORT=3001
```

---

## Team

- Muhammad Aqil
- Rihix ([@rihix](https://github.com/rihix))

---

## License

MIT
