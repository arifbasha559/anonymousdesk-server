const { Prisma } = require("@prisma/client");
const { ApiError } = require("../utils/apiResponse");
const env = require("../config/env");
const logger = require("../config/logger");

function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let apiErr = err;

  // Translate known Prisma errors into safe, generic API errors —
  // never surface raw SQL/constraint details to the client.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      apiErr = ApiError.conflict("A record with this value already exists");
    } else if (err.code === "P2025") {
      apiErr = ApiError.notFound("Record not found");
    } else {
      apiErr = ApiError.internal("Database error");
    }
  } else if (!(err instanceof ApiError)) {
    apiErr = ApiError.internal(
      env.NODE_ENV === "production" ? "Something went wrong" : err.message
    );
  }

  const status = apiErr.status || 500;

  if (status >= 500) {
    logger.error({ err, path: req.originalUrl, method: req.method }, "Unhandled error");
  } else {
    logger.warn({ code: apiErr.code, path: req.originalUrl }, apiErr.message);
  }

  res.status(status).json({
    success: false,
    error: {
      code: apiErr.code || "ERROR",
      message: apiErr.message,
      ...(apiErr.details ? { details: apiErr.details } : {}),
      // Stack traces NEVER leave the server in production.
      ...(env.NODE_ENV !== "production" && err.stack ? { stack: err.stack } : {}),
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
