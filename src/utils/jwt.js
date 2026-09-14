const jwt = require("jsonwebtoken");
const env = require("../config/env");

/**
 * Access tokens are short-lived (default 15m) and carry only non-sensitive
 * claims: anonId, trustLevel. They are never persisted server-side — Redis
 * denylist handles early revocation (see auth.service.revokeAccessToken).
 */
function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      anonId: user.anonId,
      trustLevel: user.trustLevel,
      type: "access",
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_TTL, issuer: "anonymousdesk", audience: "anonymousdesk-app" }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: "anonymousdesk",
    audience: "anonymousdesk-app",
  });
}

/**
 * Refresh tokens are opaque random strings (see crypto.randomToken), NOT JWTs —
 * this lets us revoke them individually via DB lookup without needing a denylist
 * for every refresh token ever issued. This function is kept for symmetry /
 * future use if a stateless refresh flow is ever needed.
 */
function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = { signAccessToken, verifyAccessToken, decodeToken };
