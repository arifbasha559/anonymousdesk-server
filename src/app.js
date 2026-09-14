const express = require("express");
const compression = require("compression");
const pinoHttp = require("pino-http");

const env = require("./config/env");
const logger = require("./config/logger");
const applySecurityMiddleware = require("./middleware/security");
const { globalLimiter } = require("./middleware/rateLimiter");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const routes = require("./routes");

const app = express();

// Trust the first proxy hop (Railway/Render/behind a load balancer) so
// req.ip reflects the real client IP for rate limiting — never trust blindly
// beyond one hop in production.
app.set("trust proxy", 1);

applySecurityMiddleware(app);

app.use(compression());

// Hard cap on request body size — mitigates payload-based DoS.
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === "/health" },
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  })
);

app.use(globalLimiter);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", env: env.NODE_ENV, timestamp: new Date().toISOString() });
});

app.use("/api/v1", routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
