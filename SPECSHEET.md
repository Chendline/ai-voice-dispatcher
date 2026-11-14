# AEGIS — Product & Technical Specification (SRS)

Version 2.1 · Operational Engineering & System Requirements Specification

> This document is the definitive product and technical specification for AEGIS. It outlines the system architecture, implemented capabilities, security models, and the four-sprint engineering remediation roadmap.

---

## 1. Product Summary & Purpose

**AEGIS is an independent, voice-first AI workspace for operational teams where conversations terminate in a governed, human-reviewed dispatch.**

Operational teams communicate incident context, customer escalations, and system statuses across chat and voice. AEGIS bridges the gap between conversational triage and concrete operational execution by generating structured dispatch proposals that require human verification before being executed against verified HTTPS webhooks or Slack incoming webhooks.

### Core Architecture Thesis: Decoupling Thinking from Acting
- **The Model Proposes:** AI models synthesize conversation history and draft actionable dispatch plans.
- **The Human Verifies:** Operators inspect, refine parameters, and select authorized destinations.
- **The Server Executes:** The backend enforces SSRF socket verification and dispatches payload events.
- **The Audit Log Persists:** Real-time HTTP statuses, latencies, and sanitized responses are immutably logged.

---

## 2. System Scope & Capability Matrix

### 2.1 Implemented Capabilities
- **Multi-Provider AI Registry:** Unified adapter contract driving Anthropic Messages API, OpenAI Chat Completions, Google Gemini (`generateContent`), OpenRouter, Groq, and custom OpenAI-compatible endpoints.
- **On-Server Relational Database:** High-performance, zero-external-cost relational persistence using Node.js built-in `node:sqlite` (`DatabaseSync`), Write-Ahead Logging (WAL mode), cascading foreign keys, and indexes.
- **On-Server Operator Authentication & RBAC:** Native `node:crypto` `scryptSync` password hashing with cryptographically secure random salts, constant-time `timingSafeEqual` verification, 256-bit opaque session tokens, `HttpOnly` `SameSite=Lax` cookies, and Role-Based Access Control (`admin`, `operator`, `viewer`).
- **Voice-First Audio Pipeline:** Browser-native speech recognition (`webkitSpeechRecognition` / `SpeechRecognition`) with sentence-aware chunking, generation tokens to eliminate stale callbacks, watchdog recovery, and local speech synthesis.
- **Governed Dispatch Engine:** Multi-target dispatch planning with labeled fallback heuristics, SSRF destination validation, and real-time execution logging.
- **Legal & Governance Surfaces:** Complete Terms of Service (`/terms`), Privacy Policy (`/privacy`), Cookie & Storage Policy (`/cookies`), and first-launch Apple-grade cookie consent notice banner.

### 2.2 Active Remediation Plan (Sprints 1–4)
- **Sprint 1 (Immediate Security) [COMPLETED]:**
  - Production SSRF Socket Pinning in `dispatch.ts` (`pinnedFetch`) to eliminate Time-of-Check to Time-of-Use (TOCTOU) DNS rebinding risks.
  - Perimeter Route Protection enforcing `requireWorkspaceAuth` and role-based permissions (`admin`, `operator`, `auditor`) across all workspace endpoints.
- **Sprint 2 (Data Confidentiality) [COMPLETED]:**
  - Target Secret Encryption at Rest: AES-256-GCM envelope encryption (`enc:v1:<iv>:<tag>:<ciphertext>`) for webhook and Slack URLs in SQLite (`crypto.ts`, `db.ts`).
- **Sprint 3 (Real-Time Performance) [COMPLETED]:**
  - Server-Sent Events (SSE) streaming (`POST /api/chat/stream`) across all AI providers (Anthropic, OpenAI, Google, Compatible).
  - Real-time token streaming and voice transcript feed reducing Time-To-First-Token (TTFT) from ~3s to ~250–400ms.
