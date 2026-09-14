const pino = require("pino");
const env = require("./env");

// Redact anything that could leak credentials or tokens into logs,
// even if a developer accidentally logs a full request/response object.
const redactConfig = {
  paths: [
    "req.headers.authorization",
    "req.headers.cookie",
    "*.password",
    "*.email",
    "*.token",
    "*.access_token",
    "*.refresh_token",
    "*.passwordHash",
    "*.password_hash",
  ],
  censor: "[REDACTED]",
};

let transport;
if (env.NODE_ENV === "development") {
  try {
    // pino-pretty is a devDependency — resolve it defensively so a minimal
    // production install (or a missing devDependency) never crashes boot
    // over a log formatting preference.
    require.resolve("pino-pretty");
    transport = { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } };
  } catch {
    transport = undefined;
  }
}

const logger = pino({
  level: env.LOG_LEVEL,
  redact: redactConfig,
  transport,
});

module.exports = logger;
