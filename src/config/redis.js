const Redis = require("ioredis");
const env = require("./env");
const logger = require("./logger");

// maxRetriesPerRequest: null is required for BullMQ compatibility.
// Upstash requires TLS — the rediss:// scheme in REDIS_URL handles that automatically.
const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => logger.error({ err }, "Redis connection error"));

module.exports = redis;
