# ParsSynapse Chat

A Persian-first, local-first AI chat workspace designed for hybrid local and cloud model providers.

## Project status

**Current milestone:** Phase 2 — Provider Architecture and Ollama integration.

- React + Vite + TypeScript frontend.
- Fastify 5 + TypeScript backend.
- Provider adapter contract, Model Registry and Model Router.
- Ollama local provider with dynamic model discovery and streaming chat API.
- Frontend real-chat integration, cloud providers, persistence, memory, RAG and MCP runtime remain incremental milestones.

## Architecture

```text
ParsSynapse-Chat/
├── frontend/   # React + Vite + TypeScript
└── backend/    # Fastify + TypeScript API and provider runtime
```

The frontend communicates with providers through the backend. Provider credentials must never be exposed in browser code.

## Requirements

- Node.js 22+
- npm 10+
- Ollama for local model features.

## Run the frontend

```powershell
cd frontend
npm ci
npm run dev
```

## Run the backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run dev
```

The backend listens on `http://127.0.0.1:4000` by default.

## Validate the backend

From `backend/`:

```powershell
npm run typecheck
npm test
npm run build
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

The current chat UI still uses demo responses. The backend Ollama APIs are available, but the frontend has not yet been connected to the real chat API.