- **Sprint 4 (Compliance & Operations) [NEXT]:**
  - Operator attribution (`operator_id`, `operator_name`) attached to all dispatch logs and turns.
  - Audit Trail Export (JSON and CSV formats) with filtering in the Dispatch UI.

### 2.3 Explicit Non-Goals
- Consumer multi-tenant SaaS with billing or paid seat tiers.
- Inbound telephony, SIP trunking, or phone number provisioning.
- Fake integration marketplaces or synthetic mock replies.

---

## 3. User Journeys

### J1 — First Launch & Workspace Initialization
1. User visits `/` and clicks **Launch AEGIS** or navigates to `/app`.
2. First-launch Cookie Notice banner appears informing of essential on-server session cookies and zero tracking; user acknowledges.
3. System checks `/api/auth/status`. If no users exist (`initialized: false`), Settings prompts for first-time Admin Setup.
4. Admin account created with email, name, and password; session cookie (`aegis_session`) issued immediately.
5. Workspace boots with seeded default agent and system health check.

### J2 — Voice-Driven Incident Turn
1. Operator navigates to `/app/voice`.
2. Clicks microphone; native SpeechRecognition begins streaming interim transcripts.
3. Upon turn completion, transcript is submitted to `POST /api/chat`.
4. Response is spoken back using local browser voice synthesis with sentence-boundary chunking.
5. Conversation is stored relationally in SQLite with token usage and model metadata.

### J3 — Governed Dispatch Lifecycle
1. Operator opens `/app/dispatch` and requests a dispatch plan based on conversation context.
2. Backend generates a structured `DispatchPlan` (title, summary, priority, suggested targets).
3. Operator reviews, edits priority/instruction, and approves selected targets.
4. Backend executes `POST /api/dispatch/execute`.
5. Socket-pinned HTTP engine posts payload with manual redirect handling and timeout bounds.
6. Execution logged in `dispatch_logs` with HTTP status, roundtrip duration, and aggregate outcome (`dispatched`, `partial`, or `failed`).

---

## 4. Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                       │
│  - React 19 + TypeScript + Vite                             │
│  - Custom History API Router (No third-party dependency)    │
│  - Web Speech API (Local speech recognition & synthesis)   │
│  - Audio engine: Procedural Web Audio API taps              │
│  - Local storage: `aegis.tts.settings.v1`, cookie consent   │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON over HTTP (Port 3001)
┌──────────────────────────────▼──────────────────────────────┐
│                    Express Backend API                      │
│                                                             │
│  ├── validation.ts        Zod-like typed request validation │
│  ├── auth.ts              scryptSync auth, sessions, RBAC   │
│  ├── db.ts                node:sqlite (WAL mode, FK on)     │
│  ├── config.ts            Provider metadata & env parsing   │
│  ├── providers/           Adapter registry & normalization  │
│  │   ├── anthropic.ts     Messages API                      │
│  │   ├── openai.ts        Chat Completions                  │
│  │   ├── google.ts        generateContent                   │
│  │   └── types.ts         ProviderAdapter contract          │
│  ├── chat.ts              Turn orchestration                │
│  └── dispatch.ts          SSRF guards, plan, socket execute │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│              On-Server Relational Database                  │
│                 SQLite (data/aegis.sqlite)                  │
│  - users, sessions                                          │
│  - agents, conversations, messages                          │
│  - dispatch_targets, dispatch_logs                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Data Model & Schema Specifications

### 5.1 Relational SQLite Schema
```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Operators & Authentication
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'operator', 'viewer')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- Workspace Configuration
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  temperature REAL NOT NULL DEFAULT 0.6,
  max_tokens INTEGER NOT NULL DEFAULT 900,
  voice_rate REAL NOT NULL DEFAULT 1.0,
  voice_pitch REAL NOT NULL DEFAULT 1.0,
  target_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dispatch_targets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('webhook', 'slack')),
  url TEXT NOT NULL, -- Encrypted at rest via AES-256-GCM (enc:v1:<iv>:<tag>:<ciphertext>)
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_tested_at TEXT,
  last_status TEXT CHECK(last_status IN ('success', 'failed'))
);

-- Operational History
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  agent_name TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  provider_id TEXT,
  model_id TEXT,
  usage_input_tokens INTEGER,
  usage_output_tokens INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dispatch_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  plan_json TEXT NOT NULL,
  results_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('dispatched', 'partial', 'failed', 'skipped')),
  message TEXT NOT NULL,
  operator_id TEXT REFERENCES users(id) ON DELETE SET NULL
);
```

