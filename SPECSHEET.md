# AEGIS — Product & Technical Specification

Version 2.0 · Independent product specification

> This document describes what AEGIS is intended to be, what is implemented today, and what is explicitly not built. It replaces the earlier hackathon specification.

---

## 1. Product summary

**AEGIS is a voice-first AI workspace for teams that need conversations to produce a reviewed action.**

A user configures an AI provider and an agent, talks or types, and then uses a separate dispatch workflow to send an approved event to an HTTPS webhook or Slack incoming webhook. Every dispatch is logged with its real outcome.

### Problem

Operational conversations happen in chat, but the resulting action usually happens somewhere else. Copying an AI answer into a ticket, a Slack channel, or an internal system creates drift, loses context, and hides failures.

### Product thesis

Separate **thinking** from **acting**:

- The model proposes.
- A human approves.
- The server executes.
- The log tells the truth.

### Target users

| Segment | Need |
|---|---|
| Operations teams | Turn incident chatter into a reviewed alert or handoff |
| Support teams | Escalate a customer issue to an internal webhook |
| Small engineering teams | Use their own model account without a bundled AI platform |
| Builders and evaluators | A compact reference for provider abstraction and governed execution |

### Value proposition

- Bring your own AI provider.
- Browser-native voice, no cloud speech bill.
- Explicit approval before external effects.
- Honest, inspectable outcomes instead of fabricated success.
- A small codebase that can be extended without a vendor platform.

---

## 2. Scope

### Implemented

- Public landing page.
- Workspace with chat, voice, dispatch, agents, and settings.
- Six provider slots: Anthropic, OpenAI, Google Gemini, OpenRouter, Groq, custom OpenAI-compatible.
- Per-agent provider, model, prompt, temperature, token limit, voice settings, default targets.
- Conversation persistence in the workspace store.
- Browser speech recognition and synthesis.
- Dispatch planning with AI or a labeled rules fallback.
- Dispatch execution to HTTPS webhooks and Slack incoming webhooks.
- Per-target results and dispatch history.
- Optional Vercel Blob persistence.
- SSRF protections, rate limits, validation, sanitized errors.
- Backend and speech-engine tests.

### Not implemented

- Authentication or multi-user accounts.
- Per-user or multi-tenant data isolation.
- Telephony, SIP, inbound phone numbers, or call recording.
- Cloud speech-to-text or text-to-speech.
- CRM, email, spreadsheet, SMS, or ticketing connectors.
- Streaming model responses.
- Background queues or retries.
- Billing or usage metering.
- Audit export.

Anything in this list must not be presented as available.

---

## 3. User journeys

### J1 — First run

1. User opens `/` and reads the product narrative.
2. Clicks **Launch AEGIS**.
3. Workspace loads `GET /api/workspace`.
4. If no provider key exists, Settings and chat explain that a server-side key is required.
5. User adds a key to `.env`, restarts the API, and refreshes.

Success: the user understands why AI is unavailable and what to do next.

### J2 — Text conversation

1. Select an agent.
2. Type a message.
3. `POST /api/chat`.
4. User message + assistant reply are stored.
5. Conversation appears in the history rail with a derived title.

Failure: provider error is shown in the chat banner. No synthetic reply is stored.

### J3 — Voice turn

1. Open Voice.
2. Grant microphone permission.
3. Speak; interim transcript is shown.
4. Final transcript is sent as a normal chat turn.
5. Reply is spoken with the selected browser voice.
6. Transcript stays in the same conversation history.

Failure: unsupported browser, denied microphone, no voices, or playback error is shown with a hint.

### J4 — Governed dispatch

1. Open Dispatch.
2. Enter an instruction.
3. `POST /api/dispatch/plan` returns a plan and the public target list.
4. User edits title, summary, priority, and target selection.
5. `POST /api/dispatch/execute` with the approved plan.
6. Server posts to each selected target.
7. UI shows aggregate status and per-target results.
8. Log appears in history.

Failure: a target error is displayed with HTTP status and sanitized detail; aggregate becomes `partial` or `failed`.

### J5 — Target management

