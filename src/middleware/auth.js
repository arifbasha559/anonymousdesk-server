const { verifyAccessToken } = require("../utils/jwt");
const { ApiError } = require("../utils/apiResponse");
const redis = require("../config/redis");
const prisma = require("../config/prisma");

/**
 * Verifies the Bearer access token, checks it hasn't been explicitly revoked
 * (logout / password change) via a Redis denylist keyed by jti-equivalent
 * (we use the token's own signature suffix since we don't mint jti claims),
 * and attaches a minimal `req.user` to the request.
 *
 * Deliberately does NOT hit Postgres/MySQL on every request for performance —
 * trustLevel is read from the token claim, which is at most JWT_ACCESS_TTL stale.
 * Endpoints that need a guaranteed-fresh trustLevel (e.g. admin actions) should
 * use `requireFreshUser` below instead.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw ApiError.unauthorized("Missing or malformed Authorization header");
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        throw ApiError.unauthorized("Access token expired");
      }
      throw ApiError.unauthorized("Invalid access token");
    }

    const denylisted = await redis.get(`denylist:${token}`);
    if (denylisted) {
      throw ApiError.unauthorized("Token has been revoked");
    }

    req.user = {
      id: payload.sub,
      anonId: payload.anonId,
      trustLevel: payload.trustLevel,
    };
    req.accessToken = token;

    next();
  } catch (err) {
    next(err);
  }
}

/** For sensitive actions (admin resolve, ban) — re-reads the user row so a
 * trust-level downgrade or ban takes effect immediately, not just after the
 * current access token expires. */
async function requireFreshUser(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || user.isBanned || !user.isActive) {
      throw ApiError.forbidden("Account is not in good standing");
    }
    req.user.trustLevel = user.trustLevel;
    req.freshUser = user;
    next();
  } catch (err) {
    next(err);
  }
}

function requireTrustLevel(minLevel) {
  const order = ["newcomer", "contributor", "trusted", "expert"];
  return (req, res, next) => {
    const userIdx = order.indexOf(req.user?.trustLevel);
    const minIdx = order.indexOf(minLevel);
    if (userIdx < 0 || userIdx < minIdx) {
      return next(ApiError.forbidden(`Requires ${minLevel} trust level or higher`));
    }
    next();
  };
}

module.exports = { requireAuth, requireFreshUser, requireTrustLevel };
