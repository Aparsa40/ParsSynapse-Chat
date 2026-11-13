# ParsSynapse Chat Backend

Fastify + TypeScript backend foundation for the local-first ParsSynapse Chat application.

## Current scope

- Fastify 5 application and server lifecycle.
- Runtime configuration validated with Zod.
- Localhost-only bind by default.
- Host-header allowlist and explicit frontend CORS origin.
- Security headers, bounded request body size and request timeout.
- Redacted sensitive request headers in logs.
- Normalized not-found and internal-error responses.
- Versioned health endpoint: `GET /api/v1/health`.
- Node test-runner tests through `tsx`.

This is infrastructure only. No provider is contacted, no model is started, and no API key is required.

## Requirements

- Node.js 22+
- npm 10+

## Local development (PowerShell)

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run dev
```

The API listens on `http://127.0.0.1:4000` by default.

## Validation

```powershell
npm run typecheck
npm test
npm run build
```

## Health check

```powershell
Invoke-RestMethod http://127.0.0.1:4000/api/v1/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "parssynapse-chat-backend"
}
```

## Security boundary

The server binds to loopback by default and rejects unexpected Host headers. Browser CORS is restricted to the configured `WEB_ORIGIN`. Provider credentials must remain server-side. Do not expose this service to a network interface or add state-changing routes without the local-session/CSRF protection planned for the API phase.

## Planned modules

The following capabilities are intentionally not scaffolded as empty modules. They will be introduced with their own contracts and tests when implemented:

1. Provider registry and provider-neutral model routing.
2. OpenRouter and Google AI Studio adapters, followed by controlled Ollama fallback.
3. Conversation/session persistence and export/import.
4. Separate user memory and model behavior instructions.
5. Knowledge sources, user-approved indexing and resource budgets.
6. MCP host with STDIO first and an extensible transport boundary for Streamable HTTP.
7. Observability, cancellation, concurrency limits and graceful resource management.