1. Open Settings.
2. Add a target with name, type, and HTTPS URL.
3. Server validates, resolves, and stores it.
4. UI receives only `{ id, name, type, host, enabled, timestamps, last test }`.
5. Send test, pause, edit, or delete.

---

## 4. Functional requirements

### 4.1 Providers

| ID | Label | Protocol | Default model |
|---|---|---|---|
| `anthropic` | Anthropic | Messages API | `claude-sonnet-4-5` |
| `openai` | OpenAI | Chat Completions | `gpt-4.1` |
| `google` | Google Gemini | `generateContent` | `gemini-2.5-pro` |
| `openrouter` | OpenRouter | OpenAI-compatible | `openai/gpt-4.1` |
| `groq` | Groq | OpenAI-compatible | `llama-3.3-70b-versatile` |
| `compatible` | Custom | OpenAI-compatible | configured |

Requirements:

- A provider is usable only when its API key is present.
- The browser receives presence, not the key.
- The default provider is the first configured provider unless overridden.
- Model lists can be extended with comma-separated env values.
- Every provider returns normalized text, model id, and optional usage.
- Errors map to a shared taxonomy and HTTP status:
  - `not_configured` → 503
  - `rate_limited` → 429
  - `timeout` → 504
  - auth/not-found/upstream → 502

### 4.2 Agents

Fields:

```ts
{
  id, name, description,
  providerId, modelId, systemPrompt,
  temperature,       // 0..2
  maxTokens,         // 64..4096
  voiceRate,         // 0.5..2
  voicePitch,        // 0..2
  targetIds,
  createdAt, updatedAt
}
```

Rules:

- Name, model, and system prompt are required.
- At least one agent always exists.
- Deleting an agent keeps existing conversations (they retain agent name/model metadata).
- Target references must exist.

### 4.3 Conversations

- Created implicitly by chat or explicitly by `POST /api/conversations`.
- Title = first user message, 64 characters.
- Messages: `user` or `assistant`, with timestamp, provider/model/usage on assistant messages.
- Cap: 200 messages per conversation, 50 conversations.
- History rail shows title, agent name, relative update time, message count.

### 4.4 Chat

Request:

```json
{ "agentId": "agent_default", "conversationId": "conv_...", "message": "..." }
```

Response:

```json
{ "conversation": { ... }, "reply": { "id": "msg_...", "role": "assistant", "content": "..." } }
```

No provider → 503 with `code: "not_configured"`. No fabricated reply.

### 4.5 Voice

Input:

- Feature-detect `SpeechRecognition` / `webkitSpeechRecognition`.
- `continuous = true`, `interimResults = true`.
- Emit final transcript; stop on request or unmount.
- Map errors: `not-allowed`, `audio-capture`, `network`, `no-speech`, `language-not-supported`.

Output:

- `speechSynthesis` with voice, rate, pitch, volume.
- Chunk long text (~180 chars; sentence → word → hard split).
- Generation token prevents stale callbacks.
- 8 s start watchdog and 2.5 s resume watchdog.
- Voice fallback prefers a different local voice.
- Diagnostics expose engine, voice counts, chunk state, error, and hint.

### 4.6 Dispatch planning

Input: instruction + optional agent.

Output: title, summary, priority (`low|medium|high|urgent`), instruction, targetIds, source (`ai|rules`), provider/model, notice.

Rules:

- AI path uses the agent's provider. It sends the target list as names/types only, never URLs.
- The planner must not execute anything.
- If AI is unavailable or returns invalid JSON, use the rules planner and set `source: "rules"` + a visible notice.
- Never claim AI when the rules planner produced the result.

### 4.7 Dispatch execution

Input: plan + optional agentId + targetIds.

Process:

1. Resolve selected targets from the store.
2. Reject unknown targets.
3. For each enabled target:
   - Validate URL again.
   - Post with timeout, no redirects.
   - Record status, HTTP status, duration, sanitized detail.
4. Aggregate.
5. Append log.
6. Persist.

Webhook payload:

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

Slack targets receive `{ "text": "..." }` with a bold title, summary, priority, and instruction. Requests use `content-type: application/json`, `x-aegis-event: aegis.dispatch`, and `x-aegis-dispatch-id: <planId>`.

