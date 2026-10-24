#### Scene 1: The Hook & The Problem (0:00 – 0:25)
* **Visual**: Camera starts on the sleek, organic UI of AEGIS at [aivoicedispatcher.vercel.app](https://aivoicedispatcher.vercel.app). Hover over the glowing live waveform and the "Live API" badge.
* **Voiceover**:
> *"When enterprise support teams receive emergency voice calls, seconds count. But voice data is usually trapped in silos—leaving engineers to manually copy transcripts, file tickets, alert Slack, and log audit spreadsheets.*
>
> *Meet **AEGIS**: a multi-tenant AI voice dispatch platform powered by FastN. We transform raw inbound audio into structured, classified dispatches that instantly route into HubSpot, Slack, Gmail, and Google Sheets—completely isolated for every tenant."*

---

#### Scene 2: Two-Tenant Isolation Proof (0:25 – 0:55)
* **Visual**: Click on the segmented tenant toggle between **Tenant A (Acme Corp)** and **Tenant B (Nexus Logistics)**. Notice the tactile mechanical switch sound ([soundEffects.ts](file:///Users/shaf/Desktop/projects/NaSCon%20%2726/FastN/ai-voice-dispatcher/frontend/src/utils/soundEffects.ts)) and immediate event feed isolation. Show the connectors tab where Tenant A uses `#acme-dispatch` and Tenant B uses `#nexus-alerts`.
* **Voiceover**:
> *"In a multi-tenant SaaS architecture, zero data leakage is mandatory. Notice our segmented vault switcher: switching from Acme Corp to Nexus Logistics instantly clears the feed and rehydrates distinct integration bindings.*
> 
> *Acme routes alerts to `#acme-dispatch` and logs to their dedicated audit ledger. Nexus routes to `#nexus-alerts` and their fleet sheet. Every single dispatch payload carries an explicit tenant header down to FastN, guaranteeing 100% customer isolation."*

---

#### Scene 3: Voice Simulation, Dictation & Native TTS (0:55 – 1:30)
* **Visual**: Switch back to Tenant A. Click the **"Critical DB Outage"** preset chip (or hit the mic button to dictate live). Show the text populate. Scroll slightly down to the **Voice Playback** card. Hit **Play Voice**. Let the browser TTS speak the transcription for 3–4 seconds. Expand the **Audio Diagnostics** panel to show engine detection and chunking.
* **Voiceover**:
> *"Let’s load a real-world incident: 'Production database cluster in eu-west-1 experiencing severe connection timeouts.'*
> 
> *AEGIS features an integrated procedural audio haptic engine, live browser microphone dictation, and a resilient client-side speech engine. Let’s listen to the call transcription.*
> *(TTS speaks)*
> *Our voice player operates natively via Web Speech with sentence-aware chunking, watchdog auto-recovery, and deep diagnostics—ensuring dispatchers can listen back reliably across any browser."*

---

#### Scene 4: Live FastN Multi-Connector Dispatch (1:30 – 2:10)
* **Visual**: Click the glowing copper button **"Initiate Voice Dispatch"**. Hear the ascending audio ramp. Watch the 4-step pipeline stepper light up step-by-step with pentatonic tick tones:
  1. *Twilio Voice Ingestion*
  2. *Claude AI Classification*
  3. *FastN Multi-Tenant Router*
  4. *Connected Integrations*
  The chord chime plays as the new event card drops smoothly at the top of the feed with an **Urgent / Emergency** badge. Click the event card to expand the JSON trace inspector.
* **Voiceover**:
> *"Now, let's trigger the dispatch. Watch the pipeline in action.*
> *(Stepper ticks: 1... 2... 3... 4... Chime!)*
>
> *Under the hood, Claude analyzes the query in real-time, categorizing it as an 'Emergency' with 'Urgent' priority. FastN's orchestration engine then takes over, fanning out simultaneous workflow calls:*
> - *A high-priority ticket is opened in **HubSpot** with reference `HS-591240`.*
> - *An immediate incident broadcast lands in Slack channel `#acme-dispatch`.*
> - *A confirmation receipt is dispatched via **Gmail**.*
> - *And an immutable audit row is appended directly to **Google Sheets**.*
> *We can inspect the exact live JSON trace right here in the dashboard."*

---

#### Scene 5: Truthful Outcomes & Resilience (2:10 – 2:35)
* **Visual**: Navigate to the **Connectors** tab. Toggle off **Gmail** or **HubSpot** using the switch. Run another preset. Show that the dispatch card reflects the toggled connector as paused, and reports honest connector statuses (`dispatched`, `partial`, or `simulated`) rather than fabricating false positives.
* **Voiceover**:
> *"AEGIS enforces truthful outcomes. If a tenant pauses an integration or a third-party API rate-limits, our status reporter marks the run as 'partial' or 'failed'—never falsely claiming success.*
> 
> *Furthermore, tenant state is mirrored to durable Vercel Blob storage, while our offline sandbox vault ensures zero downtime during public product demonstrations."*

---

#### Scene 6: Conclusion & Call to Action (2:35 – 2:50)
* **Visual**: Zoom out to the full dashboard. Show the footer with the repo link and [aivoicedispatcher.vercel.app](https://aivoicedispatcher.vercel.app).
* **Voiceover**:
> *"Building multi-tenant enterprise integrations used to require months of custom API adapters, token refreshes, and maintenance. FastN unified our entire pipeline into published, isolated workflows in hours.*
>
> *AEGIS is open source, tested, and live right now at **aivoicedispatcher.vercel.app**. Thank you!"*