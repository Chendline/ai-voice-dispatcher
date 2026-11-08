# AEGIS

**AI voice conversations that end in a governed dispatch.**

AEGIS is an independent AI workspace for teams that need a conversation to produce an action, not just a reply. Connect your own model provider, configure an agent, talk or type, then review a structured dispatch before anything is sent to an HTTPS webhook or a Slack incoming webhook.

The product has two surfaces:

- **Landing page** at `/` — what AEGIS is, how it works, which providers it supports, and what it deliberately does not do.
- **Workspace** at `/app` — chat, voice sessions, dispatch workbench, agent configuration, providers, targets, speech settings, and history.

---

## Why AEGIS

Most AI chat products stop at text. Operational teams still have to copy the answer into a ticket, a channel, or an internal system. AEGIS keeps the conversation and the action in one loop:

1. The agent answers with the configured provider.
2. A separate dispatch planner turns an instruction into a reviewable plan.
3. A human approves the targets.
4. The server performs the HTTP request and records the real outcome.

There is no simulated connector success. A missing provider key, a rejected webhook, a timeout, and a skipped dispatch are all visible as different states.

### Who it is for

- Operations and support teams that route incidents through chat and webhooks.
- Teams that want to use their own model account instead of a bundled AI subscription.
- Developers who need a small, inspectable reference implementation of AI planning plus disciplined execution.
- Anyone evaluating voice-first workflows without buying a telephony or cloud-TTS contract.

---

## Features

### Multi-provider AI

A single adapter contract drives every provider. Agents store their own provider and model.

| Provider | Adapter | Example default | Key variable |
|---|---|---|---|
| Anthropic | Messages API | `claude-sonnet-4-5` | `ANTHROPIC_API_KEY` |
| OpenAI | Chat Completions | `gpt-4.1` | `OPENAI_API_KEY` |
| Google Gemini | `generateContent` | `gemini-2.5-pro` | `GOOGLE_API_KEY` |
| OpenRouter | OpenAI-compatible | `openai/gpt-4.1` | `OPENROUTER_API_KEY` |
| Groq | OpenAI-compatible | `llama-3.3-70b-versatile` | `GROQ_API_KEY` |
| Custom compatible | OpenAI-compatible | configurable | `AI_COMPATIBLE_API_KEY` |

- Provider keys are read only by the backend.
- Models can be chosen from the provider's known list or typed manually.
- `AI_DEFAULT_PROVIDER` / `AI_DEFAULT_MODEL` set the initial defaults.
- If no provider is configured, chat returns a clear configuration error. AEGIS does not generate a fake local model reply.

### Agents

Each agent owns:

- name and description;
- provider and model id;
- system prompt;
- temperature and max output tokens;
- default voice rate and pitch;
- suggested dispatch targets.

Agents can be created, edited, and deleted. At least one agent always remains.

### Chat and conversation history

- Server-side conversation storage with titles derived from the first user message.
- Resume any conversation from the history rail.
- Delete individual conversations.
- Dictate a message with the browser microphone.
- Model metadata and token usage are attached to assistant messages when the provider returns them.

### Voice

- **Input:** Web Speech API recognition (`SpeechRecognition` / `webkitSpeechRecognition`), with interim transcript feedback.
- **Output:** native `speechSynthesis`. Audio is synthesized locally on the device.
- Push-to-talk and optional hands-free turn taking.
- Per-agent rate and pitch, plus a global speed, pitch, and volume panel.
- Voice diagnostics: supported engine, voice count, local vs network voices, chunk progress, last error, and troubleshooting hints.
- No cloud TTS provider is configured or claimed.

### Governed dispatch

- **Plan:** the selected provider drafts a title, summary, priority, and suggested targets. If the provider is unavailable, a clearly labeled local rules planner is used instead.
- **Review:** every field can be edited; target selection is explicit.
- **Execute:** the backend posts the event server-side to each approved target.
- **Record:** per-target HTTP status, latency, sanitized detail, aggregate status, and a permanent log entry.

Supported target types:

