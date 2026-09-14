const crypto = require("crypto");
const bcrypt = require("bcrypt");
const env = require("../config/env");

/**
 * Deterministically derives an anonymous ID from email + password + server salt.
 * Same credentials always produce the same anonId — this is what lets a user
 * "recover" their identity by simply logging in again, with nothing personal
 * ever stored server-side.
 *
 * HMAC-SHA256 is used (not plain SHA256) so the salt acts as a proper key,
 * not just an appended string vulnerable to length-extension attacks.
 */
function deriveAnonId(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const hmac = crypto.createHmac("sha256", env.ANON_ID_SALT);
  hmac.update(`${normalizedEmail}:${password}`);
  return `anon_${hmac.digest("hex").slice(0, 32)}`;
}

/**
 * One-way hash of the email for duplicate-account detection.
 * Never used to recover the original email — only to check equality.
 */
function hashEmail(email) {
  return crypto
    .createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
}

async function hashPassword(password) {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * SHA-256 hash of an opaque token (refresh token) for at-rest storage.
 * The raw token is only ever held client-side; the DB only ever sees the hash,
 * so a leaked database dump cannot be replayed as valid session tokens.
 */
function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/** Cryptographically strong random token for refresh tokens / recovery flows. */
function randomToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** Constant-time string comparison — avoids timing side-channels. */
function safeCompare(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
  deriveAnonId,
  hashEmail,
  hashPassword,
  verifyPassword,
  hashToken,
  randomToken,
  safeCompare,
};
