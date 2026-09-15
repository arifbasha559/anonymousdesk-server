const env = require("./config/env");
const logger = require("./config/logger");
const app = require("./app");
const prisma = require("./config/prisma");
const redis = require("./config/redis");
const readline = require('readline');

const server = app.listen(env.PORT, () => {
  logger.info(`AnonymousDesk API listening on port ${env.PORT} [${env.NODE_ENV}]`);
});

// Never let the process silently keep running in a broken state —
// crash loudly so the process manager (PM2/Docker/Railway) can restart it.
process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled promise rejection — shutting down");
  shutdown(1);
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — shutting down");
  shutdown(1);
});

async function shutdown(code = 0) {
  logger.info("Shutting down gracefully...");
  logger.trace("goodbye")
  server.close(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(code);
  });

  // Force-exit if graceful shutdown hangs beyond 10s.
  setTimeout(() => process.exit(code), 10_000).unref();
}

process.on("SIGTERM", () => shutdown(0));

// Fixes Ctrl+C handling on Windows
if (process.platform === "win32") {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on("SIGINT", () => {
    process.emit("SIGINT");
  });
}
process.on("SIGINT", () => { shutdown(0), process.exit(0) });

module.exports = server;
