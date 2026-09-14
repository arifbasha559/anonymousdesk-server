const { PrismaClient } = require("@prisma/client");
const env = require("./env");
const logger = require("./logger");

// Singleton — prevents exhausting the MySQL connection pool
// under nodemon/hot-reload or serverless cold starts.
const prisma =
  global.__prisma__ ||
  new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? [{ level: "warn", emit: "event" }, { level: "error", emit: "event" }]
        : [{ level: "error", emit: "event" }],
  });

prisma.$on("warn", (e) => logger.warn({ prisma: e }, "Prisma warning"));
prisma.$on("error", (e) => logger.error({ prisma: e }, "Prisma error"));

if (env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}

module.exports = prisma;
