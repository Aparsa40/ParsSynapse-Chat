# ParsSynapse Chat

A Persian-first, local-first AI chat workspace designed for hybrid local and cloud model providers.

## Project status

**Current milestone:** Frontend foundation and Backend Core foundation.

- React + Vite + TypeScript frontend.
- Fastify 5 + TypeScript backend.
- Backend health endpoint and baseline local-service protections.
- Provider integration, chat persistence, memory, RAG and MCP runtime are planned as incremental milestones; they are not yet implemented.

## Architecture

```text
ParsSynapse-Chat/
├── frontend/   # React + Vite + TypeScript
└── backend/    # Fastify + TypeScript API
```

The frontend communicates with providers through the backend. Provider credentials must never be exposed in browser code.

## Requirements

- Node.js 22+
- npm 10+

## Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

## Run the backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run dev
```

The backend listens on `http://127.0.0.1:4000` by default. Check it with:

```powershell
Invoke-RestMethod http://127.0.0.1:4000/api/v1/health
```

## Backend validation

From `backend/`:

```powershell
npm run typecheck
npm test
npm run build
```

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

The current chat UI still uses demo responses. The backend health endpoint confirms only that the local API process is running; it does not indicate that any model provider is connected.
