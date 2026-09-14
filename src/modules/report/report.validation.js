const { z } = require("zod");

const createReportSchema = z.object({
  reason: z.enum(["pii", "spam", "toxic", "off_topic", "other"]),
  details: z.string().trim().max(1000).optional(),
});

const resolveReportSchema = z.object({
  action: z.enum(["remove", "warn", "dismiss"]),
  note: z.string().trim().max(1000).optional(),
});

const reportIdParamSchema = z.object({
  reportId: z.string().uuid(),
});

const banUserSchema = z.object({
  reason: z.string().trim().min(3).max(500),
  durationDays: z.coerce.number().int().positive().max(3650).optional(),
});

const anonIdParamSchema = z.object({
  anonId: z.string().min(5),
});

const listReportsQuerySchema = z.object({
  status: z.enum(["pending", "resolved", "dismissed"]).default("pending"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

module.exports = {
  createReportSchema,
  resolveReportSchema,
  reportIdParamSchema,
  banUserSchema,
  anonIdParamSchema,
  listReportsQuerySchema,
};
