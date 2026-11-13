# AGENTS.md

**AEGIS engineering source of truth.**

Read this before changing code. It defines the product direction, the architecture, and the rules that keep the implementation honest.

---

## 1. Product direction

AEGIS is an independent, voice-first AI workspace where a conversation can end in a **reviewed dispatch**.

Core loop:

```
configure provider → configure agent → chat or speak → plan → approve targets → execute → inspect result
```

Two surfaces:

- `/` — public landing page. Product narrative, capabilities, provider list, architecture, roadmap.
- `/terms`, `/privacy` — legal and governance pages (Terms of Service, Privacy Policy).
- `/app`, `/app/voice`, `/app/dispatch`, `/app/agents`, `/app/settings` — the workspace.

### Non-goals

- A consumer chatbot.
- A fake “integration marketplace”.
- A telephony product. There is no inbound call pipeline or phone number handling.
- A multi-tenant SaaS. There is no authentication yet; it is a single workspace.

Do not reintroduce hackathon, judging, submission, tenant, or sponsor-platform framing. Those belonged to an earlier version of this repository.

---

## 2. Architecture

```
frontend (React 19 + Vite + TypeScript)
  ├── landing page
  └── workspace
        chat / voice / dispatch / agents / settings
                    │
                    │ JSON over HTTP
                    ▼
backend (Express + TypeScript)
  ├── validation.ts        request contracts
  ├── config.ts            env parsing, provider metadata
  ├── db.ts                on-server relational SQLite database (node:sqlite)
  ├── auth.ts              on-server scrypt password auth & sessions (node:crypto)
  ├── providers/           adapter contract + registry
  ├── chat.ts              conversation turn orchestration
  ├── dispatch.ts          URL safety, plan, execute, log
  ├── store.ts             workspace store interface
  ├── persistence.ts       optional Vercel Blob snapshot
  └── app.ts               routes, CORS, Helmet, rate limits
```

### Source layout

```
backend/
  src/
    app.ts
    auth.ts
    chat.ts
    config.ts
    db.ts
    dispatch.ts
    main.ts
    persistence.ts
    store.ts
    types.ts
    validation.ts
    providers/
      anthropic.ts
      google.ts
      openai.ts
      registry.ts
      types.ts
  test/
    api.test.ts
    chat.test.ts
    config.test.ts
    dispatch.test.ts

frontend/
  scripts/postbuild.mjs
  src/
    App.tsx
    main.tsx
    index.css
    types.ts
    components/
      Icons.tsx
      ui.tsx
      AegisFieldCanvas.tsx
      workspace/
        AgentsPanel.tsx
        AuthCard.tsx
        ChatPanel.tsx
        DispatchPanel.tsx
        SettingsPanel.tsx
        SpeechSettings.tsx
        VoicePanel.tsx
    hooks/
      useSpeechPlayback.ts
      useSpeechRecognition.ts
      useWorkspaceData.ts
    lib/
      api.ts
      gravityField.ts
      gravityFieldMath.ts
      router.ts
    pages/
      LandingPage.tsx
      PrivacyPage.tsx
      TermsPage.tsx
      WorkspacePage.tsx
    styles/
      landing.css
      legal.css
      tts.css
      workspace.css
    utils/
      soundEffects.ts
      tts.ts
  test/gravityField.test.ts
  test/tts.test.ts
```

---

## 3. Commands

```bash
# Backend
cd backend
npm install
npm run dev       # tsx watch src/main.ts on :3001
npm test          # tsx --test test/*.test.ts
npm run build     # tsc → dist/
npm start         # node dist/main.js

# Frontend
cd frontend
npm install
npm run dev       # Vite on :5173
npm test          # node --test test/tts.test.ts test/gravityField.test.ts
npm run lint      # oxlint
npm run build     # tsc -b && vite build && node scripts/postbuild.mjs
```

Local URLs:

- Landing: `http://localhost:5173/`
- Workspace: `http://localhost:5173/app`
- API: `http://localhost:3001/api/health`

Never move the backend to port 3000; `frontend/src/lib/api.ts` expects `3001` in development.

---

## 4. Backend rules

### Configuration

- All environment parsing lives in `config.ts`.
- Keys are read only on the server. Never return a key, key fragment, or raw target URL in an API response.
- `publicConfig()` is the only provider shape sent to the browser: id, label, configured flag, default model, model list, compatible flag.
- Invalid timeouts and non-HTTPS provider base URLs produce warnings and fall back to safe defaults.
- Placeholder values (`your_...`, `_here`, `changeme`) are treated as missing keys.

### Provider adapters

Every provider implements the same contract in `providers/types.ts`:

