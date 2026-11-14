import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";

async function startMockOllama(chatDelayMs = 0): Promise<{ server: Server; baseUrl: string }> {
  const server = createServer((request, response) => {
    if (request.url === "/api/version") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ version: "0.1.0-test" }));
      return;
    }
    if (request.url === "/api/tags") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ models: [
        { name: "test-model:latest", digest: "test", size: 42 },
        { name: "embedding-model:latest", digest: "embed", size: 21 },
      ] }));
      return;
    }
    if (request.url === "/api/show") {
      let body = "";
      request.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      request.on("end", () => {
        const payload = JSON.parse(body) as { model?: string };
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({
          capabilities: payload.model?.startsWith("embedding") ? ["embedding"] : ["completion"],
        }));
      });
      return;
    }
    if (request.url === "/api/ps") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ models: [] }));
      return;
    }
    if (request.url === "/api/chat") {
      const sendChatResponse = () => {
        response.writeHead(200, { "content-type": "application/x-ndjson" });
        response.end([
          JSON.stringify({ message: { role: "assistant", content: "hello " }, done: false }),
          JSON.stringify({ message: { role: "assistant", content: "world" }, done: false }),
          JSON.stringify({ message: { role: "assistant", content: "" }, done: true }),
          "",
        ].join("\n"));
      };
      if (chatDelayMs > 0) setTimeout(sendChatResponse, chatDelayMs);
      else sendChatResponse();
      return;
    }
    response.writeHead(404);
    response.end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

test("provider endpoints report health and discover live Ollama models", async () => {
  const mock = await startMockOllama();
  const app = await buildApp(loadConfig({
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    OLLAMA_BASE_URL: mock.baseUrl,
  }));
  try {
    const providerResponse = await app.inject({
      method: "GET",
      url: "/api/v1/providers",
      headers: { host: "127.0.0.1:4000" },
    });
    assert.equal(providerResponse.statusCode, 200);
    assert.equal(providerResponse.json().providers[0].status, "connected");

    const modelsResponse = await app.inject({
      method: "GET",
      url: "/api/v1/models",
      headers: { host: "127.0.0.1:4000" },
    });
    assert.equal(modelsResponse.statusCode, 200);
    assert.equal(modelsResponse.json().models[0].id, "test-model:latest");
    assert.equal(modelsResponse.json().models[0].chatSupported, true);
    assert.equal(modelsResponse.json().models[1].chatSupported, false);
  } finally {
    await app.close();
    await new Promise<void>((resolve, reject) => mock.server.close((error) => error ? reject(error) : resolve()));
  }
});

test("chat endpoint validates input and streams Ollama output as SSE", async () => {
  const mock = await startMockOllama();
  const app = await buildApp(loadConfig({
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    OLLAMA_BASE_URL: mock.baseUrl,
  }));
  try {
    const invalid = await app.inject({
      method: "POST",
      url: "/api/v1/chat/completions",
      headers: { host: "127.0.0.1:4000" },
      payload: { model: "", messages: [] },
    });
    assert.equal(invalid.statusCode, 400);
    assert.equal(invalid.json().error.code, "VALIDATION_ERROR");

    const unsupported = await app.inject({
      method: "POST",
      url: "/api/v1/chat/completions",
      headers: { host: "127.0.0.1:4000" },
      payload: {
        provider: "not-installed",
        model: "test-model:latest",
        messages: [{ role: "user", content: "hello" }],
      },
    });
    assert.equal(unsupported.statusCode, 400);
    assert.equal(unsupported.json().error.code, "UNSUPPORTED_PROVIDER");

    const missingModel = await app.inject({
      method: "POST",
      url: "/api/v1/chat/completions",
      headers: { host: "127.0.0.1:4000" },
      payload: {
        provider: "ollama",
        model: "missing-model",
        messages: [{ role: "user", content: "hello" }],
      },
    });
    assert.equal(missingModel.statusCode, 404);
    assert.equal(missingModel.json().error.code, "MODEL_NOT_FOUND");

    const embeddingModel = await app.inject({
      method: "POST",
      url: "/api/v1/chat/completions",
      headers: { host: "127.0.0.1:4000" },
      payload: {
        provider: "ollama",
        model: "embedding-model:latest",
        messages: [{ role: "user", content: "hello" }],
      },
    });
    assert.equal(embeddingModel.statusCode, 400);
    assert.equal(embeddingModel.json().error.code, "MODEL_CAPABILITY_MISMATCH");

    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "ollama",
        model: "test-model:latest",
        messages: [{ role: "user", content: "hello" }],
        stream: true,
      }),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /text\/event-stream/);
    const body = await response.text();
    assert.match(body, /hello /);
    assert.match(body, /world/);
    assert.ok(body.includes("data: [DONE]"));
  } finally {
    await app.close();
    await new Promise<void>((resolve, reject) => mock.server.close((error) => error ? reject(error) : resolve()));
  }
});


test("chat SSE remains connected when Ollama takes longer than the socket idle timeout", async () => {
  const mock = await startMockOllama(1_500);
  const app = await buildApp(loadConfig({
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    OLLAMA_BASE_URL: mock.baseUrl,
  }));
  try {
    await app.listen({ host: "127.0.0.1", port: 0 });
    // Simulate a short server socket idle timeout. The SSE route must disable it
    // after the response is hijacked because model loading can take much longer.
    app.server.setTimeout(500);
    const address = app.server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "ollama",
        model: "test-model:latest",
        messages: [{ role: "user", content: "hello" }],
        stream: true,
      }),
    });

    assert.equal(response.status, 200);
    const body = await response.text();
    assert.match(body, /hello /);
    assert.match(body, /world/);
    assert.ok(body.includes("data: [DONE]"));
  } finally {
    await app.close();
    await new Promise<void>((resolve, reject) => mock.server.close((error) => error ? reject(error) : resolve()));
  }
});
