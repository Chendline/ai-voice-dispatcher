# AI Voice Agent Dispatcher

A multi-tenant SaaS platform where businesses embed an AI-powered voice dispatch agent into their own product. Each customer connects their own communication and CRM tools through Fastn — the agent handles call routing, ticket creation, notifications, and logging automatically.

Built for the **Fastn Online Hackathon 2026**.

---

## What it does

The AI Voice Agent Dispatcher lets businesses give their customers a smart voice agent that can:

- Receive an inbound request (voice or form trigger)
- Classify and route it to the right team or action
- Create a ticket in a connected CRM (e.g. HubSpot)
- Send a notification via Slack or email
- Log the interaction to a connected sheet or database
- All of this happens inside the business's own product, using their own connected accounts

Each customer (tenant) connects their own accounts. Data stays isolated per tenant.

---

## Tech stack

| Layer | Tool |
|---|---|
| Integrations platform | Fastn (embedded via SDK/iframe) |
| AI agent | Claude (via MCP or API) |
| Frontend | React / Next.js |
| Backend | Node.js / Express |
| Connectors used | HubSpot, Slack, Gmail, Google Sheets, Twilio (or similar) |

---

## Fastn integrations (5+ required)

1. **HubSpot** — create/update contacts and tickets
2. **Slack** — send dispatch notifications to a channel
3. **Gmail** — send confirmation emails to callers
4. **Google Sheets** — log all dispatch events
5. **Twilio / phone trigger** — receive inbound call or form trigger
6. *(Stretch)* Custom connector — internal ticketing or scheduling tool

---

## Two-tenant test

The project passes the required two-tenant test:

1. Two customer tenants are created in the app (e.g. "Tenant A" and "Tenant B")
2. Each tenant connects a different account for each integration
3. The same dispatch workflow runs for both
4. Data is fully isolated — Tenant A never sees Tenant B's tickets, logs, or messages

---

## Project structure

```
ai-voice-dispatcher/
├── frontend/          # React app with embedded Fastn connect widget
├── backend/           # API server, workflow triggers, tenant logic
├── fastn/             # Fastn workflow configs and connector definitions
├── agent/             # AI agent logic (Claude MCP or prompt configs)
├── demo/              # Demo video and screenshots
└── README.md
```

---

## Getting started

### Prerequisites

- Node.js 18+
- A Fastn account (free at fastn.com)
- Test accounts for: HubSpot, Slack, Gmail, Google Sheets

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/ai-voice-dispatcher.git
cd ai-voice-dispatcher

# Install dependencies
npm install

# Copy env file and fill in your keys
cp .env.example .env

# Run the dev server
npm run dev
```

### Environment variables

```
FASTN_API_KEY=
FASTN_WORKSPACE_ID=
CLAUDE_API_KEY=
PORT=3000
```

---

## Submission checklist

- [ ] Fastn connect widget embedded in UI
- [ ] 5+ working integrations with real auth
- [ ] Two-tenant test passing and shown in demo video
- [ ] Demo video in English, 3 minutes or less
- [ ] All links open publicly (test in logged-out browser)
- [ ] README complete
- [ ] Feedback form filled by every team member

---

## Team

| Name | GitHub |
|---|---|
| Muhammad Aqil | @YOUR_USERNAME |
| Rihix | @rihix |

---

## License

MIT
