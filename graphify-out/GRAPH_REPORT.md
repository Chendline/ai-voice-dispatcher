# Graph Report - ai-voice-dispatcher  (2026-11-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1032 nodes · 2029 edges · 59 communities (57 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 65 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4ba8608e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- SqliteWorkspaceStore
- tts.ts
- chat.ts
- ChatPanel.tsx
- frontend/package.json
- Icons.tsx
- backend/package.json
- AEGIS
- The Design System Page
- SettingsPanel.tsx
- AGENTS.md
- config.ts
- DispatchPanel.tsx
- WorkspacePage.tsx
- app.ts
- ErrorBoundary
- dispatch.ts
- validation.ts
- gravityField.ts
- Apple Design
- compilerOptions
- Commands
- compilerOptions
- backend/src/types.ts
- AEGIS-Product-Plan_2b6e72dc.md
- frontend
- persistence.ts
- Component Composition
- Styling & Customization
- compilerOptions
- Design Systems from DESIGN.md
- Base vs Radix
- Tools
- shadcn/ui
- Chat & Messaging
- Design Engineering
- Customization & Theming
- Registry Authoring and Addresses
- Component Building Principles
- Step 4: Map Tokens to the Theme
- Forms & Inputs
- ProviderRegistry
- Critical Rules
- The Animation Decision Framework
- clip-path for Animation
- Performance Rules
- Gesture and Drag Interactions
- .oxlintrc.json
- AEGIS frontend
- cookieConsent.test.ts
- CSS Transform Mastery
- The Sonner Principles (Building Loved Components)
- Spring Animations
- Customizing Components
- Icons
- Core Philosophy
- Debugging Animations
- frontend/tsconfig.json

## God Nodes (most connected - your core abstractions)
1. `SqliteWorkspaceStore` - 50 edges
2. `base()` - 34 edges
3. `createApp()` - 32 edges
4. `SpeechPlaybackController` - 27 edges
5. `react` - 25 edges
6. `playTap()` - 24 edges
7. `navigate()` - 23 edges
8. `Apple Design` - 20 edges
9. `compilerOptions` - 18 edges
10. `ProviderError` - 17 edges

## Surprising Connections (you probably didn't know these)
- `State and components` --references--> `WorkspacePage()`  [INFERRED]
  AGENTS.md → frontend/src/pages/WorkspacePage.tsx
- ``info` — Project information` --references--> `base()`  [INFERRED]
  .agents/skills/shadcn/cli.md → frontend/src/components/Icons.tsx
- `Switching Presets` --references--> `base()`  [INFERRED]
  .agents/skills/shadcn/cli.md → frontend/src/components/Icons.tsx
- `Picking a style` --references--> `base()`  [INFERRED]
  .agents/skills/shadcn/design-system.md → frontend/src/components/Icons.tsx
- `Key Fields` --references--> `base()`  [INFERRED]
  .agents/skills/shadcn/SKILL.md → frontend/src/components/Icons.tsx

## Import Cycles
- None detected.

## Communities (59 total, 2 thin omitted)

### Community 0 - "SqliteWorkspaceStore"
Cohesion: 0.06
Nodes (33): components, missing, source, [uiArg, ...roots], uiDir, walk(), Store and persistence, ChatOutput (+25 more)

### Community 1 - "tts.ts"
Cohesion: 0.08
Nodes (28): clamp(), persistSettings(), readSettings(), TEST_VOICE_SAMPLE, useSpeechPlayback(), chunkText(), clamp(), ControllerCallbacks (+20 more)

### Community 2 - "chat.ts"
Cohesion: 0.11
Nodes (33): 4. Backend rules, API responses, Chat, Provider adapters, Validation, buildBoundedHistory(), buildSystemPrompt(), ChatInput (+25 more)

### Community 3 - "ChatPanel.tsx"
Cohesion: 0.11
Nodes (30): TrashIcon(), AgentsPanel(), toInput(), ChatPanelProps, SUGGESTIONS, VoicePanelProps, LoadStatus, api (+22 more)

### Community 4 - "frontend/package.json"
Cohesion: 0.06
Nodes (34): dependencies, lenis, react, react-dom, three, devDependencies, oxlint, @types/node (+26 more)

### Community 5 - "Icons.tsx"
Cohesion: 0.11
Nodes (32): Props, State, AgentsIcon(), AlertIcon(), ArrowRight(), ArrowUpRight(), base(), BoltIcon() (+24 more)

### Community 6 - "backend/package.json"
Cohesion: 0.06
Nodes (32): dependencies, cors, dotenv, express, express-rate-limit, helmet, @vercel/blob, description (+24 more)

