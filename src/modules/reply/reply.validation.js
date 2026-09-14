const { z } = require("zod");

const createReplySchema = z.object({
  body: z.string().trim().min(10, "Reply must be at least 10 characters").max(3000),
  parentReplyId: z.string().uuid().nullable().optional(),
});

const replyIdParamSchema = z.object({
  replyId: z.string().uuid(),
});

module.exports = { createReplySchema, replyIdParamSchema };
