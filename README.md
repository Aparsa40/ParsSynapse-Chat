# ParsSynapse Chat

A Persian-first, local-first AI chat workspace designed for hybrid local and cloud model providers.

## Project status

**Current milestone:** Phase 3 — Frontend and Backend integration.

- React + Vite + TypeScript frontend.
- Fastify 5 + TypeScript backend.
- Provider adapter contract, Model Registry and Model Router.
- Ollama local provider with dynamic model discovery and streaming chat API.
- Frontend real-chat integration, cloud providers, persistence, memory, RAG and MCP runtime remain incremental milestones.

## Architecture

```text
ParsSynapse-Chat/
├── frontend/       # React + Vite + TypeScript
├── backend/        # Fastify + TypeScript API and provider runtime
├── scripts/        # Root-level development utilities
└── package.json    # Unified project commands
```

The frontend communicates with providers through the backend. Provider credentials must never be exposed in browser code.

## Requirements

- Node.js 22+
- npm 10+
- Ollama for local model features.

## Install dependencies

Run this once from the repository root. It installs each application using its own committed lockfile:

```powershell
npm run install:all
```

The root package intentionally has no runtime dependencies. Backend and frontend retain independent dependency trees and lockfiles.

## Run the full application

From the repository root:

```powershell
npm run dev
```

This starts both services:
- Backend: `http://127.0.0.1:4000`
- Frontend: Vite development server (prints its local URL in the terminal).

Stop both services with `Ctrl+C`. If either service exits unexpectedly, the root runner stops the other service as well.

You can also start them independently:

```powershell
npm run dev:backend
npm run dev:frontend
```

## Root-level validation commands

All commands below run from the repository root:

| Command | Purpose |
| --- | --- |
| `npm test` | Backend unit tests + frontend TypeScript validation |
| `npm run typecheck` | Typecheck backend and frontend independently |
| `npm run build` | Build backend and frontend |
| `npm run check` | Run typechecks, tests/validation and both builds |
| `npm run audit` | Audit backend and frontend dependencies independently |

**Frontend test status:** The frontend currently has no unit-test framework or component test suite. Until one is introduced, `test:frontend` runs its strict TypeScript project check. This is reported as validation, not as a frontend unit-test suite. Backend tests remain the existing Node.js test-runner tests.

The backend and frontend keep their own TypeScript configurations and quality checks; root scripts only orchestrate them.

## Run or validate one application

From the repository root:

```powershell
npm run test:backend
npm run test:frontend
npm run build:backend
npm run build:frontend
npm run typecheck:backend
npm run typecheck:frontend
```

## Provider API

- `GET /api/v1/health` — backend process health.
- `GET /api/v1/providers` — provider status.
- `GET /api/v1/models` — dynamically discovered Ollama models.
- `POST /api/v1/chat/completions` — streaming chat via Server-Sent Events.

Ollama defaults to `http://127.0.0.1:11434`. Model IDs are discovered at runtime; no particular model is assumed to be installed.

## Architecture principles

- Local-first service boundary; loopback binding by default.
- Provider-neutral contracts and explicit routing/fallback policy.
- OpenRouter first, Google AI Studio second, local chat fallback only after online routes fail.
- Manual selection of local coding and analysis models.
- Independent, manageable chat sessions with portable export/import.
- Memory separated from model behavior instructions.
- Document ingestion and indexing only after explicit user approval, with resource limits.
- MCP STDIO first, with a transport abstraction that can support Streamable HTTP.
- No automatic model startup, unbounded concurrency or silent provider switching.

## Important

Cloud providers, conversation persistence, memory, RAG and MCP runtime remain future milestones.
