import { buildApp } from "./app.js";
import { loadConfig } from "./config/env.js";

const config = loadConfig();
const app = await buildApp(config);

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  app.log.info({ signal }, "Shutting down backend");
  try {
    await app.close();
    process.exitCode = 0;
  } catch (error) {
    app.log.error({ err: error }, "Backend shutdown failed");
    process.exitCode = 1;
  }
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error({ err: error }, "Backend failed to start");
  await app.close();
  process.exitCode = 1;
}