```ts
interface ProviderAdapter {
  id: ProviderId;
  chat(request: ProviderRequest): Promise<ProviderReply>;
}
```

Rules:

1. Never call a provider directly from a route. Go through the registry.
2. Never hardcode a single provider into chat, planning, or UI logic.
3. Normalize provider output into `{ text, usage?, modelId }`.
4. Map upstream failures to `ProviderError` codes: `not_configured`, `unauthorized`, `forbidden`, `not_found`, `rate_limited`, `timeout`, `network`, `invalid_response`, `upstream_error`.
5. Sanitize upstream error text. Do not leak request headers or keys.
6. Respect `AI_TIMEOUT_MS` with an `AbortController`.
7. Adding a provider means adding an adapter + registry entry + config block + tests. Do not fake support in the UI first.

Current adapters:

- Anthropic Messages API
- OpenAI Chat Completions
- Google Gemini `generateContent`
- OpenAI-compatible (OpenRouter, Groq, custom endpoint)

### Chat

`chat.ts` owns one turn:

1. Load the agent.
2. Create or resume the conversation.
3. Append the user message.
4. Build a bounded history (respect provider context limits).
5. Call the provider.
6. Append the assistant message with provider/model/usage metadata.
7. Return the conversation and reply.

Provider errors must propagate to the route and become a real HTTP error. Never insert a synthetic assistant reply when the provider fails.

### Dispatch

`dispatch.ts` has three responsibilities:

1. **Target safety** — `checkTargetUrl()`:
   - HTTPS required unless `DISPATCH_ALLOW_INSECURE=true`.
   - Reject credentials in the URL.
   - Resolve DNS and reject loopback, private, link-local, multicast, and reserved addresses.
   - Reject `localhost`, `.local`, and `.internal` names.
   - Re-check the resolved address at execution time.
2. **Planning** — `planDispatch()`:
   - Prefer the selected agent's provider.
   - Return `source: 'ai'` with provider/model metadata when a model produced the plan.
   - Fall back to `source: 'rules'` and attach a visible `notice` when no provider is configured or planning fails.
   - Never invent an AI plan while labeling it `ai`.
3. **Execution** — `executeDispatch()`:
   - Only enabled, explicitly selected targets.
   - `POST` with `redirect: 'manual'` or `redirect: 'error'`.
   - Hard timeout.
   - Record per-target status, HTTP status, duration, and sanitized detail.
   - Aggregate `dispatched` / `partial` / `failed` / `skipped`.
   - Always append a `DispatchLog`, including failures and skipped runs.

Targets support exactly two types today: `webhook` and `slack`. Do not add a connector name to the UI until the backend actually executes it.

### Validation

- Every request body passes through `validation.ts`.
- Reject non-object bodies, wrong types, excessive lengths, unknown target types, and invalid priorities.
- Do not trust client-supplied ids for ownership or existence; resolve them through the store.
- `express.json({ limit: '128kb' })` is deliberate.

### Store and persistence

- `WorkspaceStore` / `SqliteWorkspaceStore` runs a free, local on-server SQLite database via `node:sqlite`.
- Stores relational records for `agents`, `conversations`, `messages`, `dispatch_targets`, and `dispatch_logs`.
- Database file path defaults to `data/aegis.sqlite`, configurable via `AEGIS_DB_PATH` or `SQLITE_PATH` (`:memory:` for automated tests).
- WAL mode (`PRAGMA journal_mode = WAL;`) and cascading foreign keys (`PRAGMA foreign_keys = ON;`) are enabled.
- `publicTarget()` strips the URL and adds `host`.
- Never persist environment secrets.

### API responses

- Success: plain resource objects or `{ resource }`.
- Errors: `{ "error": "...", "code?": "..." }`.
- Never return stack traces.
- `/api/health` exposes only service status, storage mode, provider presence, and target count.
- `dispatch/execute` returns `502` when the aggregate status is `failed`.

---

## 5. Frontend rules

### Routing

- No router dependency. `lib/router.ts` uses the History API and a custom `aegis:navigate` event.
- `App.tsx` selects `LandingPage` or `WorkspacePage` from `usePathname()`.
- Canonical paths: `/`, `/app`, `/app/voice`, `/app/dispatch`, `/app/agents`, `/app/settings`.
- `postbuild.mjs` copies `index.html` to `dist/app/index.html` and `dist/404.html` for static hosting.
- Keep back/forward navigation working. Use `navigate()` rather than setting `location.href` for internal links.

### Data layer

- All API calls live in `lib/api.ts`.
- There is **no sandbox fallback**. A network failure shows an offline gate. Never recreate the old demo store.
- Structured API errors must propagate to the UI. Do not swallow a 4xx/5xx and render fake data.
- The client timeout is 8 s for normal requests and 65 s for AI/dispatch requests.
- The workspace bootstrap is owned by `WorkspacePage`; panels receive data and call `onChanged()` after mutations.

