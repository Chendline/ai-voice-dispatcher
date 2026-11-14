# Graph Report - ai-voice-dispatcher  (2026-11-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 621 nodes · 1494 edges · 34 communities (32 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `05a4858b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SqliteWorkspaceStore
- tts.ts
- SettingsPanel.tsx
- Icons.tsx
- playTap
- config.ts
- registry.ts
- dispatch.ts
- validation.ts
- app.ts
- gravityField.ts
- compilerOptions
- compilerOptions
- frontend/package.json
- frontend
- backend/package.json
- compilerOptions
- DispatchPanel.tsx
- WorkspacePage.tsx
- useSpeechRecognition.ts
- color-pair.tsx
- showcase-coverage.mjs
- persistence.ts
- devDependencies
- ProviderRegistry
- dependencies
- devDependencies
- .oxlintrc.json
- scripts
- cookieConsent.test.ts
- scripts
- dependencies
- main.tsx
- frontend/tsconfig.json

## God Nodes (most connected - your core abstractions)
1. `SqliteWorkspaceStore` - 50 edges
2. `createApp()` - 30 edges
3. `SpeechPlaybackController` - 27 edges
4. `base()` - 25 edges
5. `playTap()` - 24 edges
6. `react` - 24 edges
7. `navigate()` - 22 edges
8. `compilerOptions` - 18 edges
9. `now()` - 16 edges
10. `readConfig()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Request` --references--> `PublicUser`  [EXTRACTED]
  backend/src/auth.ts → backend/src/types.ts
- `AppDeps` --references--> `SqliteWorkspaceStore`  [EXTRACTED]
  backend/src/app.ts → backend/src/db.ts
- `PlanDispatchInput` --references--> `Agent`  [EXTRACTED]
  backend/src/dispatch.ts → backend/src/types.ts
- `ExecuteDispatchOptions` --references--> `DispatchLog`  [EXTRACTED]
  backend/src/dispatch.ts → backend/src/types.ts
- `ExecuteDispatchOptions` --references--> `DispatchTarget`  [EXTRACTED]
  backend/src/dispatch.ts → backend/src/types.ts

## Import Cycles
- None detected.

## Communities (34 total, 2 thin omitted)

### Community 0 - "SqliteWorkspaceStore"
Cohesion: 0.06
Nodes (30): Request, buildSystemPrompt(), ChatInput, ChatOutput, now(), runChat(), DEFAULT_SYSTEM_PROMPT, hostOf() (+22 more)

### Community 1 - "tts.ts"
Cohesion: 0.07
Nodes (36): groupVoices(), SpeechController, SpeechSettingsPanel(), STATUS_LABEL, statusTone(), clamp(), persistSettings(), readSettings() (+28 more)

### Community 2 - "SettingsPanel.tsx"
Cohesion: 0.10
Nodes (41): CheckIcon(), PlusIcon(), EmptyState(), formatRelative(), initials(), Notice(), Pill(), PillTone (+33 more)

### Community 3 - "Icons.tsx"
Cohesion: 0.12
Nodes (30): AegisFieldCanvas(), AgentsIcon(), AlertIcon(), ArrowUpRight(), base(), BoltIcon(), ChatIcon(), ChevronIcon() (+22 more)

### Community 4 - "playTap"
Cohesion: 0.19
Nodes (25): App(), CookieNotice(), ArrowRight(), LogoMark(), ShieldIcon(), currentPath(), isCookiesPath(), isPrivacyPath() (+17 more)

### Community 5 - "config.ts"
Cohesion: 0.13
Nodes (18): ProviderId, readConfig(), readHttpsBase(), readKey(), readModels(), readTimeout(), config, deps() (+10 more)

### Community 6 - "registry.ts"
Cohesion: 0.20
Nodes (17): AnthropicPayload, createAnthropicAdapter(), createGoogleAdapter(), GeminiPayload, createOpenAiCompatibleAdapter(), OpenAiPayload, createAdapter(), ChatRequest (+9 more)

### Community 7 - "dispatch.ts"
Cohesion: 0.16
Nodes (19): checkTargetUrl(), executeDispatch(), ExecuteDispatchOptions, hostOf(), now(), parsePlannerJson(), planDispatch(), postTarget() (+11 more)

### Community 8 - "validation.ts"
Cohesion: 0.16
Nodes (22): PRIORITIES, Priority, TargetType, AgentInput, ChatInput, ClientPlan, ExecuteInput, isRecord() (+14 more)

