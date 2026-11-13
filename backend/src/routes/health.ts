import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/health", {
    schema: {
      response: {
        200: {
          type: "object",
          additionalProperties: false,
          required: ["status", "service"],
          properties: {
            status: { type: "string", enum: ["ok"] },
            service: { type: "string" },
          },
        },
      },
    },
  }, async () => ({
    status: "ok" as const,
    service: "parssynapse-chat-backend",
  }));
}