### Community 7 - "AEGIS"
Cohesion: 0.06
Nodes (32): Add a dispatch target, Add a provider, AEGIS, Agents, Any Node host, API, Architecture, Backend responsibilities (+24 more)

### Community 8 - "The Design System Page"
Cohesion: 0.08
Nodes (30): ColorPair(), contrast(), luminance(), toHex(), toRgb(), defaultStates, previewState(), StateMatrix() (+22 more)

### Community 9 - "SettingsPanel.tsx"
Cohesion: 0.14
Nodes (26): CheckIcon(), PlusIcon(), EmptyState(), formatRelative(), initials(), Notice(), Pill(), PillTone (+18 more)

### Community 10 - "AGENTS.md"
Cohesion: 0.07
Nodes (26): 12. Definition of done, 1. Product direction, 2. Architecture, 3. Commands, 5. Frontend rules, 6. Honesty rules (non-negotiable), 7. Security, 8. Testing (+18 more)

### Community 11 - "config.ts"
Cohesion: 0.11
Nodes (19): 11. Common pitfalls, Configuration, ProviderId, publicConfig(), readConfig(), readHttpsBase(), readKey(), readModels() (+11 more)

### Community 12 - "DispatchPanel.tsx"
Cohesion: 0.16
Nodes (23): Routing, formatTime(), ChatPanel(), DispatchPanel(), PRIORITIES, statusTone(), readSpeakSetting(), VoicePanel() (+15 more)

### Community 13 - "WorkspacePage.tsx"
Cohesion: 0.18
Nodes (20): App(), CookieNotice(), useWorkspaceData(), frontend_src_index, currentPath(), isCookiesPath(), isPrivacyPath(), isTermsPath() (+12 more)

### Community 14 - "app.ts"
Cohesion: 0.19
Nodes (19): AsyncHandler, createApp(), providerErrorStatus(), sendProviderError(), createAuthMiddleware(), Express, extractAuthToken(), formatClearCookie() (+11 more)

### Community 15 - "ErrorBoundary"
Cohesion: 0.08
Nodes (18): ErrorBoundary, 1. Product Summary & Purpose, 2.1 Implemented Capabilities, 2.2 Implemented Milestones (Sprints 1–4), 2.3 Active Production Hardening Plan (Sprints 5 & 6), 2.4 Explicit Non-Goals, 2. System Scope & Capability Matrix, 3. User Journeys (+10 more)

### Community 16 - "dispatch.ts"
Cohesion: 0.17
Nodes (21): Dispatch, checkTargetUrl(), executeDispatch(), hostOf(), now(), parsePlannerJson(), pinnedFetch(), PinnedFetchOptions (+13 more)

### Community 17 - "validation.ts"
Cohesion: 0.17
Nodes (21): Priority, TargetType, AgentInput, ChatInput, ClientPlan, ExecuteInput, isRecord(), parseAgentRequest() (+13 more)

### Community 18 - "gravityField.ts"
Cohesion: 0.19
Nodes (17): AegisFieldCanvas(), Bounds, createEnvironmentTexture(), createGravityField(), FieldSphere, GravityFieldHandle, GravityFieldOptions, MATERIAL_SPECS (+9 more)

### Community 19 - "Apple Design"
Cohesion: 0.10
Nodes (20): 10. Gesture design details (the "feel" checklist), 11. Frame-level smoothness, 12. Materials & depth — translucency conveys hierarchy, 13. Multimodal feedback — motion + sound + haptics, 14. Reduced motion & accessibility, 15. Typography — optical sizing, tracking, leading, 16. Design foundations — the eight principles, 17. Process (+12 more)

### Community 20 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 21 - "Commands"
Cohesion: 0.12
Nodes (17): `add` — Add components, `apply` — Apply a preset to an existing project, `build` — Build a custom registry, Commands, Contents, `diff` — Check for updates, `docs` — Get component documentation URLs, Dry-Run Mode (+9 more)

### Community 22 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 23 - "backend/src/types.ts"
Cohesion: 0.15
Nodes (12): Request, ExecuteDispatchOptions, ChatUsage, DispatchLog, DispatchPlan, DispatchResult, DispatchStatus, PRIORITIES (+4 more)

### Community 24 - "AEGIS-Product-Plan_2b6e72dc.md"
Cohesion: 0.14
Nodes (13): Sheet: Architecture, Sheet: Deployment, Sheet: Dispatch, Sheet: Features, Sheet: Future Improvements, Sheet: Milestones, Sheet: Overview, Sheet: Providers (+5 more)