### Community 9 - "app.ts"
Cohesion: 0.20
Nodes (17): AsyncHandler, createApp(), providerErrorStatus(), sendProviderError(), createAuthMiddleware(), Express, extractAuthToken(), formatClearCookie() (+9 more)

### Community 10 - "gravityField.ts"
Cohesion: 0.19
Nodes (17): Bounds, createEnvironmentTexture(), createGravityField(), FieldSphere, GravityFieldHandle, GravityFieldOptions, MATERIAL_SPECS, mulberry32() (+9 more)

### Community 11 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 13 - "frontend/package.json"
Cohesion: 0.14
Nodes (13): @types/node, typescript, name, private, type, version, lenis, oxlint (+5 more)

### Community 14 - "frontend"
Cohesion: 0.14
Nodes (13): root, runtime, buildCommand, framework, outputDirectory, rewrites, root, headers (+5 more)

### Community 15 - "backend/package.json"
Cohesion: 0.15
Nodes (12): description, main, name, version, cors, dotenv, express-rate-limit, helmet (+4 more)

### Community 16 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir, rootDir (+4 more)

### Community 17 - "DispatchPanel.tsx"
Cohesion: 0.33
Nodes (10): formatTime(), DispatchPanel(), PRIORITIES, statusTone(), DispatchPlan, Priority, getAudioContext(), playDispatchComplete() (+2 more)

### Community 18 - "WorkspacePage.tsx"
Cohesion: 0.20
Nodes (10): AgentsPanel(), toInput(), LoadStatus, useWorkspaceData(), api, WorkspaceSection, readAgentId(), SECTION_COPY (+2 more)

### Community 19 - "useSpeechRecognition.ts"
Cohesion: 0.18
Nodes (11): ChatPanel(), readSpeakSetting(), VoicePanel(), describeRecognitionError(), RecognitionConstructor, RecognitionErrorEvent, RecognitionEvent, RecognitionResult (+3 more)

### Community 20 - "color-pair.tsx"
Cohesion: 0.25
Nodes (7): ColorPair(), contrast(), luminance(), toHex(), toRgb(), defaultStates, ref_lib

### Community 21 - "showcase-coverage.mjs"
Cohesion: 0.20
Nodes (9): components, missing, source, [uiArg, ...roots], uiDir, walk(), dist, ref_node_fs (+1 more)

### Community 22 - "persistence.ts"
Cohesion: 0.33
Nodes (7): main(), hydrateWorkspace(), persistenceEnabled, persistWorkspace(), readState(), stateId, backend_src_store_workspacestore

### Community 23 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, oxlint, @types/node, @types/react, @types/react-dom, @types/three, typescript, vite (+1 more)

### Community 24 - "ProviderRegistry"
Cohesion: 0.32
Nodes (5): AppDeps, AppConfig, ProviderConfig, PlanDispatchInput, ProviderRegistry

### Community 25 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, cors, dotenv, express, express-rate-limit, helmet, @vercel/blob

### Community 26 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, tsx, @types/cors, @types/express, @types/node, typescript

### Community 27 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 28 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, test

### Community 29 - "cookieConsent.test.ts"
Cohesion: 0.60
Nodes (4): COOKIE_CONSENT_KEY, CookieConsentRecord, hasCookieConsent(), recordCookieConsent()

### Community 30 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, start, test

### Community 31 - "dependencies"
Cohesion: 0.40
Nodes (5): dependencies, lenis, react, react-dom, three

## Knowledge Gaps
- **182 isolated node(s):** `ChatInput`, `ChatUsage`, `Session`, `SpeechController`, `ControllerCallbacks` (+177 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 218 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Icons.tsx` to `main.tsx`, `tts.ts`, `SettingsPanel.tsx`, `playTap`, `frontend/package.json`, `DispatchPanel.tsx`, `WorkspacePage.tsx`, `useSpeechRecognition.ts`, `color-pair.tsx`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Why does `SqliteWorkspaceStore` connect `SqliteWorkspaceStore` to `config.ts`, `dispatch.ts`, `app.ts`, `persistence.ts`, `ProviderRegistry`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **What connects `ChatInput`, `ChatUsage`, `Session` to the rest of the system?**
  _182 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SqliteWorkspaceStore` be split into smaller, more focused modules?**
  _Cohesion score 0.06126331811263318 - nodes in this community are weakly interconnected._
- **Should `tts.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07163461538461538 - nodes in this community are weakly interconnected._
- **Should `SettingsPanel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09879336349924585 - nodes in this community are weakly interconnected._
- **Should `Icons.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11586452762923351 - nodes in this community are weakly interconnected._