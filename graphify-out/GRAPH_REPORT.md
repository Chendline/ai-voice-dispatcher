# Graph Report - ai-voice-dispatcher  (2026-11-15)

## Corpus Check
- 91 files · ~80,494 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: .css 7, (none) 4, .example 1)

## Summary
- 1008 nodes · 1962 edges · 62 communities (60 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f8895f69`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SqliteWorkspaceStore
- tts.ts
- frontend/src/types.ts
- Icons.tsx
- router.ts
- dispatch.test.ts
- chat.ts
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
- AGENTS.md
- WorkspacePage.tsx
- The Design System Page
- playTap
- persistence.ts
- AEGIS
- ProviderRegistry
- backend/src/types.ts
- ChatPanel.tsx
- .oxlintrc.json
- Apple Design
- 4. Backend rules
- Design Systems from DESIGN.md
- shadcn/ui
- AEGIS — Product & Technical Specification (SRS)
- frontend/tsconfig.json
- Commands
- Customization & Theming
- AEGIS-Product-Plan_2b6e72dc.md
- Component Composition
- Styling & Customization
- Tools
- Chat & Messaging
- Design Engineering
- Base vs Radix
- Component Building Principles
- Forms & Inputs
- The Animation Decision Framework
- clip-path for Animation
- Performance Rules
- Gesture and Drag Interactions
- AEGIS frontend
- CSS Transform Mastery
- The Sonner Principles (Building Loved Components)
- Spring Animations
- Icons
- Core Philosophy
- Debugging Animations
- Registry Authoring and Addresses
- SpeechSettings.tsx
- dependencies
- devDependencies
- scripts

## God Nodes (most connected - your core abstractions)
1. `SqliteWorkspaceStore` - 54 edges
2. `base()` - 34 edges
3. `createApp()` - 32 edges
4. `SpeechPlaybackController` - 27 edges
5. `react` - 24 edges
6. `playTap()` - 24 edges
7. `navigate()` - 23 edges
8. `Apple Design` - 20 edges
9. `compilerOptions` - 18 edges
10. `readConfig()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Provider adapters` --references--> `ProviderError`  [INFERRED]
  AGENTS.md → backend/src/providers/types.ts
- ``info` — Project information` --references--> `base()`  [INFERRED]
  .agents/skills/shadcn/cli.md → frontend/src/components/Icons.tsx
- `Switching Presets` --references--> `base()`  [INFERRED]
  .agents/skills/shadcn/cli.md → frontend/src/components/Icons.tsx
- `Inputs to Confirm` --references--> `base()`  [INFERRED]
  .agents/skills/shadcn/design-system.md → frontend/src/components/Icons.tsx
- `Picking a style` --references--> `base()`  [INFERRED]
  .agents/skills/shadcn/design-system.md → frontend/src/components/Icons.tsx

## Import Cycles
- None detected.

## Communities (62 total, 2 thin omitted)

### Community 0 - "SqliteWorkspaceStore"
Cohesion: 0.06
Nodes (32): components, missing, source, [uiArg, ...roots], uiDir, walk(), ChatOutput, decryptTargetUrl() (+24 more)

### Community 1 - "tts.ts"
Cohesion: 0.08
Nodes (29): clamp(), persistSettings(), readSettings(), TEST_VOICE_SAMPLE, useSpeechPlayback(), chunkText(), clamp(), ControllerCallbacks (+21 more)

### Community 2 - "frontend/src/types.ts"
Cohesion: 0.12
Nodes (21): AuthCard(), ApiError, configuredBase, request(), AgentInput, AuthStatus, ChatUsage, ConversationSummary (+13 more)

### Community 3 - "Icons.tsx"
Cohesion: 0.13
Nodes (28): AgentsIcon(), AlertIcon(), ArrowUpRight(), base(), BoltIcon(), ChatIcon(), ChevronIcon(), CloseIcon() (+20 more)

### Community 4 - "router.ts"
Cohesion: 0.12
Nodes (28): 5. Frontend rules, Data layer, Landing field, Routing, Sound, State and components, Styling and UX, Voice (+20 more)

### Community 5 - "dispatch.test.ts"
Cohesion: 0.14
Nodes (16): ProviderId, readConfig(), readHttpsBase(), readKey(), readModels(), readTimeout(), config, deps() (+8 more)

### Community 6 - "chat.ts"
Cohesion: 0.12
Nodes (26): buildSystemPrompt(), ChatInput, now(), runChat(), AnthropicPayload, createAnthropicAdapter(), createGoogleAdapter(), GeminiPayload (+18 more)

### Community 7 - "dispatch.ts"
Cohesion: 0.17
Nodes (21): Dispatch, checkTargetUrl(), executeDispatch(), hostOf(), now(), parsePlannerJson(), pinnedFetch(), PinnedFetchOptions (+13 more)

### Community 8 - "validation.ts"
Cohesion: 0.17
Nodes (21): Priority, TargetType, AgentInput, ChatInput, ClientPlan, ExecuteInput, isRecord(), parseAgentRequest() (+13 more)

### Community 9 - "app.ts"
Cohesion: 0.22
Nodes (16): AsyncHandler, createApp(), providerErrorStatus(), sendProviderError(), createAuthMiddleware(), Express, extractAuthToken(), formatClearCookie() (+8 more)

### Community 10 - "gravityField.ts"
Cohesion: 0.19
Nodes (17): AegisFieldCanvas(), Bounds, createEnvironmentTexture(), createGravityField(), FieldSphere, GravityFieldHandle, GravityFieldOptions, MATERIAL_SPECS (+9 more)

### Community 11 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 13 - "frontend/package.json"
Cohesion: 0.06
Nodes (34): dependencies, lenis, react, react-dom, three, devDependencies, oxlint, @types/node (+26 more)

### Community 14 - "frontend"
Cohesion: 0.14
Nodes (13): root, runtime, buildCommand, framework, outputDirectory, rewrites, root, headers (+5 more)

### Community 15 - "backend/package.json"
Cohesion: 0.15
Nodes (12): description, @types/node, typescript, main, name, version, cors, express-rate-limit (+4 more)

### Community 16 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir, rootDir (+4 more)

### Community 17 - "DispatchPanel.tsx"
Cohesion: 0.44
Nodes (8): formatTime(), DispatchPanel(), PRIORITIES, statusTone(), getAudioContext(), playDispatchComplete(), playDispatchLaunch(), playStepTick()

### Community 18 - "AGENTS.md"
Cohesion: 0.15
Nodes (11): 12. Definition of done, 1. Product direction, 2. Architecture, 3. Commands, 6. Honesty rules (non-negotiable), 7. Security, 8. Testing, 9. Dependency policy (+3 more)

### Community 19 - "WorkspacePage.tsx"
Cohesion: 0.16
Nodes (20): Component Structure → [composition.md](./rules/composition.md), EmptyState(), Notice(), Pill(), PillTone, Spinner(), AgentsPanel(), toInput() (+12 more)

### Community 20 - "The Design System Page"
Cohesion: 0.08
Nodes (30): ColorPair(), contrast(), luminance(), toHex(), toRgb(), defaultStates, previewState(), StateMatrix() (+22 more)

### Community 21 - "playTap"
Cohesion: 0.24
Nodes (15): ArrowRight(), CheckIcon(), LogoMark(), ShieldIcon(), ChatPanel(), navigate(), CookiesPage(), CURRENT_YEAR (+7 more)

### Community 22 - "persistence.ts"
Cohesion: 0.21
Nodes (11): 10. Git and deployment, Accessibility, Address Schemes, main(), hydrateWorkspace(), persistenceEnabled, persistWorkspace(), readState() (+3 more)

### Community 23 - "AEGIS"
Cohesion: 0.06
Nodes (32): Add a dispatch target, Add a provider, AEGIS, Agents, Any Node host, API, Architecture, Backend responsibilities (+24 more)

### Community 24 - "ProviderRegistry"
Cohesion: 0.24
Nodes (7): AppDeps, AppConfig, ProviderConfig, ExecuteDispatchOptions, PlanDispatchInput, ProviderRegistry, DispatchPlan

### Community 25 - "backend/src/types.ts"
Cohesion: 0.18
Nodes (9): Request, ChatUsage, DispatchResult, DispatchStatus, PRIORITIES, PublicUser, Session, TARGET_TYPES (+1 more)

### Community 26 - "ChatPanel.tsx"
Cohesion: 0.15
Nodes (21): MicIcon(), formatRelative(), initials(), ChatPanelProps, MessageRow(), SUGGESTIONS, readSpeakSetting(), VoicePanel() (+13 more)

### Community 27 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 28 - "Apple Design"
Cohesion: 0.10
Nodes (20): 10. Gesture design details (the "feel" checklist), 11. Frame-level smoothness, 12. Materials & depth — translucency conveys hierarchy, 13. Multimodal feedback — motion + sound + haptics, 14. Reduced motion & accessibility, 15. Typography — optical sizing, tracking, leading, 16. Design foundations — the eight principles, 17. Process (+12 more)

### Community 29 - "4. Backend rules"
Cohesion: 0.22
Nodes (9): 11. Common pitfalls, 4. Backend rules, API responses, Chat, Configuration, Provider adapters, Store and persistence, Validation (+1 more)

### Community 30 - "Design Systems from DESIGN.md"
Cohesion: 0.10
Nodes (21): Contents, Coverage check, Dark mode, Design Systems from DESIGN.md, Elevation, Focus, Fonts, Inputs to Confirm (+13 more)

### Community 31 - "shadcn/ui"
Cohesion: 0.11
Nodes (19): Chat & Messaging → [chat.md](./rules/chat.md), CLI, Component Docs, Examples, and Usage, Component Selection, Critical Rules, Current Project Context, Design Systems from DESIGN.md, Detailed References (+11 more)

### Community 32 - "AEGIS — Product & Technical Specification (SRS)"
Cohesion: 0.12
Nodes (16): 1. Product Summary & Purpose, 2.1 Implemented Capabilities, 2.2 Active Remediation Plan (Sprints 1–4), 2.3 Explicit Non-Goals, 2. System Scope & Capability Matrix, 3. User Journeys, 4. Technical Architecture, 5.1 Relational SQLite Schema (+8 more)

### Community 34 - "Commands"
Cohesion: 0.12
Nodes (17): `add` — Add components, `apply` — Apply a preset to an existing project, `build` — Build a custom registry, Commands, Contents, `diff` — Check for updates, `docs` — Get component documentation URLs, Dry-Run Mode (+9 more)

### Community 35 - "Customization & Theming"
Cohesion: 0.14
Nodes (14): 1. Built-in variants, 2. Tailwind classes via `className`, 3. Add a new variant, 4. Wrapper components, Adding Custom Colors, Border Radius, Changing the Theme, Checking for Updates (+6 more)

### Community 36 - "AEGIS-Product-Plan_2b6e72dc.md"
Cohesion: 0.14
Nodes (13): Sheet: Architecture, Sheet: Deployment, Sheet: Dispatch, Sheet: Features, Sheet: Future Improvements, Sheet: Milestones, Sheet: Overview, Sheet: Providers (+5 more)

### Community 37 - "Component Composition"
Cohesion: 0.15
Nodes (13): Avatar always needs AvatarFallback, Button has no isPending or isLoading prop, Callouts use Alert, Card structure, Choosing between overlay components, Component Composition, Contents, Dialog, Sheet, and Drawer always need a Title (+5 more)

### Community 38 - "Styling & Customization"
Cohesion: 0.15
Nodes (13): Built-in variants first, className for layout only, Contents, No manual dark: color overrides, No manual z-index on overlay components, No raw color values for status/state indicators, No space-x-* / space-y-*, Prefer size-* over w-* h-* when equal (+5 more)

### Community 39 - "Tools"
Cohesion: 0.17
Nodes (11): Configuring Registries, Setup, `shadcn:get_add_command_for_items`, `shadcn:get_audit_checklist`, `shadcn:get_item_examples_from_registries`, `shadcn:get_project_registries`, `shadcn:list_items_in_registries`, shadcn MCP Server (+3 more)

### Community 41 - "Chat & Messaging"
Cohesion: 0.18
Nodes (11): Assistant activity uses Trace, Attachments use Attachment, Chat & Messaging, Code and tool output use CodeBlock, Contents, Escape hatch: the scroller hooks, Message rows use Message, Message surfaces use Bubble (+3 more)

### Community 42 - "Design Engineering"
Cohesion: 0.22
Nodes (8): Accessibility, Design Engineering, Initial Response, prefers-reduced-motion, Review Checklist, Review Format (Required), Stagger Animations, Touch device hover states

### Community 43 - "Base vs Radix"
Cohesion: 0.22
Nodes (9): Accordion, Base vs Radix, Button / trigger as non-button element (base only), Composition: asChild (radix) vs render (base), Contents, Select, Select — multiple selection and object values (base only), Slider (+1 more)

### Community 44 - "Component Building Principles"
Cohesion: 0.25
Nodes (8): Animate enter states with @starting-style, Buttons must feel responsive, Component Building Principles, Make popovers origin-aware, Never animate from scale(0), Tooltips: skip delay on subsequent hovers, Use blur to mask imperfect transitions, Use CSS transitions over keyframes for interruptible UI

### Community 45 - "Forms & Inputs"
Cohesion: 0.25
Nodes (8): Buttons inside inputs use InputGroup + InputGroupAddon, Contents, Field validation and disabled states, FieldSet + FieldLegend for grouping related fields, Forms & Inputs, Forms use FieldGroup + Field, InputGroup requires InputGroupInput/InputGroupTextarea, Option sets (2–7 choices) use ToggleGroup

### Community 46 - "The Animation Decision Framework"
Cohesion: 0.33
Nodes (6): 1. Should this animate at all?, 2. What is the purpose?, 3. What easing should it use?, 4. How fast should it be?, Perceived performance, The Animation Decision Framework

### Community 47 - "clip-path for Animation"
Cohesion: 0.33
Nodes (6): clip-path for Animation, Comparison sliders, Hold-to-delete pattern, Image reveals on scroll, Tabs with perfect color transitions, The inset shape

### Community 48 - "Performance Rules"
Cohesion: 0.33
Nodes (6): CSS animations beat JS under load, CSS variables are inheritable, Framer Motion hardware acceleration caveat, Only animate transform and opacity, Performance Rules, Use WAAPI for programmatic CSS animations

### Community 49 - "Gesture and Drag Interactions"
Cohesion: 0.33
Nodes (6): Damping at boundaries, Friction instead of hard stops, Gesture and Drag Interactions, Momentum-based dismissal, Multi-touch protection, Pointer capture for drag

### Community 50 - "AEGIS frontend"
Cohesion: 0.33
Nodes (5): AEGIS frontend, Behavior notes, Commands, Structure, Surfaces

### Community 51 - "CSS Transform Mastery"
Cohesion: 0.40
Nodes (5): 3D transforms for depth, CSS Transform Mastery, scale() scales children too, transform-origin, translateY with percentages

### Community 52 - "The Sonner Principles (Building Loved Components)"
Cohesion: 0.40
Nodes (5): Asymmetric enter/exit timing, Cohesion matters, Review your work the next day, The opacity + height combination, The Sonner Principles (Building Loved Components)

### Community 53 - "Spring Animations"
Cohesion: 0.40
Nodes (5): Interruptibility advantage, Spring Animations, Spring-based mouse interactions, Spring configuration, When to use springs

### Community 54 - "Icons"
Cohesion: 0.40
Nodes (4): Icons, Icons in Button use data-icon attribute, No sizing classes on icons inside components, Pass icons as component objects, not string keys

### Community 55 - "Core Philosophy"
Cohesion: 0.50
Nodes (4): Beauty is leverage, Core Philosophy, Taste is trained, not innate, Unseen details compound

### Community 56 - "Debugging Animations"
Cohesion: 0.50
Nodes (4): Debugging Animations, Frame-by-frame inspection, Slow motion testing, Test on real devices

### Community 57 - "Registry Authoring and Addresses"
Cohesion: 0.22
Nodes (9): Build and Verify, GitHub Registries, Include, Item Definitions, Mental Model, Registry Authoring and Addresses, Registry Dependencies, Root `registry.json` (+1 more)

### Community 58 - "SpeechSettings.tsx"
Cohesion: 0.33
Nodes (8): groupVoices(), SpeechController, SpeechSettingsPanel(), STATUS_LABEL, statusTone(), frontend_src_styles_tts, browserLanguage(), languageLabel()

### Community 59 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, cors, dotenv, express, express-rate-limit, helmet, @vercel/blob

### Community 60 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, tsx, @types/cors, @types/express, @types/node, typescript

### Community 61 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, start, test

## Knowledge Gaps
- **458 isolated node(s):** `defaultStates`, `[uiArg, ...roots]`, `uiDir`, `components`, `source` (+453 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 498 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `WorkspacePage.tsx` to `tts.ts`, `frontend/src/types.ts`, `Icons.tsx`, `router.ts`, `SpeechSettings.tsx`, `gravityField.ts`, `frontend/package.json`, `DispatchPanel.tsx`, `The Design System Page`, `playTap`, `ChatPanel.tsx`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `Registry Authoring and Addresses` connect `Registry Authoring and Addresses` to `shadcn/SKILL.md`, `persistence.ts`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `base()` connect `Icons.tsx` to `Commands`, `Chat & Messaging`, `Base vs Radix`, `WorkspacePage.tsx`, `playTap`, `Design Systems from DESIGN.md`, `shadcn/ui`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `SqliteWorkspaceStore` (e.g. with `Codebase Intelligence & Graph Navigation (Mandatory First Step)` and `Store and persistence`) actually correct?**
  _`SqliteWorkspaceStore` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `base()` (e.g. with ``info` — Project information` and `Switching Presets`) actually correct?**
  _`base()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `defaultStates`, `[uiArg, ...roots]`, `uiDir` to the rest of the system?**
  _458 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SqliteWorkspaceStore` be split into smaller, more focused modules?**
  _Cohesion score 0.059466848940533154 - nodes in this community are weakly interconnected._