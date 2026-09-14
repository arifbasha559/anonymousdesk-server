const { Worker } = require("bullmq");
const redis = require("../../config/redis");
const prisma = require("../../config/prisma");
const logger = require("../../config/logger");

const notificationWorker = new Worker(
  "notification",
  async (job) => {
    const { userId, notifType, title, body, refPostId, refReplyId } = job.data;

    await prisma.notification.create({
      data: {
        userId,
        notifType,
        title,
        body: body || null,
        refPostId: refPostId || null,
        refReplyId: refReplyId || null,
      },
    });
  },
  { connection: redis, concurrency: 10 }
);

notificationWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Notification job failed");
});

module.exports = notificationWorker;
