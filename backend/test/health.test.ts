import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";

const config = loadConfig({ NODE_ENV: "test", LOG_LEVEL: "silent" });

test("GET /api/v1/health returns service health", async () => {
  const app = await buildApp(config);
  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health",
      headers: { host: "127.0.0.1:4000" },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      status: "ok",
      service: "parssynapse-chat-backend",
    });
  } finally {
    await app.close();
  }
});

test("rejects requests with an unexpected Host header", async () => {
  const app = await buildApp(config);
  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health",
      headers: { host: "example.com" },
    });

    assert.equal(response.statusCode, 421);
    assert.equal(response.json().error.code, "MISDIRECTED_REQUEST");
  } finally {
    await app.close();
  }
});

test("returns a normalized 404 response", async () => {
  const app = await buildApp(config);
  try {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/unknown",
      headers: { host: "127.0.0.1:4000" },
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error.code, "NOT_FOUND");
  } finally {
    await app.close();
  }
});

test("rejects invalid runtime configuration", () => {
  assert.throws(
    () => loadConfig({ PORT: "70000" }),
    /Invalid backend configuration/,
  );
});
