import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppConfig } from "../config/env.js";
import { ModelRegistry } from "../core/model-registry.js";
import { ModelRouter } from "../core/model-router.js";
import { OllamaAdapter, ProviderRequestError } from "../providers/ollama/ollama.adapter.js";

const chatRequestSchema = z.object({
  provider: z.string().default("ollama"),
  model: z.string().trim().min(1).max(200),
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string().max(100_000),
  })).min(1).max(100),
  stream: z.literal(true).default(true),
});

export async function registerProviderRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  const ollama = new OllamaAdapter(config.OLLAMA_BASE_URL, config.OLLAMA_REQUEST_TIMEOUT_MS);
  const providers = [ollama];
  const registry = new ModelRegistry(providers);
  const router = new ModelRouter(providers);

  app.get("/api/v1/providers", async () => {
    const providers = await Promise.all(registry.listProviders().map(async (provider) => {
      const health = await registry.getProviderHealth(provider.id);
      return {
        id: provider.id,
        name: provider.name,
        type: provider.id === "ollama" ? "local" : "cloud",
        ...(provider.id === "ollama" ? { baseUrl: config.OLLAMA_BASE_URL } : {}),
        status: health.status,
        ...(health.version ? { version: health.version } : {}),
        ...(health.errorCode ? { errorCode: health.errorCode } : {}),
      };
    }));
    return { providers };
  });

  app.get("/api/v1/models", async (_request, reply) => {
    const results = await Promise.all(registry.listProviders().map(async (provider) => ({
      providerId: provider.id,
      result: await registry.discoverModels(provider.id),
    })).map(async (task) => {
      try {
        return { status: "fulfilled" as const, value: await task };
      } catch (reason) {
        return { status: "rejected" as const, reason };
      }
    }));

    const models = results.flatMap((result) => result.status === "fulfilled" ? result.value.result : []);
    const failures = results.filter((result) => result.status === "rejected");
    if (models.length === 0 && failures.length === results.length && results.length > 0) {
      const error = failures[0].reason;
      const code = error instanceof ProviderRequestError ? error.code : "PROVIDER_UNAVAILABLE";
      return reply.code(code === "PROVIDER_TIMEOUT" ? 504 : 503).send({
        error: { code, message: "مدل‌های Providerهای متصل در دسترس نیستند. وضعیت اتصال‌ها را بررسی کنید." },
      });
    }

    return {
      models,
      errors: failures.map((failure) => ({
        code: failure.reason instanceof ProviderRequestError ? failure.reason.code : "PROVIDER_UNAVAILABLE",
      })),
    };
  });

  app.post("/api/v1/chat/completions", async (request, reply) => {
    const parsed = chatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: "VALIDATION_ERROR", message: "درخواست گفتگو معتبر نیست.", issues: parsed.error.issues },
      });
    }

    const controller = new AbortController();
    reply.raw.on("close", () => {
      if (!reply.raw.writableEnded) controller.abort();
    });

    try {
      const provider = router.getProvider(parsed.data.provider);
      const availableModels = await registry.discoverModels(provider.id, controller.signal);
      const selectedModel = availableModels.find((model) => model.id === parsed.data.model);
      if (!selectedModel) {
        return reply.code(404).send({
          error: { code: "MODEL_NOT_FOUND", message: "مدل انتخاب‌شده در Ollama نصب نیست یا در دسترس قرار ندارد." },
        });
      }
      if (!selectedModel.chatSupported) {
        return reply.code(400).send({
          error: { code: "MODEL_CAPABILITY_MISMATCH", message: "مدل انتخاب‌شده برای گفتگو مناسب نیست." },
        });
      }

      const stream = router.streamChat({
        providerId: provider.id,
        model: parsed.data.model,
        messages: parsed.data.messages,
        signal: controller.signal,
      });

      reply.hijack();
      // SSE can remain idle while Ollama loads a model or generates its first token.
      // Disable the socket inactivity timeout for this response only; provider and request timeouts remain enforced.
      reply.raw.socket?.setTimeout(0);
      reply.raw.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      });

      for await (const content of stream) {
        if (controller.signal.aborted) break;
        reply.raw.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
      if (!controller.signal.aborted) reply.raw.write("data: [DONE]\n\n");
      reply.raw.end();
    } catch (error) {
      if (controller.signal.aborted) return;
      if (!reply.raw.headersSent) {
        if (error instanceof Error && error.message.startsWith("Unsupported provider:")) {
          return reply.code(400).send({
            error: { code: "UNSUPPORTED_PROVIDER", message: "ارائه‌دهنده انتخاب‌شده پشتیبانی نمی‌شود." },
          });
        }
        const providerError = error instanceof ProviderRequestError ? error : undefined;
        return reply.code(providerError?.code === "PROVIDER_TIMEOUT" ? 504 : 503).send({
          error: {
            code: providerError?.code ?? "PROVIDER_UNAVAILABLE",
            message: "ارتباط با مدل محلی برقرار نشد.",
          },
        });
      }
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ code: error instanceof ProviderRequestError ? error.code : "PROVIDER_ERROR", message: "تولید پاسخ با خطا متوقف شد." })}\n\n`);
      reply.raw.end();
    }
  });
}
