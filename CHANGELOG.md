# Changelog

All notable changes to Open-Agents will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Sprint 1 (PoC)**: Visual canvas with React Flow v12, backend API with Fastify, end-to-end agent execution, white-label theming (3 themes), multi-provider BYOK key management, skill level toggle, per-node chat via Agent SDK, execution engine with topological sort
- **Sprint 2 (Factory)**: Tab navigation (Canvas/Factory/Library/Settings), agent creation wizard, CRUD API endpoints, 10 library types, agent library with grid/list view, drag-to-canvas, LLM-powered asset generation, model metadata (MODEL_CATALOG)
- **Sprint 3 (Flow Pattern)**: Sequential pipeline orchestration, visual flow status (edge coloring, node borders, status icons), session management (pause/resume/cancel), error handling (retry/skip/abort), ExecutionToolbar, OutputPanel, 3 flow templates, 4 runtime adapters (Claude SDK, OpenAI, Mistral, Ollama)
- **Sprint 4 (Pool Pattern)**: Dispatcher-based routing with LLM classification, parallel agent execution (Promise.allSettled), AggregatorNode (concatenate/synthesize), DispatcherNode + AggregatorNode components, 2 pool templates
- **Sprint 5 (Safety & Audit)**: Safety rules editor (SafetySettingsView), audit trail and run history (RunHistoryView), replay controls
- **Sprint 6a (Knowledge Base)**: @open-agents/knowledge package, 35 routing pattern snippets, 7 orchestration principles, 13 building block profiles, markdown loader, knowledge API routes
- **Sprint 6b (Assembly Engine)**: Intent classification (Haiku), pattern matching (TypeScript), graph generation (Sonnet), cost estimation, graph validation, GenerateBar/PatternLibrary/CostEstimatePanel components, auto-layout with dagre
- **Sprint 7 (VS Code Extension)**: Extension scaffolding, webview panel with React Flow canvas, MCP server (6 tools), status bar, sidebar tree view
- **Sprint 8 (Frappe App)**: Frappe app structure, custom DocTypes, canvas embedding (iframe + postMessage), whitelisted API endpoints, 5 ERPNext templates
- **Sprint 9 (Agent Library)**: 90 agents in 10 categories, library loader with source/readonly tracking, category filter UI, 7 flow/pool templates

### Changed
- **Sprint 10 (Refactor)**: AgentDefinition now extends AgentNodeData (type consolidation), duplicated statusColors → shared STATUS_COLORS constant, nodeBorderStyle → shared getNodeBorderStyle(), SSE utilities extracted to sse.ts, KnowledgeRegistry centralized to singleton

### Fixed
- **Sprint 10**: Memory leak in execution engine (TTL-based cleanup for completed runs), missing @dagrejs/dagre dependency, assemblyRoutes never registered in server.ts

### Removed
- **Sprint 10**: Deprecated ModelDisplayInfo type

---

*Maintained by [Impertio Studio B.V.](https://impertio.nl)*