| Type | Request |
|---|---|
| `webhook` | `POST` JSON with flat plan fields (`event`, `planId`, `title`, `summary`, `priority`, `instruction`, `source`, `createdAt`) |
| `slack` | Slack incoming webhook JSON (`text` only) |

Aggregate statuses are literal:

- `dispatched` — every selected target returned 2xx.
- `partial` — at least one target succeeded and at least one failed.
- `failed` — no target succeeded.
- `skipped` — no target was selected or available; nothing was sent.

### Safety and honesty

- Targets must be HTTPS by default. HTTP is only allowed when `DISPATCH_ALLOW_INSECURE=true` for local testing.
- URLs with credentials are rejected.
- Hostnames are DNS-checked and private / loopback / link-local addresses are rejected.
- Redirects are disabled.
- Requests have a hard timeout (`DISPATCH_TIMEOUT_MS`).
- Saved target URLs are write-only. The API returns only the host after saving.
- Provider and dispatch errors are sanitized; stack traces and secrets are never returned.
- Rate limits apply to all API routes and, more tightly, to AI and dispatch routes.

### Durable state (optional)

Without storage configuration, agents, conversations, targets, and logs live in memory and reset on restart. Set `BLOB_READ_WRITE_TOKEN` to persist a workspace snapshot to Vercel Blob. `AEGIS_STATE_ID` names the stored workspace.

**AEGIS is currently a single-workspace application.** There is no authentication yet, so it is not a multi-user SaaS. Do not expose it publicly with real credentials until authentication is added.

---

## Architecture

```
Browser
├── Landing page (React)
└── Workspace (React)
    ├── Chat panel ───────────────┐
    ├── Voice panel ──────────────┤
    ├── Dispatch workbench ───────┤
    ├── Agents panel ─────────────┤
    └── Settings panel ───────────┘
                 │ JSON over HTTP
                 ▼
Express API
├── Validation + rate limits + CORS + Helmet
├── Provider registry
│   ├── Anthropic adapter
│   ├── OpenAI adapter
│   ├── Google adapter
│   └── OpenAI-compatible adapter (OpenRouter, Groq, custom)
├── Chat service (conversation persistence + provider call)
├── Dispatch engine (plan → approve → execute → log)
├── Workspace store (agents, conversations, targets, logs)
└── Persistence (optional Vercel Blob snapshot)
                 │
                 ▼
External services
├── AI provider APIs
├── HTTPS webhook targets
├── Slack incoming webhooks
└── Vercel Blob (optional)
```

### Backend responsibilities

- Read and validate environment configuration.
- Hold provider credentials and dispatch URLs.
- Validate every request body.
- Build prompts and call provider adapters.
- Plan and execute dispatches.
- Persist workspace state when configured.
- Return safe public representations of targets and configuration.

### Frontend responsibilities

- Render the landing page and workspace.
- Manage interaction state, routing, and accessibility.
- Perform browser speech recognition and synthesis.
- Never receive provider keys or raw target URLs.
- Show real errors and outcomes; never invent success.

---

## Getting started

### Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- A modern browser (Chrome, Edge, or Safari) for voice features

### Install and run

```bash
# Backend — http://localhost:3001
cd backend
npm install
cp ../.env.example ../.env    # Windows: copy ..\.env.example ..\.env
npm run dev

# Frontend — http://localhost:5173
cd ../frontend
npm install
npm run dev
```

Open:

- Landing page: <http://localhost:5173/>
- Workspace: <http://localhost:5173/app>

The workspace needs the API. If the API is offline, it shows a connection gate instead of falling back to fabricated local data.

### Add a provider

1. Put one key in the root `.env`, for example:
   ```env
   ANTHROPIC_API_KEY=sk-ant-...
   ```
2. Restart the backend.
3. Open **Settings → AI providers** to confirm the key is present.
4. Open **Agents** and choose that provider for an agent.

Provider keys are never sent to the browser. The UI only reports whether a key exists.

### Add a dispatch target

1. Open **Settings → Dispatch targets**.
2. Choose `webhook` or `slack`.
3. Enter an HTTPS URL.
4. Save.
5. Use **Send test** to verify the endpoint.

