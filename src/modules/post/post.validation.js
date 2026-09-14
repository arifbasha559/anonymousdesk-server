const { z } = require("zod");

const createPostSchema = z.object({
  title: z.string().trim().min(10, "Title must be at least 10 characters").max(300),
  body: z.string().trim().min(30, "Body must be at least 30 characters").max(5000),
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(6).optional().default([]),
});

const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  categoryId: z.string().uuid().optional(),
  tag: z.string().trim().max(50).optional(),
  search: z.string().trim().max(200).optional(),
  sort: z.enum(["hot", "recent", "top"]).default("recent"),
});

const postIdParamSchema = z.object({
  postId: z.string().uuid(),
});

module.exports = { createPostSchema, listPostsQuerySchema, postIdParamSchema };
