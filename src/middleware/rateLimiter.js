const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const redis = require("../config/redis");
const env = require("../config/env");
const { ApiError } = require("../utils/apiResponse");

function makeLimiter({ windowMs, max, prefix, keyGenerator }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
      prefix: `rl:${prefix}:`,
    }),
    keyGenerator: keyGenerator || ((req) => req.ip),
    handler: (req, res, next) => {
      next(ApiError.tooManyRequests("Too many requests — please slow down."));
    },
  });
}

// General API-wide limiter — generous, catches abusive clients/bots.
const globalLimiter = makeLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  prefix: "global",
});

// Tight limiter for auth endpoints — mitigates credential stuffing / brute force.
// Keyed by IP + email hash so a shared office IP doesn't lock out every user at once.
const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  prefix: "auth",
  keyGenerator: (req) => `${req.ip}:${req.body?.email || "unknown"}`,
});

// Per-user limiter for write-heavy actions (posting, replying) once authenticated.
const writeLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 20,
  prefix: "write",
  keyGenerator: (req) => req.user?.id || req.ip,
});

module.exports = { globalLimiter, authLimiter, writeLimiter };