### State and components

- `WorkspacePage` owns the active agent, active conversation, and send-in-flight state.
- Chat and Voice share the same conversation object.
- `onSend` returns the assistant message or `null`; panels must handle `null` with a visible error.
- Keep components presentational where possible. Move provider/domain logic to the backend.
- Do not add a state library or data-fetching dependency for this size of app.
- Respect `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, and `verbatimModuleSyntax`.

### Voice

- Recognition: `useSpeechRecognition`. Feature-detect `SpeechRecognition` / `webkitSpeechRecognition`; never assume it exists.
- Synthesis: `utils/tts.ts` + `useSpeechPlayback`. This is the tested speech engine.
- `tts.ts` must stay free of DOM top-level side effects so `node --test test/tts.test.ts` works.
- Never claim a cloud, neural, or premium voice provider. The UI says “browser speech synthesis / local voices”.
- Handle: empty voice list, late voice loading, stale `onend`/`onerror`, failed resume, unsupported browser, and missing microphone permission.
- Persist speech preferences under `aegis.tts.settings.v1`.
- Hands-free mode may reopen the microphone only after speech playback finishes. Do not create a wake-lock or continuous recorder.

### Sound

- `utils/soundEffects.ts` uses the Web Audio API with zero assets.
- Audio must unlock on a user gesture.
- Keep sounds quiet and optional. No sound on page load.
- Do not add audio that implies success before a real result exists.

### Landing field

- `pages/LandingPage.tsx` mounts one persistent `<AegisFieldCanvas />`. It is a fixed, full-viewport WebGL layer behind the content; do not add a second per-section canvas or move it inside `.hero`.
- `lib/gravityField.ts` owns the Three.js scene, materials, physics, scroll staging, pointer interaction, resize, and teardown. `lib/gravityFieldMath.ts` holds the DOM-free stage/radius helpers; keep those pure so `node --test test/gravityField.test.ts` works.
- Three.js is loaded with a dynamic `import()` so the workspace bundle stays lean. Do not import `three` at module top level from any page entry.
- The field must always be `pointer-events: none`, `aria-hidden="true"`, and behind text, buttons, and navigation. Content sections need a scrim or frosted surface where the field would reduce readability.
- Handle WebGL-unavailable (`data-engine="css"` fallback orbs), `prefers-reduced-motion` (single settled frame, no animation loop), page visibility (pause the RAF), resize, and full unmount cleanup. Unsupported is a valid state.

### Styling and UX

- Design tokens live in `index.css`; page styles live in `styles/landing.css`, `styles/workspace.css`, `styles/tts.css`.
- Do not reintroduce a second color system. Use the existing organic palette: corn silk, forest, olive, caramel, copper.
- UI must feel like a real product: clear hierarchy, restrained motion, visible focus, real empty states, responsive layout.
- Motion: fast feedback, spring-like ease, respect `prefers-reduced-motion`.
- Hover/active/focus states are required on every interactive control.
- Never hide a destructive action without confirmation.
- Loading states must be honest: spinner + label, never a fake skeleton that resembles real data.
- On mobile the sidebar becomes a bottom navigation; do not let it cover the composer.

### Accessibility

- Use semantic landmarks (`header`, `nav`, `main`, `aside`, `footer`).
- Every icon-only button needs `aria-label` and a `title`.
- Use `aria-current` for active navigation, `aria-pressed` for toggles, and `aria-live` for status.
- Maintain visible focus rings.
- Respect reduced motion.
- The page title must reflect the active workspace section.

---

## 6. Honesty rules (non-negotiable)

1. **Never fake a successful integration.** Only `webhook` and `slack` exist.
2. **Never fake a model reply.** If no provider key exists, return a configuration error.
3. **Never label a rules plan as AI.** `plan.source` must be accurate.
4. **Never label a simulated or skipped dispatch as dispatched.** Use the literal status.
5. **Never show a target URL or provider key in the browser.** Host-only references.
6. **Never claim voice features that are not implemented.** Browser speech only.
7. **Never add a capability to the landing page before it exists in code.**
8. **Never swallow an upstream error to keep the UI green.**
9. **Never describe an unbuilt roadmap item as shipped.**
10. **If a dependency, API, or browser feature is unavailable, surface it.** Unsupported is a valid state.

When in doubt, show the failure.

---

## 7. Security

- Keys and raw target URLs stay server-side.
- Authentication: on-server user accounts with `scrypt` password hashing (random salt, constant-time verification) and HttpOnly session cookies.
- CORS is restricted to `FRONTEND_URL` origins. Do not use `*` with credentials.
- Helmet is enabled (CSP is disabled only because the app has no server-rendered inline policy needs; revisit before production hardening).
- Rate limits: 120 req/min/IP for `/api`, 40 req/min/IP for AI and dispatch.
- JSON bodies are capped at 128 kb.
- Dispatch is SSRF-guarded: HTTPS, no credentials, DNS resolution, private-range rejection, redirects disabled, timeout.
- Do not log secrets, full URLs with paths, prompts, or message content.

---

## 8. Testing

Required before a change is considered complete:

```bash
cd backend && npm test && npm run build
cd ../frontend && npm test && npm run lint && npm run build
```

Backend coverage expectations:

- On-server authentication, password hashing, session lifecycle, and RBAC.
- Config parsing and warnings.
- Provider request/response mapping and error taxonomy.
- Dispatch URL rejection (HTTP, credentials, private ranges).
- Plan fallback labeling.
- Execute aggregation: dispatched, partial, failed, skipped.
- API validation, 404s, and sanitized errors.
- No test may call a real provider or real webhook.

Frontend coverage expectations:

- Speech chunking, voice selection, fallback, capability detection, error mapping.
- Gravity field stage helpers and radius distribution pure math.
- Router path helpers if routing logic changes.
- Keep tests dependent only on pure logic where possible.

Manual smoke test:

1. `/` renders and Launch opens `/app`.
2. `/app` loads the workspace or shows the offline gate.
3. Chat without a provider key shows a configuration error, not a fake reply.
4. Chat with a provider key returns a stored assistant message.
5. Voice: microphone permission, interim transcript, spoken reply, stop, diagnostics.
6. Agents: create, edit, delete (last agent protected).
7. Targets: add HTTPS webhook, test, pause, delete; verify only host is shown.
8. Dispatch: plan, edit, execute to a real test endpoint, confirm `dispatched` / `partial` / `failed`.
9. Reload: history remains when Blob persistence is configured.
10. Mobile width: bottom nav, no overlap, composer reachable.

---

## 9. Dependency policy

- Prefer platform APIs and existing dependencies.
- No router, state manager, form library, or UI kit for this scope.
- Before adding a package: check React 19 compatibility, bundle impact, maintenance, and license.
- `three` is the only graphics dependency, and only the landing page may load it, via dynamic `import()`. Keep it out of the workspace bundle path.
- Do not add a cloud TTS, telephony, CRM, or email SDK unless that feature is being fully implemented and tested.

---

## 10. Git and deployment

- Never push, open a PR, merge, or deploy without explicit user permission.
- Use feature branches: `feat/*`, `fix/*`, `chore/*`. No direct work on `main`.
- Keep `.env`, `.env.local`, and `.vercel` out of commits.
- Deployment uses the root `vercel.json`: Vite frontend service + Express container backend service.
- Production must set `VITE_API_BASE_URL=/` so the frontend calls the same-origin API.
- `BLOB_READ_WRITE_TOKEN` is optional; without it the API is memory-only and state resets on restart.

---

## 11. Common pitfalls

- **Port mismatch:** API is `3001`, frontend dev is `5173`.
- **API offline:** the workspace shows a gate. Do not add a fake local store to “fix” it.
- **Target URL leakage:** `PublicDispatchTarget` must never include `url`.
- **Provider key leakage:** never include `baseUrl` or `apiKey` in `publicConfig()`.
- **Silent provider fallback:** a failed model call is an error, not a rules reply. Only planning may fall back, and it must be labeled.
- **HTTP target in production:** only allowed with `DISPATCH_ALLOW_INSECURE=true`; keep it false.
- **DNS rebinding:** re-check resolution at execution, not only on save.
- **Stale speech callbacks:** every playback run needs a generation token.
- **Voice list empty on first paint:** poll and offer refresh; never assume voices exist at mount.
- **Resume that never resumes:** keep the 2.5 s watchdog.
- **Fallback reusing the failed voice:** choose a different local voice.
- **Last agent deletion:** backend returns `409`; keep the UI disabled as well.
- **Vercel deep links:** `dist/app/index.html` and `dist/404.html` must exist after a build.
- **Oxlint warnings:** warnings are allowed, but do not add new errors; clean up warnings in files you touch when practical.

---

## 12. Definition of done

A change is done when:

- the real feature works end to end;
- failure paths are visible and truthful;
- secrets and raw URLs stay server-side;
- accessibility states are present;
- backend tests pass and the build compiles;
- frontend tests, lint, and build pass;
- README/AGENTS/SPECSHEET stay accurate if behavior changed.
