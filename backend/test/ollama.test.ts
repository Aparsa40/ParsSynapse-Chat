import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config/env.js";
import { ModelRegistry } from "../src/core/model-registry.js";
import { ModelRouter } from "../src/core/model-router.js";
import { OllamaAdapter } from "../src/providers/ollama/ollama.adapter.js";

test("Ollama adapter discovers models and their capabilities", async () => {
  const fakeFetch: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/api/tags")) {
      return new Response(JSON.stringify({
        models: [
          { name: "llama3.2:1b", digest: "abc123", size: 1234, modified_at: "2026-11-13T10:00:00Z" },
          { name: "nomic-embed-text:latest", digest: "embed123", size: 567, modified_at: "2026-11-13T10:00:00Z" },
        ],
      }), { status: 200 });
    }
    if (url.endsWith("/api/show")) {
      const body = JSON.parse(String((arguments as unknown as { 0: RequestInit }).0?.body ?? "{}")) as { model?: string };
      return new Response(JSON.stringify({
        capabilities: body.model?.startsWith("nomic") ? ["embedding"] : ["completion"],
      }), { status: 200 });
    }
    throw new Error(`Unexpected Ollama request: ${url}`);
  };
  const adapter = new OllamaAdapter("http://127.0.0.1:11434", 2_000, fakeFetch);
  const models = await adapter.listModels();

  assert.equal(models.length, 2);
  assert.equal(models[0].id, "llama3.2:1b");
  assert.equal(models[0].chatSupported, true);
  assert.deepEqual(models[0].capabilities, ["completion"]);
  assert.equal(models[1].id, "nomic-embed-text:latest");
  assert.equal(models[1].chatSupported, false);
  assert.deepEqual(models[1].capabilities, ["embedding"]);
});

test("Ollama adapter yields streamed chat content and requests immediate unload", async () => {
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/api/chat")) {
      const body = JSON.parse(String(init?.body)) as { model: string; stream: boolean; keep_alive: number };
      assert.equal(body.model, "llama3.2:1b");
      assert.equal(body.stream, true);
      assert.equal(body.keep_alive, 0);
      return new Response([
        JSON.stringify({ message: { role: "assistant", content: "سلام " }, done: false }),
        JSON.stringify({ message: { role: "assistant", content: "دنیا" }, done: false }),
        JSON.stringify({ message: { role: "assistant", content: "" }, done: true }),
        "",
      ].join("\n"), { status: 200 });
    }
    if (url.endsWith("/api/ps")) return new Response(JSON.stringify({ models: [] }), { status: 200 });
    throw new Error(`Unexpected Ollama request: ${url}`);
  };
  const adapter = new OllamaAdapter("http://127.0.0.1:11434", 2_000, fakeFetch);
  const chunks: string[] = [];
  for await (const chunk of adapter.chatStream({
    model: "llama3.2:1b",
    messages: [{ role: "user", content: "سلام" }],
  })) chunks.push(chunk);

  assert.deepEqual(chunks, ["سلام ", "دنیا"]);
});

test("model registry and router resolve the Ollama adapter", async () => {
  const fakeFetch: typeof fetch = async (input) => {
    if (String(input).endsWith("/api/tags")) return new Response(JSON.stringify({ models: [] }), { status: 200 });
    throw new Error("Unexpected request");
  };
  const adapter = new OllamaAdapter("http://127.0.0.1:11434", 2_000, fakeFetch);
  const registry = new ModelRegistry([adapter]);
  const router = new ModelRouter([adapter]);

  assert.equal(registry.getProvider("ollama")?.id, "ollama");
  assert.deepEqual(await registry.discoverModels("ollama"), []);
  assert.equal(router.getProvider().id, "ollama");
  assert.throws(() => router.getProvider("unknown"), /Unsupported provider/);
});

test("Ollama endpoint configuration rejects non-loopback hosts", () => {
  assert.throws(
    () => loadConfig({ OLLAMA_BASE_URL: "http://example.com:11434" }),
    /Invalid backend configuration/,
  );
});