---

## 6. API Specification & Security Perimeter

Base URL: `/api`

| Endpoint | Method | Required Role | Description |
|---|:---:|:---:|---|
| `/health` | `GET` | Public | System status, storage mode, provider presence |
| `/auth/status` | `GET` | Public | Check setup status and current session |
| `/auth/setup` | `POST` | Public (0 users) | First-time administrator provisioning |
| `/auth/login` | `POST` | Public | Authenticate operator, set HttpOnly cookie |
| `/auth/logout` | `POST` | Authenticated | Invalidate active session and clear cookie |
| `/auth/me` | `GET` | Authenticated | Retrieve profile and permissions |
| `/auth/register` | `POST` | `admin` | Create new operator or viewer accounts |
| `/auth/users` | `GET` | `admin` | List workspace users and roles |
| `/providers` | `GET` | Public | Public provider configuration (no secrets) |
| `/workspace` | `GET` | Authenticated | Bootstrap workspace agents, targets, logs |
| `/agents` | `GET` | Authenticated | List configured agents |
| `/agents` | `POST` | `admin` | Create agent |
| `/agents/:id` | `PUT` | `admin` | Update agent configuration |
| `/agents/:id` | `DELETE` | `admin` | Delete agent (last agent protected) |
| `/conversations` | `GET` | Authenticated | List conversations |
| `/conversations/:id`| `DELETE` | Authenticated | Remove conversation and messages |
| `/chat` | `POST` | `admin`, `operator` | Execute conversational turn |
| `/chat/stream` | `POST` | `admin`, `operator` | Execute streaming turn (SSE) |
| `/dispatch/plan` | `POST` | `admin`, `operator` | Generate dispatch proposal |
| `/dispatch/execute`| `POST` | `admin`, `operator` | Execute verified dispatch to targets |
| `/dispatch/logs` | `GET` | Authenticated | Audit log history |
| `/dispatch/logs/export`| `GET` | Authenticated | Export audit trail (JSON/CSV) |
| `/targets` | `GET` | Authenticated | List public target metadata (host only) |
| `/targets` | `POST` | `admin` | Create webhook or Slack target |
| `/targets/:id` | `PUT` | `admin` | Update target settings |
| `/targets/:id` | `DELETE` | `admin` | Delete target |
| `/targets/:id/test`| `POST` | `admin` | Send test event |

---

## 7. Security & Trust Architecture

1. **SSRF Guardrails with Socket Pinning:**
   - Target URLs must be HTTPS unless explicitly configured in local dev (`DISPATCH_ALLOW_INSECURE=true`).
   - Domain resolution pre-flight checks and socket connection handlers reject loopback, RFC 1918 private ranges, link-local, multicast, and cloud metadata IPs (`169.254.169.254`).
   - Direct socket binding to pre-validated IP addresses eliminates TOCTOU DNS rebinding.
   - HTTP redirects are disabled (`redirect: 'manual'`).
2. **Credential Hygiene:**
   - Provider API keys reside exclusively in server process environment variables.
   - Stored webhook URLs are write-only from the client perspective; API responses echo only the destination hostname.
   - Passwords are salted and hashed using `scryptSync` (N=16384, r=8, p=1).
3. **Session Security:**
   - Session tokens are 256-bit cryptographically secure random values transmitted via `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
4. **Rate Limiting & DoS Protection:**
   - General API: 120 req/min per IP.
   - AI & Dispatch: 40 req/min per IP.
   - Body size cap: Strict 128 KB JSON parsing limit.
