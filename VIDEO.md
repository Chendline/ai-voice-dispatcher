# AEGIS — Walkthrough Video Script

**Run time:** ~3:00  
**URL:** [aivoicedispatcher.vercel.app](https://aivoicedispatcher.vercel.app) / `http://localhost:5173/`

---

#### Scene 1: The Problem & The Core Loop (0:00 – 0:30)
* **Visual**: Camera opens on the AEGIS landing page featuring the organic Three.js gravity field and clean typography. Smooth-scroll past the core loop diagram: *configure provider → configure agent → chat or speak → plan → approve targets → execute → inspect result*.
* **Voiceover**:
> *"Operational teams handle critical incidents through chat and voice every day. But most AI assistants stop at generating text—leaving operators to manually copy transcripts, file tickets, post to Slack, and trigger webhooks. That manual friction creates context drift, slows response times, and hides failures.*
>
> *Meet **AEGIS**: an independent, voice-first AI workspace where conversations terminate in a governed, human-reviewed dispatch. Connect your own model provider, configure specialized agents, talk or type, review a structured dispatch plan, and execute to HTTPS webhooks or Slack with verifiable outcomes."*

---

#### Scene 2: Multi-Provider Abstraction & Honest Configuration (0:30 – 0:55)
* **Visual**: Click **Launch AEGIS** to enter `/app`. Navigate to **Settings → AI providers**. Show the supported provider roster: Anthropic Messages API, OpenAI Chat Completions, Google Gemini, OpenRouter, Groq, and custom OpenAI-compatible endpoints. Point out the configured badges.
* **Voiceover**:
> *"AEGIS is provider-agnostic. A single unified adapter contract drives Anthropic, OpenAI, Google Gemini, OpenRouter, Groq, or any OpenAI-compatible API.
>
> All credentials remain strictly server-side. The browser only receives public provider presence and model lists. And AEGIS is radically honest: if no provider key is configured, chat returns a transparent configuration error rather than fabricating a simulated local response."*

---

#### Scene 3: Voice-First Workspace & Agents (0:55 – 1:30)
* **Visual**: Open **Agents** and select an agent (e.g. *Incident Commander*). Show the agent configuration: system prompt, provider, model ID, temperature, max tokens, voice rate/pitch, and suggested targets. Navigate to **Voice** (`/app/voice`). Click the microphone button to dictate an incident: *"Production database cluster in eu-west experiencing severe connection timeouts."* Watch the live interim transcript populate. Hear the assistant speak back using the local Web Speech synthesizer. Expand **Voice Diagnostics** to show engine support, local vs. network voices, and chunk progress.
* **Voiceover**:
> *"Each agent owns its prompt, provider, parameters, and voice personality.
>
> AEGIS delivers a voice-first experience using browser-native Web Speech recognition and local speech synthesis. Our audio pipeline features sentence-aware chunking, watchdog auto-recovery, and deep client diagnostics—delivering dependable voice interaction across modern browsers with zero cloud TTS fees."*

---

#### Scene 4: Governed Dispatch Planning (1:30 – 2:05)
* **Visual**: Switch to the **Dispatch workbench** (`/app/dispatch`). Click **Plan dispatch** from the active conversation. Watch the planner generate a structured dispatch proposal: Event name, Title, Summary, Priority (*Urgent*), and Suggested Targets. Highlight the `source: "ai"` badge with provider and model metadata.
* **Voiceover**:
> *"When a conversation produces an operational decision, we transition to Governed Dispatch. 
>
> The model analyzes the conversation history and drafts an actionable dispatch plan with a clear title, summary, priority, and target recommendations.
>
> Crucially, thinking and acting are decoupled. If an AI provider is unreachable, AEGIS cleanly falls back to a deterministic, labeled local rules planner. We never disguise a heuristic plan as AI."*

---

#### Scene 5: Human Review & SSRF-Guarded Execution (2:05 – 2:40)
* **Visual**: Edit the priority or summary. Check the target checkboxes for an HTTPS Webhook and a Slack channel. Click **Execute dispatch**. The real-time dispatch log records the execution: per-target HTTP status (e.g. `200 OK`), round-trip latency, sanitized response detail, and aggregate status (`dispatched`). Show that target URLs are write-only and only hostnames are echoed.
* **Voiceover**:
> *"Every dispatch requires explicit human approval before external side-effects happen. You review the payload, refine the details, and select the targets.
>
> On execution, the server enforces strict SSRF guards—rejecting loopback addresses, private network CIDRs, and embedded credentials. The dispatch posts server-side and logs the exact outcome: dispatched, partial, failed, or skipped. No faked connector success."*

---

#### Scene 6: Architecture, Durability & Summary (2:40 – 3:00)
* **Visual**: Briefly show the repository structure, test runner passing in terminal, and optional Vercel Blob persistence configuration. Return to the landing page.
* **Voiceover**:
> *"AEGIS runs on Express and React 19, with modular provider adapters, SSRF-guarded dispatches, and optional durable state via Vercel Blob.
>
> A complete, truthful, voice-first operational workspace. AEGIS is open source, tested, and live at aivoicedispatcher.vercel.app."*