### Community 25 - "frontend"
Cohesion: 0.14
Nodes (13): root, runtime, buildCommand, framework, outputDirectory, rewrites, root, headers (+5 more)

### Community 26 - "persistence.ts"
Cohesion: 0.23
Nodes (10): 10. Git and deployment, Accessibility, Address Schemes, main(), hydrateWorkspace(), persistenceEnabled, persistWorkspace(), readState() (+2 more)

### Community 27 - "Component Composition"
Cohesion: 0.15
Nodes (13): Avatar always needs AvatarFallback, Button has no isPending or isLoading prop, Callouts use Alert, Card structure, Choosing between overlay components, Component Composition, Contents, Dialog, Sheet, and Drawer always need a Title (+5 more)

### Community 28 - "Styling & Customization"
Cohesion: 0.15
Nodes (13): Built-in variants first, className for layout only, Contents, No manual dark: color overrides, No manual z-index on overlay components, No raw color values for status/state indicators, No space-x-* / space-y-*, Prefer size-* over w-* h-* when equal (+5 more)

### Community 29 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir, rootDir (+4 more)

### Community 30 - "Design Systems from DESIGN.md"
Cohesion: 0.17
Nodes (12): Contents, Coverage check, Design Systems from DESIGN.md, Known traps, Picking a style, Report Back, Step 1: Scaffold, Step 2: Install Everything (+4 more)

### Community 31 - "Base vs Radix"
Cohesion: 0.18
Nodes (11): Inputs to Confirm, Accordion, Base vs Radix, Button / trigger as non-button element (base only), Composition: asChild (radix) vs render (base), Contents, Select, Select — multiple selection and object values (base only) (+3 more)

### Community 32 - "Tools"
Cohesion: 0.17
Nodes (11): Configuring Registries, Setup, `shadcn:get_add_command_for_items`, `shadcn:get_audit_checklist`, `shadcn:get_item_examples_from_registries`, `shadcn:get_project_registries`, `shadcn:list_items_in_registries`, shadcn MCP Server (+3 more)

### Community 33 - "shadcn/ui"
Cohesion: 0.17
Nodes (12): Component Docs, Examples, and Usage, Component Selection, Current Project Context, Design Systems from DESIGN.md, Detailed References, Key Fields, Key Patterns, Principles (+4 more)

### Community 35 - "Chat & Messaging"
Cohesion: 0.18
Nodes (11): Assistant activity uses Trace, Attachments use Attachment, Chat & Messaging, Code and tool output use CodeBlock, Contents, Escape hatch: the scroller hooks, Message rows use Message, Message surfaces use Bubble (+3 more)

### Community 36 - "Design Engineering"
Cohesion: 0.22
Nodes (8): Accessibility, Design Engineering, Initial Response, prefers-reduced-motion, Review Checklist, Review Format (Required), Stagger Animations, Touch device hover states

### Community 37 - "Customization & Theming"
Cohesion: 0.22
Nodes (9): Adding Custom Colors, Border Radius, Changing the Theme, Checking for Updates, Color Variables, Contents, Customization & Theming, Dark Mode (+1 more)

### Community 38 - "Registry Authoring and Addresses"
Cohesion: 0.22
Nodes (9): Build and Verify, GitHub Registries, Include, Item Definitions, Mental Model, Registry Authoring and Addresses, Registry Dependencies, Root `registry.json` (+1 more)

### Community 39 - "Component Building Principles"
Cohesion: 0.25
Nodes (8): Animate enter states with @starting-style, Buttons must feel responsive, Component Building Principles, Make popovers origin-aware, Never animate from scale(0), Tooltips: skip delay on subsequent hovers, Use blur to mask imperfect transitions, Use CSS transitions over keyframes for interruptible UI

### Community 40 - "Step 4: Map Tokens to the Theme"
Cohesion: 0.25
Nodes (8): Dark mode, Elevation, Focus, Fonts, Radius, Role mapping, Step 4: Map Tokens to the Theme, Type scale

### Community 41 - "Forms & Inputs"
Cohesion: 0.25
Nodes (8): Buttons inside inputs use InputGroup + InputGroupAddon, Contents, Field validation and disabled states, FieldSet + FieldLegend for grouping related fields, Forms & Inputs, Forms use FieldGroup + Field, InputGroup requires InputGroupInput/InputGroupTextarea, Option sets (2–7 choices) use ToggleGroup

### Community 42 - "ProviderRegistry"
Cohesion: 0.32
Nodes (5): AppDeps, AppConfig, ProviderConfig, PlanDispatchInput, ProviderRegistry