A target can be paused without deleting it. Agents can reference targets as defaults, but execution always requires an explicit selection in the dispatch workbench.

---

## Environment variables

Copy `.env.example` to `.env` at the repository root. The backend loads it from `../.env`.

### Core

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | API port |
| `FRONTEND_URL` | `http://localhost:5173` | Comma-separated CORS origins |
| `VITE_API_BASE_URL` | dev: `http://localhost:3001` | Frontend API base. Use `/` when same-origin |
| `AI_DEFAULT_PROVIDER` | first configured | Preferred provider id |
| `AI_DEFAULT_MODEL` | provider default | Preferred model id |
| `AI_TIMEOUT_MS` | `45000` | Provider request timeout (1–60 s) |
| `DISPATCH_TIMEOUT_MS` | `8000` | Per-target timeout (1–60 s) |
| `DISPATCH_ALLOW_INSECURE` | `false` | Allow HTTP targets for local testing only |

### Providers

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_MODELS`, `ANTHROPIC_BASE_URL` | Anthropic adapter |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_MODELS`, `OPENAI_BASE_URL` | OpenAI adapter |
| `GOOGLE_API_KEY` (or `GEMINI_API_KEY`), `GOOGLE_MODEL`, `GOOGLE_MODELS`, `GOOGLE_BASE_URL` | Gemini adapter |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_MODELS`, `OPENROUTER_BASE_URL` | OpenRouter adapter |
| `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_MODELS`, `GROQ_BASE_URL` | Groq adapter |
| `AI_COMPATIBLE_NAME`, `AI_COMPATIBLE_BASE_URL`, `AI_COMPATIBLE_API_KEY`, `AI_COMPATIBLE_MODEL`, `AI_COMPATIBLE_MODELS` | Any OpenAI-compatible endpoint. HTTPS required; HTTP only for localhost |

`*_MODELS` accepts a comma-separated list. The provider default is always included.

### Storage

| Variable | Purpose |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Enables Vercel Blob persistence |
| `AEGIS_STATE_ID` | Workspace snapshot name, default `default` |

---

## API

All endpoints return JSON. Errors use `{ "error": "..." }` and may include a safe `code`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Service, storage, provider presence, target count |
| `GET` | `/api/workspace` | Full bootstrap: config, agents, conversations, targets, logs |
| `GET` | `/api/providers` | Public provider configuration |
| `GET` | `/api/agents` | List agents |
| `POST` | `/api/agents` | Create an agent |
| `PUT` | `/api/agents/:id` | Update an agent |
| `DELETE` | `/api/agents/:id` | Delete an agent (last agent is protected) |
| `GET` | `/api/conversations` | Conversation summaries |
| `POST` | `/api/conversations` | Create an empty conversation |
| `GET` | `/api/conversations/:id` | Full conversation |
| `DELETE` | `/api/conversations/:id` | Delete a conversation |
| `POST` | `/api/chat` | Send a message and receive an assistant reply |
| `POST` | `/api/dispatch/plan` | Build a plan from an instruction |
| `POST` | `/api/dispatch/execute` | Execute an approved plan |
| `GET` | `/api/dispatch/logs` | Dispatch history |
| `GET` | `/api/targets` | List targets (host only) |
| `POST` | `/api/targets` | Create a target |
| `PUT` | `/api/targets/:id` | Update a target |
| `DELETE` | `/api/targets/:id` | Delete a target |
| `POST` | `/api/targets/:id/test` | Send a test event |

### Dispatch payload

Execution sends this shape to webhook targets:

```json
{
  "event": "aegis.dispatch",
  "planId": "plan_...",
  "title": "Escalate eu-west outage",
  "summary": "Route the database outage to on-call.",
  "priority": "urgent",
  "instruction": "Original instruction",
  "source": "ai",
  "providerId": "anthropic",
  "modelId": "claude-sonnet-4-5",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

`source` is `"ai"` or `"rules"`, and `providerId`/`modelId` are only present when a model produced the plan. Requests also carry `x-aegis-event: aegis.dispatch` and `x-aegis-dispatch-id: <planId>` headers.

Slack targets receive the same plan as a plain `{ "text": "..." }` incoming-webhook message: bold title, summary, priority, and instruction.

---

## Testing

```bash
cd backend
npm test          # config, provider client, dispatch safety, chat, API routes
npm run build

cd ../frontend
npm test          # speech engine pure logic
npm run lint      # oxlint
npm run build     # type-check + Vite build + /app static fallback
```

Backend tests use Node's test runner through `tsx` and run without real network calls. The frontend speech tests run on Node's native TypeScript stripping, so `utils/tts.ts` must stay free of DOM-only top-level side effects.

---

## Deployment

The repository includes a root `vercel.json` with two services:

- `frontend` — Vite static build from `frontend/dist`.
- `backend` — Express container from `backend/Dockerfile`.

`/api/*` routes to the backend; all other paths route to the frontend. The build emits `dist/app/index.html` and `dist/404.html` so deep links such as `/app/settings` can boot the SPA on static hosts.

### Vercel

```bash
vercel link
vercel --prod
```

Set these for the production environment:

- `VITE_API_BASE_URL=/`
- `FRONTEND_URL=https://your-domain`
- At least one provider key
- Optionally `BLOB_READ_WRITE_TOKEN`

### Any Node host

```bash
cd backend
npm install
npm run build
npm start
```

Then build and serve `frontend/dist` with any static server, and set `VITE_API_BASE_URL` to the API origin before building.

---

## Project structure

```
aegis/
├── backend/
│   ├── src/
│   │   ├── app.ts             # Express app factory, routes, middleware
│   │   ├── chat.ts            # Conversation turn + provider call
│   │   ├── config.ts          # Environment parsing and public config
│   │   ├── dispatch.ts        # URL safety, planning, execution, results
│   │   ├── main.ts            # Startup
│   │   ├── persistence.ts     # Optional Vercel Blob snapshot
│   │   ├── providers/
│   │   │   ├── anthropic.ts
│   │   │   ├── google.ts
│   │   │   ├── openai.ts
│   │   │   ├── registry.ts
│   │   │   └── types.ts
│   │   ├── store.ts           # Workspace state
│   │   ├── types.ts
│   │   └── validation.ts
│   ├── test/
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── scripts/postbuild.mjs  # /app and 404 SPA fallbacks
│   ├── src/
│   │   ├── components/
│   │   │   ├── Icons.tsx
│   │   │   ├── ui.tsx
│   │   │   └── workspace/
│   │   │       ├── AgentsPanel.tsx
│   │   │       ├── ChatPanel.tsx
│   │   │       ├── DispatchPanel.tsx
│   │   │       ├── SettingsPanel.tsx
│   │   │       ├── SpeechSettings.tsx
│   │   │       └── VoicePanel.tsx
│   │   ├── hooks/
│   │   │   ├── useSpeechPlayback.ts
│   │   │   ├── useSpeechRecognition.ts
│   │   │   └── useWorkspaceData.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── router.ts
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx
│   │   │   └── WorkspacePage.tsx
│   │   ├── styles/
│   │   │   ├── landing.css
│   │   │   ├── tts.css
│   │   │   └── workspace.css
│   │   ├── utils/
│   │   │   ├── soundEffects.ts
│   │   │   └── tts.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   └── types.ts
│   ├── test/tts.test.ts
│   ├── index.html
│   └── package.json
├── .env.example
├── AEGIS-Product-Plan.xlsx    # Roadmap, features, providers, testing, risks
├── AGENTS.md                  # Engineering source of truth
├── SPECSHEET.md               # Product and technical spec
├── vercel.json
└── README.md
```

---

## Current limitations

- Single workspace, no authentication or per-user isolation.
- Dispatch supports only generic HTTPS webhooks and Slack incoming webhooks.
- No telephony ingestion, SMS, email, CRM, or spreadsheet connectors are implemented.
- Speech recognition and synthesis depend on browser support. There is no cloud speech fallback.
- Dispatch planning quality depends on the selected model. The local rules planner is intentionally simple and labeled as such.
- Conversation and dispatch history are capped in memory.

These are stated here because AEGIS does not label unbuilt integrations as available.

---

## License

MIT
