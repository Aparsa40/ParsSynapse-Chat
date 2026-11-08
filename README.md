# ParsSynapse Chat

A modular AI chat workspace built to support multiple model providers through a dedicated backend.

## Project status

**Current milestone:** Frontend foundation (v0.1.0)

The first frontend milestone provides a responsive, Persian-first chat interface with:
- Conversation sidebar and new-chat flow
- Message composer with Enter-to-send and Shift+Enter for new lines
- User and assistant message presentation
- Temporary demo responses (no model API is connected yet)
- Model selector placeholder for future provider integration
- Responsive desktop and mobile layouts

## Architecture

```text
ParsSynapse-Chat/
├── frontend/   # React + Vite + TypeScript
└── backend/    # Node.js + TypeScript API (next milestone)
```

The frontend must communicate with AI providers through the backend. Provider credentials must never be exposed in browser code.

## Requirements

- Node.js 22+
- npm 10+

## Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

Vite prints the local development URL after startup.

## Production build

```powershell
cd frontend
npm run build
npm run preview
```

## Development roadmap

1. [x] Create the React + Vite + TypeScript frontend foundation.
2. [x] Build the first responsive chat interface.
3. [ ] Validate the frontend locally and refine UX.
4. [ ] Implement the Node.js + TypeScript backend.
5. [ ] Add a provider adapter layer and secure environment-based configuration.
6. [ ] Connect a hosted or local model endpoint.
7. [ ] Persist conversations and add provider/model settings.

## Important

The current assistant response is a local demo response. It does not call Qwen, Ollama, OpenRouter, Google AI Studio, or any other model provider.