Status rules:

| Condition | Status |
|---|---|
| No targets selected/available | `skipped` |
| All targets 2xx | `dispatched` |
| Some 2xx, some not | `partial` |
| None 2xx | `failed` |

### 4.8 Targets

Fields: `id, name, type, url, enabled, createdAt, updatedAt, lastTestedAt?, lastStatus?`.

Public shape omits `url`, includes `host`.

Validation:

- Name required, ≤ 80 chars.
- Type `webhook` or `slack`.
- URL ≤ 2000 chars, `https`, no credentials.
- DNS check rejects loopback/private/link-local/multicast/reserved.
- `DISPATCH_ALLOW_INSECURE=true` permits HTTP for local testing only.

### 4.9 Persistence

Optional Vercel Blob snapshot:

```
aegis/workspaces/<AEGIS_STATE_ID>.json
```

Contents: version, agents, conversations, targets, dispatchLogs, updatedAt.

- Hydration merges logs by id.
- Persistence failure logs a warning and does not fail the request.
- No secrets or raw target URLs leave the server through logs.

---

## 5. Data model

```ts
WorkspaceState {
  version: 2
  agents: Agent[]
  conversations: Conversation[]
  targets: DispatchTarget[]
  dispatchLogs: DispatchLog[]
  updatedAt: string
}

Agent {
  id, name, description,
  providerId, modelId, systemPrompt,
  temperature, maxTokens,
  voiceRate, voicePitch,
  targetIds, createdAt, updatedAt
}

Conversation {
  id, title, agentId, agentName,
  providerId, modelId,
  messages: ConversationMessage[],
  createdAt, updatedAt
}

ConversationMessage {
  id, role: 'user' | 'assistant',
  content, createdAt,
  providerId?, modelId?, usage?
}

DispatchTarget {
  id, name, type: 'webhook' | 'slack',
  url, enabled,
  createdAt, updatedAt,
  lastTestedAt?, lastStatus?: 'success' | 'failed'
}

DispatchPlan {
  id?, title, summary,
  priority: 'low' | 'medium' | 'high' | 'urgent',
  instruction, targetIds,
  source: 'ai' | 'rules',
  providerId?, modelId?, createdAt?, notice?
}

DispatchResult {
  targetId, targetName, type, host,
  status: 'success' | 'failed',
  httpStatus?, durationMs, detail?
}

DispatchLog {
  id, timestamp, agentId?,
  plan, results[], status, message
}
```

---

## 6. API specification

Base: `/api`.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | none | Safe status only |
| GET | `/workspace` | none | Bootstrap |
| GET | `/providers` | none | Public provider config |
| GET/POST | `/agents` | none | List/create |
| PUT/DELETE | `/agents/:id` | none | Update/delete |
| GET/POST | `/conversations` | none | List/create |
| GET/DELETE | `/conversations/:id` | none | Read/delete |
| POST | `/chat` | none | AI turn |
| POST | `/dispatch/plan` | none | Plan only |
| POST | `/dispatch/execute` | none | Real execution |
| GET | `/dispatch/logs` | none | History |
| GET/POST | `/targets` | none | List/create |
| PUT/DELETE | `/targets/:id` | none | Update/delete |
| POST | `/targets/:id/test` | none | Test event |

Rate limits:

- `/api/*`: 120 requests/minute/IP.
- `/api/chat`, `/api/dispatch/*`: 40 requests/minute/IP.
- `/api/health` is exempt from the general limit.

No authentication exists. This is a documented limitation, not a hidden one.

---

## 7. Non-functional requirements

### Security

- Server-only secrets.
- Write-only target URLs.
- SSRF protections with DNS resolution and private-range rejection.
- Redirects disabled.
- Hard timeouts.
- Body size cap.
- Sanitized errors.
- No key, prompt, message, or URL logging.

### Reliability

- Provider failure produces a visible error, not a fallback reply.
- Dispatch failure is recorded and returned.
- Persistence is best-effort.
- Memory caps prevent unbounded growth.

### Accessibility

