# Graph Report - ai-voice-dispatcher  (2026-11-15)

## Corpus Check
- 89 files · ~79,363 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: .css 7, (none) 4, .example 1)

## Summary
- 1000 nodes · 1921 edges · 57 communities (55 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0ff3b8e5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SqliteWorkspaceStore
- tts.ts
- SettingsPanel.tsx
- Icons.tsx
- WorkspacePage.tsx
- dispatch.test.ts
- chat.ts
- dispatch.ts
- createApp
- auth.ts
- gravityField.ts
- compilerOptions
- compilerOptions
- frontend/package.json
- frontend
- backend/package.json
- compilerOptions
- DispatchPanel.tsx
- AGENTS.md
- useSpeechRecognition.ts
- The Design System Page
- showcase-coverage.mjs
- app.ts
- AEGIS
- ProviderRegistry
- backend/src/types.ts
- ChatPanel.tsx
- .oxlintrc.json
- Apple Design
- cookieConsent.test.ts
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

## God Nodes (most connected - your core abstractions)
1. `SqliteWorkspaceStore` - 52 edges
2. `base()` - 34 edges
3. `createApp()` - 32 edges
4. `SpeechPlaybackController` - 27 edges
5. `react` - 24 edges
6. `playTap()` - 24 edges
7. `navigate()` - 23 edges
8. `Apple Design` - 20 edges
9. `compilerOptions` - 18 edges
10. `now()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `11. Common pitfalls` --references--> `publicConfig()`  [INFERRED]
  AGENTS.md → backend/src/config.ts
- `Configuration` --references--> `publicConfig()`  [INFERRED]
  AGENTS.md → backend/src/config.ts
- `Provider adapters` --references--> `ProviderError`  [INFERRED]
  AGENTS.md → backend/src/providers/types.ts
- ``info` — Project information` --references--> `base()`  [INFERRED]
  .agents/skills/shadcn/cli.md → frontend/src/components/Icons.tsx
- `Switching Presets` --references--> `base()`  [INFERRED]
  .agents/skills/shadcn/cli.md → frontend/src/components/Icons.tsx

## Import Cycles
- None detected.

## Communities (57 total, 2 thin omitted)

### Community 0 - "SqliteWorkspaceStore"
Cohesion: 0.10
Nodes (7): ChatOutput, now(), SqliteWorkspaceStore, Agent, Conversation, ConversationMessage, User

### Community 1 - "tts.ts"
Cohesion: 0.07
Nodes (36): groupVoices(), SpeechController, SpeechSettingsPanel(), STATUS_LABEL, statusTone(), clamp(), persistSettings(), readSettings() (+28 more)

### Community 2 - "SettingsPanel.tsx"
Cohesion: 0.09
Nodes (34): PlusIcon(), TrashIcon(), Pill(), AgentsPanel(), toInput(), AuthCard(), EMPTY_FORM, ENV_KEYS (+26 more)

### Community 3 - "Icons.tsx"
Cohesion: 0.11
Nodes (35): AgentsIcon(), AlertIcon(), ArrowRight(), ArrowUpRight(), base(), BoltIcon(), ChatIcon(), CheckIcon() (+27 more)

### Community 4 - "WorkspacePage.tsx"
Cohesion: 0.20
Nodes (24): Routing, App(), CookieNotice(), currentPath(), isCookiesPath(), isPrivacyPath(), isTermsPath(), isWorkspacePath() (+16 more)

### Community 5 - "dispatch.test.ts"
Cohesion: 0.12
Nodes (20): hashPassword(), verifyPassword(), ProviderId, publicConfig(), readConfig(), readHttpsBase(), readKey(), readModels() (+12 more)

### Community 6 - "chat.ts"
Cohesion: 0.13
Nodes (25): buildSystemPrompt(), ChatInput, now(), runChat(), AnthropicPayload, createAnthropicAdapter(), createGoogleAdapter(), GeminiPayload (+17 more)

### Community 7 - "dispatch.ts"
Cohesion: 0.17
Nodes (21): Dispatch, checkTargetUrl(), executeDispatch(), hostOf(), now(), parsePlannerJson(), pinnedFetch(), PinnedFetchOptions (+13 more)

### Community 8 - "createApp"
Cohesion: 0.18
Nodes (22): createApp(), Priority, TargetType, AgentInput, ChatInput, ClientPlan, ExecuteInput, isRecord() (+14 more)

### Community 9 - "auth.ts"
Cohesion: 0.17
Nodes (13): createAuthMiddleware(), Express, extractAuthToken(), formatClearCookie(), formatSessionCookie(), parseCookie(), Request, requireRole() (+5 more)

### Community 10 - "gravityField.ts"
Cohesion: 0.18
Nodes (18): AegisFieldCanvas(), Bounds, createEnvironmentTexture(), createGravityField(), FieldSphere, GravityFieldHandle, GravityFieldOptions, MATERIAL_SPECS (+10 more)

### Community 11 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 12 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 13 - "frontend/package.json"
Cohesion: 0.05
Nodes (35): dependencies, lenis, react, react-dom, three, devDependencies, oxlint, @types/node (+27 more)

### Community 14 - "frontend"
Cohesion: 0.14
Nodes (13): root, runtime, buildCommand, framework, outputDirectory, rewrites, root, headers (+5 more)

### Community 15 - "backend/package.json"
Cohesion: 0.06
Nodes (32): dependencies, cors, dotenv, express, express-rate-limit, helmet, @vercel/blob, description (+24 more)

### Community 16 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir, rootDir (+4 more)

### Community 17 - "DispatchPanel.tsx"
Cohesion: 0.44
Nodes (8): formatTime(), DispatchPanel(), PRIORITIES, statusTone(), getAudioContext(), playDispatchComplete(), playDispatchLaunch(), playStepTick()

### Community 18 - "AGENTS.md"
Cohesion: 0.05
Nodes (39): 10. Git and deployment, 11. Common pitfalls, 12. Definition of done, 1. Product direction, 2. Architecture, 3. Commands, 4. Backend rules, 5. Frontend rules (+31 more)

### Community 19 - "useSpeechRecognition.ts"
Cohesion: 0.25
Nodes (7): describeRecognitionError(), RecognitionConstructor, RecognitionErrorEvent, RecognitionEvent, RecognitionResult, RecognitionResultItem, SpeechRecognitionLike

### Community 20 - "The Design System Page"
Cohesion: 0.08
Nodes (30): ColorPair(), contrast(), luminance(), toHex(), toRgb(), defaultStates, previewState(), StateMatrix() (+22 more)

### Community 21 - "showcase-coverage.mjs"
Cohesion: 0.20
Nodes (9): components, missing, source, [uiArg, ...roots], uiDir, walk(), dist, ref_node_fs (+1 more)

### Community 22 - "app.ts"
Cohesion: 0.31
Nodes (9): AsyncHandler, providerErrorStatus(), sendProviderError(), hydrateWorkspace(), persistenceEnabled, persistWorkspace(), readState(), stateId (+1 more)

### Community 23 - "AEGIS"
Cohesion: 0.06
Nodes (32): Add a dispatch target, Add a provider, AEGIS, Agents, Any Node host, API, Architecture, Backend responsibilities (+24 more)

### Community 24 - "ProviderRegistry"
Cohesion: 0.33
Nodes (4): AppDeps, AppConfig, ProviderConfig, ProviderRegistry

### Community 25 - "backend/src/types.ts"
Cohesion: 0.12
Nodes (20): DEFAULT_SYSTEM_PROMPT, hostOf(), publicTarget(), ExecuteDispatchOptions, PlanDispatchInput, ChatUsage, ConversationSummary, DispatchLog (+12 more)

### Community 26 - "ChatPanel.tsx"
Cohesion: 0.19
Nodes (20): Component Structure → [composition.md](./rules/composition.md), MicIcon(), EmptyState(), formatRelative(), initials(), Notice(), PillTone, Spinner() (+12 more)

### Community 27 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 28 - "Apple Design"
Cohesion: 0.10
Nodes (20): 10. Gesture design details (the "feel" checklist), 11. Frame-level smoothness, 12. Materials & depth — translucency conveys hierarchy, 13. Multimodal feedback — motion + sound + haptics, 14. Reduced motion & accessibility, 15. Typography — optical sizing, tracking, leading, 16. Design foundations — the eight principles, 17. Process (+12 more)

### Community 29 - "cookieConsent.test.ts"
Cohesion: 0.60
Nodes (4): COOKIE_CONSENT_KEY, CookieConsentRecord, hasCookieConsent(), recordCookieConsent()

### Community 30 - "Design Systems from DESIGN.md"
Cohesion: 0.10
Nodes (21): Contents, Coverage check, Dark mode, Design Systems from DESIGN.md, Elevation, Focus, Fonts, Inputs to Confirm (+13 more)

### Community 31 - "shadcn/ui"
Cohesion: 0.11
Nodes (19): Chat & Messaging → [chat.md](./rules/chat.md), CLI, Component Docs, Examples, and Usage, Component Selection, Critical Rules, Current Project Context, Design Systems from DESIGN.md, Detailed References (+11 more)

### Community 32 - "AEGIS — Product & Technical Specification (SRS)"
Cohesion: 0.11
Nodes (17): requireAuth(), 1. Product Summary & Purpose, 2.1 Implemented Capabilities, 2.2 Active Remediation Plan (Sprints 1–4), 2.3 Explicit Non-Goals, 2. System Scope & Capability Matrix, 3. User Journeys, 4. Technical Architecture (+9 more)

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

## Knowledge Gaps
- **458 isolated node(s):** `defaultStates`, `[uiArg, ...roots]`, `uiDir`, `components`, `source` (+453 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 497 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Icons.tsx` to `tts.ts`, `SettingsPanel.tsx`, `WorkspacePage.tsx`, `gravityField.ts`, `frontend/package.json`, `DispatchPanel.tsx`, `useSpeechRecognition.ts`, `The Design System Page`, `ChatPanel.tsx`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `base()` connect `Icons.tsx` to `Commands`, `SettingsPanel.tsx`, `Chat & Messaging`, `Base vs Radix`, `ChatPanel.tsx`, `Design Systems from DESIGN.md`, `shadcn/ui`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `Registry Authoring and Addresses` connect `AGENTS.md` to `shadcn/SKILL.md`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `SqliteWorkspaceStore` (e.g. with `Codebase Intelligence & Graph Navigation (Mandatory First Step)` and `Store and persistence`) actually correct?**
  _`SqliteWorkspaceStore` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `base()` (e.g. with ``info` — Project information` and `Switching Presets`) actually correct?**
  _`base()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `defaultStates`, `[uiArg, ...roots]`, `uiDir` to the rest of the system?**
  _458 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SqliteWorkspaceStore` be split into smaller, more focused modules?**
  _Cohesion score 0.10077519379844961 - nodes in this community are weakly interconnected._