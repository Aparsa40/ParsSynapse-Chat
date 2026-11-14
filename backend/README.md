# ParsSynapse Chat Backend

Fastify + TypeScript backend for the local-first ParsSynapse Chat application.

## Current scope

- Fastify 5 application and server lifecycle.
- Runtime configuration validated with Zod.
- Localhost-only bind by default.
- Host-header allowlist and explicit frontend CORS origin.
- Security headers, bounded request body size and request timeout.
- Redacted sensitive request headers in logs.
- Normalized not-found and internal-error responses.
- Versioned health endpoint: `GET /api/v1/health`.
- Provider-neutral adapter contract, model registry and model router.
- Ollama adapter using the local HTTP API.
- Dynamic model discovery through `GET /api/tags`.
- Streaming chat through Ollama `POST /api/chat` and an SSE backend endpoint.
- Configurable provider request timeout and abort propagation.

## Requirements

- Node.js 22+
- npm 10+
- Ollama installed and running locally for model/provider features.

## Local development (PowerShell)

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run dev
```

The API listens on `http://127.0.0.1:4000` by default. Ollama is expected at `http://127.0.0.1:11434`; override it only with an HTTP loopback URL in the backend environment.

## Validation

```powershell
npm run typecheck
npm test
npm run build
```

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Backend process health |
| GET | `/api/v1/providers` | Provider status and local endpoint |
| GET | `/api/v1/models` | Dynamically discovered Ollama models |
| POST | `/api/v1/chat/completions` | Streaming chat response as Server-Sent Events |

### Discover installed models

```powershell
Invoke-RestMethod http://127.0.0.1:4000/api/v1/models
```

### Streaming chat

Send a JSON request with `provider` (currently `ollama`), `model`, and a `messages` array. The response uses `text/event-stream`; each `data` event contains a JSON object with a `content` field, followed by `data: [DONE]`.

```powershell
$body = @{
  provider = "ollama"
  model = "YOUR_INSTALLED_MODEL"
  messages = @(@{ role = "user"; content = "سلام" })
  stream = $true
} | ConvertTo-Json -Depth 8

Invoke-WebRequest -Uri http://127.0.0.1:4000/api/v1/chat/completions -Method Post -ContentType "application/json" -Body $body
```

Replace `YOUR_INSTALLED_MODEL` with an ID returned by `GET /api/v1/models`; the application does not assume a model is installed.

## Configuration

- `HOST`: backend bind address; keep `127.0.0.1`.
- `PORT`: backend port.
- `WEB_ORIGIN`: allowed frontend origin.
- `REQUEST_TIMEOUT_MS`: inbound HTTP request timeout.
- `OLLAMA_BASE_URL`: Ollama HTTP loopback URL.
- `OLLAMA_REQUEST_TIMEOUT_MS`: Ollama request timeout, including generation; defaults to 600000 ms for slower local hardware.

The Ollama endpoint is restricted to loopback hosts to prevent arbitrary network access through provider configuration.

## Security and resource boundaries

Provider credentials must remain server-side. The Ollama endpoint is restricted to localhost/loopback. Requests are schema-validated and bounded. Provider calls have a timeout and receive cancellation when the client disconnects. Do not expose this service to a network interface or add state-changing routes without the local-session/CSRF protection planned for the API phase.

## Not implemented yet

- OpenRouter and Google AI Studio adapters and their fallback policy.
- Frontend integration with the real API and token-by-token UI rendering.
- Conversation/session persistence, memory, RAG and MCP runtime.
- Persistent provider configuration and secrets management.
