const helmet = require("helmet");
const cors = require("cors");
const hpp = require("hpp");
const mongoSanitize = require("express-mongo-sanitize");
const env = require("../config/env");
const logger = require("../config/logger");

const allowedOrigins = env.CORS_ORIGINS.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow no-origin requests (native mobile apps, curl, server-to-server)
    // but enforce an explicit allowlist for browser-based origins.
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    logger.warn({ origin }, "Blocked CORS request from disallowed origin");
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Device-Fingerprint"],
  maxAge: 600,
};

function applySecurityMiddleware(app) {
  // Helmet sets a strong baseline: HSTS, X-Content-Type-Options, X-Frame-Options,
  // and a restrictive CSP suitable for a pure JSON API (no inline scripts/styles needed).
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: "same-site" },
    })
  );

  app.use(cors(corsOptions));

  // Strips any key beginning with `$` or containing `.` from req.body/query/params —
  // blocks NoSQL/Prisma operator-injection style payloads.
  app.use(mongoSanitize());

  // Prevents HTTP Parameter Pollution (?tag=a&tag=b resolving to an array
  // where a single string was expected downstream).
  app.use(hpp());

  // Never leak framework fingerprint.
  app.disable("x-powered-by");
}

module.exports = applySecurityMiddleware;
