// Entry point for the background worker process.
// Run separately from the API server: `npm run worker`
require("../../config/env"); // validates env before anything else
const logger = require("../../config/logger");

const moderationWorker = require("./moderation.worker");
const summaryWorker = require("./summary.worker");
const notificationWorker = require("./notification.worker");

logger.info("AnonymousDesk workers started (moderation, summary, notification)");

async function shutdown() {
  logger.info("Shutting down workers gracefully...");
  await Promise.all([
    moderationWorker.close(),
    summaryWorker.close(),
    notificationWorker.close(),
  ]);
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
