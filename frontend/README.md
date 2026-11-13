# AEGIS frontend

React 19 + TypeScript + Vite client for AEGIS.

## Surfaces

- `/` — landing page (`src/pages/LandingPage.tsx`).
- `/terms` — Terms of Service (`src/pages/TermsPage.tsx`).
- `/privacy` — Privacy Policy (`src/pages/PrivacyPage.tsx`).
- `/cookies` — Cookie Policy (`src/pages/CookiesPage.tsx`).
- `/app`, `/app/voice`, `/app/dispatch`, `/app/agents`, `/app/settings` — workspace (`src/pages/WorkspacePage.tsx`).

Routing uses the History API in `src/lib/router.ts`. There is no router dependency. `scripts/postbuild.mjs` copies the built `index.html` to `dist/app/index.html`, `dist/terms/index.html`, `dist/privacy/index.html`, `dist/cookies/index.html`, and `dist/404.html` so static hosts can boot deep links.

## Commands

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # speech-engine and landing field tests
npm run lint     # oxlint
npm run build    # type-check + Vite build + /app fallback
```

The workspace expects the API on `http://localhost:3001` during development. Set `VITE_API_BASE_URL` to use another origin, or `/` when the API is same-origin in production.

## Structure

```
scripts/
  postbuild.mjs
src/
  components/
    AegisFieldCanvas.tsx
    Icons.tsx
    ui.tsx
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
    CookiesPage.tsx
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
  App.tsx
  index.css
  main.tsx
  types.ts
test/
  gravityField.test.ts
  tts.test.ts
```

## Behavior notes

- No demo or sandbox fallback. If the API is offline, the workspace shows a connection gate.
- Provider keys and raw dispatch URLs never reach the browser.
- Speech recognition and synthesis are browser-native. No cloud TTS is configured.
- `utils/tts.ts` and `lib/gravityFieldMath.ts` must stay free of DOM-only top-level side effects so Node can run their tests directly.