- Semantic landmarks.
- Keyboard-operable controls.
- Visible focus.
- `aria-current`, `aria-pressed`, `aria-live`.
- Reduced-motion support.
- Mobile bottom navigation.

### Performance

- No router, state, or UI framework beyond React.
- Zero audio assets.
- Local speech synthesis.
- API payloads are small and capped.
- Provider timeout is bounded.

### Browser support

- Chrome, Edge, Safari: chat, dispatch, speech synthesis.
- Recognition depends on the browser and requires HTTPS or localhost.
- Unsupported states must be explicit.

---

## 8. Testing strategy

### Backend (Node test runner + tsx)

- Config: key detection, placeholders, defaults, warnings, compatible endpoint rules.
- Providers: request shape, response parsing, error mapping. No real network.
- Dispatch: URL rejection, plan fallback labeling, aggregation, skipped behavior.
- Chat: conversation creation, message persistence, provider error propagation.
- API: validation errors, 404s, 413, rate-limit shape, sanitized errors.

### Frontend

- `tts.ts`: chunking, voice pick, fallback pick, capability detection, error mapping, hints.
- `gravityFieldMath.ts`: scroll stage weights, sphere budget, radius bands.
- Router helpers.
- Manual browser smoke test for voice, routing, dispatch, the landing field, reduced motion, and the WebGL fallback.

### Required commands

```bash
cd backend && npm test && npm run build
cd ../frontend && npm test && npm run lint && npm run build
```

---

## 9. Milestones

### M1 — Product foundation (complete)

Landing page, workspace shell, provider registry, agents, chat, conversation store.

### M2 — Voice and dispatch (complete)

Browser speech in/out, speech diagnostics, plan/review/execute, webhook and Slack targets, logs.

### M3 — Honesty and safety (complete)

Real error surfaces, write-only URLs, SSRF protection, rate limits, status aggregation, tests.

### M4 — Production readiness (next)

Authentication, per-user workspaces, audit export, streaming responses, connector SDK, queue/retry.

### M5 — Expansion (later)

Telephony ingestion, cloud speech, verified connectors (CRM, email, sheets), team roles, billing.

---

## 10. Roadmap

| Horizon | Item | Why |
|---|---|---|
| Next | Authentication and user-scoped workspaces | Required before public use |
| Next | Streaming model output | Faster perceived response |
| Next | Interruptible speech playback | More natural voice turns |
| Next | Audit export (JSON/CSV) | Operational review |
| Next | Retry policy for failed dispatches | Reliability |
| Later | Telephony ingestion | Real inbound calls |
| Later | Cloud speech providers | Quality and language coverage |
| Later | Verified connectors with HTTP contracts | CRM, email, sheets |
| Later | Team roles and permissions | Multi-user deployment |
| Later | Usage metering and billing | Commercial model |

---

## 11. Success metrics

- Time from first visit to first successful chat turn.
- Percentage of workspaces with at least one provider configured.
- Voice turn completion rate (recognition → reply → playback).
- Dispatch plan → execute conversion.
- Dispatch success rate by target type.
- Percentage of failures surfaced with an actionable message.
- Return rate after first conversation.

No metric may be improved by fabricating success.

---

## 12. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| No authentication | Unsafe public deployment | Document limitation; add auth before exposure |
| Provider outage | Chat unavailable | Visible error, retry guidance, provider choice |
| Browser speech variability | Voice unusable | Diagnostics, unsupported state, text fallback |
| Webhook payload mismatch | Target rejects event | Per-target HTTP detail, test button |
| SSRF | Internal network access | HTTPS + DNS + private-range checks + no redirects |
| Memory persistence | Data loss on restart | Documented; Blob option |
| Model output invalid JSON | Bad plan | Validate; fall back to labeled rules plan |

---

## 13. Open decisions

1. Authentication model: email magic link vs OAuth.
2. Workspace ownership: one workspace per user vs teams.
3. Connector contract: fixed schemas vs user-defined templates.
4. Whether to add a queue for dispatch retries.
5. Whether cloud speech is a product requirement or an optional adapter.

Until decided, do not implement partial versions that appear complete.
