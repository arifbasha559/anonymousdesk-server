const { z } = require("zod");

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128)
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a digit");

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: passwordSchema,
  industry: z.string().trim().min(2).max(100),
  jobTitle: z.string().trim().min(2).max(150),
  yearsExp: z.coerce.number().int().min(0).max(60),
  deviceFingerprint: z.string().max(255).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(128),
  deviceFingerprint: z.string().max(255).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

const updateIndustrySchema = z.object({
  industry: z.string().trim().min(2).max(100),
  jobTitle: z.string().trim().min(2).max(150),
  yearsExp: z.coerce.number().int().min(0).max(60),
});

module.exports = { registerSchema, loginSchema, refreshSchema, updateIndustrySchema };
