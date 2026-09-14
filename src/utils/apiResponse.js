/**
 * Consistent response envelope across every endpoint so client code
 * never has to guess the shape of a success or error response.
 */
function success(res, data, status = 200, meta) {
  return res.status(status).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

function created(res, data) {
  return success(res, data, 201);
}

function noContent(res) {
  return res.status(204).send();
}

class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }
  static unauthorized(message = "Authentication required") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "Permission denied") {
    return new ApiError(403, "FORBIDDEN", message);
  }
  static notFound(message = "Resource not found") {
    return new ApiError(404, "NOT_FOUND", message);
  }
  static conflict(message) {
    return new ApiError(409, "CONFLICT", message);
  }
  static tooManyRequests(message = "Too many requests") {
    return new ApiError(429, "RATE_LIMITED", message);
  }
  static internal(message = "Internal server error") {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }
}

module.exports = { success, created, noContent, ApiError };
