import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify, { type FastifyInstance } from "fastify";
import type { AppConfig } from "./config/env.js";
import { registerHealthRoutes } from "./routes/health.js";

const allowedLocalHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: {
        paths: ["req.headers.authorization", "req.headers.cookie", "res.headers.set-cookie"],
        censor: "[REDACTED]",
      },
    },
    bodyLimit: 1_048_576,
    requestTimeout: config.REQUEST_TIMEOUT_MS,
    connectionTimeout: 10_000,
    keepAliveTimeout: 5_000,
    trustProxy: false,
    disableRequestLogging: false,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "same-site" },
  });

  await app.register(cors, {
    origin: (origin, callback) => {
      if (origin === undefined || origin === config.WEB_ORIGIN) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: false,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
  });

  app.addHook("onRequest", async (request, reply) => {
    const hostname = request.hostname.toLowerCase();
    if (!allowedLocalHosts.has(hostname)) {
      return reply.code(421).send({
        error: {
          code: "MISDIRECTED_REQUEST",
          message: "This local service only accepts requests addressed to localhost.",
        },
      });
    }
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({
      error: {
        code: "NOT_FOUND",
        message: "The requested endpoint was not found.",
      },
    });
  });

  app.setErrorHandler((error: unknown, request, reply) => {
    request.log.error({ err: error }, "Unhandled request error");

    const candidateStatusCode =
      typeof error === "object" && error !== null && "statusCode" in error
        ? error.statusCode
        : undefined;
    const statusCode =
      typeof candidateStatusCode === "number" &&
      candidateStatusCode >= 400 &&
      candidateStatusCode < 500
        ? candidateStatusCode
        : 500;
    const message = error instanceof Error ? error.message : "Unknown request error";

    return reply.code(statusCode).send({
      error: {
        code: statusCode === 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR",
        message: statusCode === 500 ? "The request could not be completed." : message,
      },
    });
  });

  await registerHealthRoutes(app);
  return app;
}
