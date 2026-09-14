const { ApiError } = require("../utils/apiResponse");

/**
 * Validates and replaces req[part] with the parsed (and coerced/stripped)
 * result — so downstream handlers only ever see clean, typed data and can
 * never receive unexpected extra fields (zod strips by default unless
 * .passthrough() is used, which we never use).
 */
function validate(schema, part = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const details = result.error.flatten().fieldErrors;
      return next(ApiError.badRequest("Validation failed", details));
    }
    req[part] = result.data;
    next();
  };
}

module.exports = validate;
