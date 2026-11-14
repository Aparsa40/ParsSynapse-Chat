import { spawn } from "node:child_process";
import process from "node:process";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const services = [
  { name: "backend", args: ["run", "dev", "--prefix", "backend"] },
  { name: "frontend", args: ["run", "dev", "--prefix", "frontend"] },
];

const children = [];
let shuttingDown = false;
let remaining = services.length;

function stopAll(signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (child && child.exitCode === null && !child.killed) {
      child.kill(signal);
    }
  }
}

for (const service of services) {
  console.log(`[root] Starting ${service.name}...`);

  const child = spawn(npmCommand, service.args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: isWindows,
  });

  children.push(child);

  child.on("error", (error) => {
    console.error(`[root] Failed to start ${service.name}: ${error.message}`);
    process.exitCode = 1;
    stopAll();
  });

  child.on("exit", (code, signal) => {
    remaining -= 1;

    if (!shuttingDown) {
      console.error(
        `[root] ${service.name} exited (code: ${code ?? "none"}, signal: ${signal ?? "none"}). Stopping the other service.`,
      );
      process.exitCode = code ?? 1;
      stopAll();
    }

    if (remaining === 0) {
      process.exit(process.exitCode ?? 0);
    }
  });
}

process.on("SIGINT", () => {
  process.exitCode = 130;
  stopAll("SIGINT");
});

process.on("SIGTERM", () => {
  process.exitCode = 143;
  stopAll("SIGTERM");
});