### Community 43 - "Critical Rules"
Cohesion: 0.29
Nodes (7): Chat & Messaging → [chat.md](./rules/chat.md), CLI, Critical Rules, Forms & Inputs → [forms.md](./rules/forms.md), Icons → [icons.md](./rules/icons.md), Styling & Tailwind → [styling.md](./rules/styling.md), Use Components, Not Custom Markup → [composition.md](./rules/composition.md)

### Community 44 - "The Animation Decision Framework"
Cohesion: 0.33
Nodes (6): 1. Should this animate at all?, 2. What is the purpose?, 3. What easing should it use?, 4. How fast should it be?, Perceived performance, The Animation Decision Framework

### Community 45 - "clip-path for Animation"
Cohesion: 0.33
Nodes (6): clip-path for Animation, Comparison sliders, Hold-to-delete pattern, Image reveals on scroll, Tabs with perfect color transitions, The inset shape

### Community 46 - "Performance Rules"
Cohesion: 0.33
Nodes (6): CSS animations beat JS under load, CSS variables are inheritable, Framer Motion hardware acceleration caveat, Only animate transform and opacity, Performance Rules, Use WAAPI for programmatic CSS animations

### Community 47 - "Gesture and Drag Interactions"
Cohesion: 0.33
Nodes (6): Damping at boundaries, Friction instead of hard stops, Gesture and Drag Interactions, Momentum-based dismissal, Multi-touch protection, Pointer capture for drag

### Community 48 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 49 - "AEGIS frontend"
Cohesion: 0.33
Nodes (5): AEGIS frontend, Behavior notes, Commands, Structure, Surfaces

### Community 50 - "cookieConsent.test.ts"
Cohesion: 0.60
Nodes (4): COOKIE_CONSENT_KEY, CookieConsentRecord, hasCookieConsent(), recordCookieConsent()

### Community 51 - "CSS Transform Mastery"
Cohesion: 0.40
Nodes (5): 3D transforms for depth, CSS Transform Mastery, scale() scales children too, transform-origin, translateY with percentages

### Community 52 - "The Sonner Principles (Building Loved Components)"
Cohesion: 0.40
Nodes (5): Asymmetric enter/exit timing, Cohesion matters, Review your work the next day, The opacity + height combination, The Sonner Principles (Building Loved Components)

### Community 53 - "Spring Animations"
Cohesion: 0.40
Nodes (5): Interruptibility advantage, Spring Animations, Spring-based mouse interactions, Spring configuration, When to use springs

### Community 54 - "Customizing Components"
Cohesion: 0.40
Nodes (5): 1. Built-in variants, 2. Tailwind classes via `className`, 3. Add a new variant, 4. Wrapper components, Customizing Components

### Community 55 - "Icons"
Cohesion: 0.40
Nodes (4): Icons, Icons in Button use data-icon attribute, No sizing classes on icons inside components, Pass icons as component objects, not string keys

### Community 56 - "Core Philosophy"
Cohesion: 0.50
Nodes (4): Beauty is leverage, Core Philosophy, Taste is trained, not innate, Unseen details compound

### Community 57 - "Debugging Animations"
Cohesion: 0.50
Nodes (4): Debugging Animations, Frame-by-frame inspection, Slow motion testing, Test on real devices

## Knowledge Gaps
- **457 isolated node(s):** `ControllerCallbacks`, `TtsCapabilities`, `RecognitionConstructor`, `RecognitionErrorEvent`, `RecognitionEvent` (+452 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 502 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `SettingsPanel.tsx` to `tts.ts`, `ChatPanel.tsx`, `frontend/package.json`, `Icons.tsx`, `The Design System Page`, `AGENTS.md`, `DispatchPanel.tsx`, `WorkspacePage.tsx`, `gravityField.ts`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `base()` connect `Icons.tsx` to `shadcn/ui`, `Chat & Messaging`, `ChatPanel.tsx`, `SettingsPanel.tsx`, `Commands`, `Design Systems from DESIGN.md`, `Base vs Radix`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `2.3 Active Production Hardening Plan (Sprints 5 & 6)` connect `ErrorBoundary` to `SettingsPanel.tsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `SqliteWorkspaceStore` (e.g. with `Codebase Intelligence & Graph Navigation (Mandatory First Step)` and `Store and persistence`) actually correct?**
  _`SqliteWorkspaceStore` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `base()` (e.g. with ``info` — Project information` and `Switching Presets`) actually correct?**
  _`base()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ControllerCallbacks`, `TtsCapabilities`, `RecognitionConstructor` to the rest of the system?**
  _457 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SqliteWorkspaceStore` be split into smaller, more focused modules?**
  _Cohesion score 0.05617283950617284 - nodes in this community are weakly interconnected._