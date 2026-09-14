const { Queue } = require("bullmq");
const redis = require("../config/redis");

const connection = redis;

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 24 * 3600 },
};

const moderationQueue = new Queue("moderation", { connection, defaultJobOptions });
const summaryQueue = new Queue("summary", { connection, defaultJobOptions });
const notificationQueue = new Queue("notification", { connection, defaultJobOptions });

module.exports = { moderationQueue, summaryQueue, notificationQueue };
