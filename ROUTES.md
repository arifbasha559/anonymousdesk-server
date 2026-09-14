# API Routes

This document lists HTTP routes, middleware, request shapes, and success responses in a compact table.

Files referenced: [src/routes/index.js](src/routes/index.js#L1)

| Method | Path | Middleware | Request (params / query / body) | Success response (example) |
|---|---|---|---|---|
| POST | /auth/register | `authLimiter`, `validate(registerSchema)` | Body: `email, password, industry, jobTitle, yearsExp, deviceFingerprint?` | 201 `{ success: true, data: { anonId, industry, jobTitle, experienceYears, industryVerified, karma, trustLevel, accessToken, refreshToken, expiresAt, isNewUser } }` |
| POST | /auth/login | `authLimiter`, `validate(loginSchema)` | Body: `email, password, deviceFingerprint?` | 200 `{ success: true, data: { anonId, ..., accessToken, refreshToken, expiresAt, isNewUser } }` |
| POST | /auth/token/refresh | `authLimiter`, `validate(refreshSchema)` | Body: `refreshToken` | 200 `{ success: true, data: { accessToken, refreshToken, expiresAt } }` |
| POST | /auth/token/revoke | `requireAuth` | Body (optional): `refreshToken` | 200 `{ success: true, data: { status: "revoked" } }` |
| PATCH | /auth/profile/industry | `requireAuth`, `validate(updateIndustrySchema)` | Body: `industry, jobTitle, yearsExp` | 200 `{ success: true, data: <serialized user> }` |
| GET | /posts | `validate(listPostsQuerySchema, "query")` | Query: `page, limit, categoryId?, tag?, search?, sort` | 200 `{ success: true, data: [posts], meta: { total, page, hasNext } }` |
| POST | /posts | `requireAuth`, `writeLimiter`, `validate(createPostSchema)` | Body: `title, body, categoryId?, tags?` | 201 `{ success: true, data: { status: "created", postId } }` |
| GET | /posts/:postId | `validate(postIdParamSchema, "params")` | Params: `postId (uuid)` | 200 `{ success: true, data: <post> }` |
| POST | /posts/:postId/upvote | `requireAuth`, `writeLimiter`, `validate(postIdParamSchema, "params")` | Params: `postId` | 200 `{ success: true, data: { status: "upvoted", ... } }` |
| DELETE | /posts/:postId | `requireAuth`, `validate(postIdParamSchema, "params")` | Params: `postId` | 200 `{ success: true, data: { status: "removed" } }` |
| GET | /posts/:postId/replies | `validate(postIdParamSchema, "params")` | Params: `postId` | 200 `{ success: true, data: <reply list> }` |
| POST | /posts/:postId/replies | `requireAuth`, `writeLimiter`, `validate(postIdParamSchema, "params")`, `validate(createReplySchema)` | Body: `body, parentReplyId?` | 201 `{ success: true, data: { status: "submitted", replyId } }` |
| POST | /replies/:replyId/helpful | `requireAuth`, `writeLimiter`, `validate(replyIdParamSchema, "params")` | Params: `replyId` | 200 `{ success: true, data: { status: "marked", ... } }` |
| DELETE | /replies/:replyId | `requireAuth`, `validate(replyIdParamSchema, "params")` | Params: `replyId` | 200 `{ success: true, data: { status: "removed" } }` |
| GET | /notifications | `requireAuth`, `validate(listNotifQuerySchema, "query")` | Query: `page, limit, unreadOnly` | 200 `{ success: true, data: [notifications], meta: { unreadCount } }` |
| PATCH | /notifications/:notificationId/read | `requireAuth`, `validate(notifIdParamSchema, "params")` | Params: `notificationId (uuid)` | 200 `{ success: true, data: { status: "read" } }` |
| PATCH | /notifications/read-all | `requireAuth` | — | 200 `{ success: true, data: { status: "all_read", count } }` |
| GET | /users/me/karma | `requireAuth` | — | 200 `{ success: true, data: <karma history> }` |
| GET | /users/me/profile | `requireAuth` | — | 200 `{ success: true, data: <profile> }` |
| POST | /posts/:postId/report | `requireAuth`, `validate(postIdParamSchema, "params")`, `validate(createReportSchema)` | Body: `reason (pii|spam|toxic|off_topic|other), details?` | 201 `{ success: true, data: { status: "submitted", reportId } }` |
| POST | /replies/:replyId/report | `requireAuth`, `validate(replyIdParamSchema, "params")`, `validate(createReportSchema)` | Params: `replyId` | 201 `{ success: true, data: { status: "submitted", reportId } }` |
| GET | /admin/reports | `requireAuth`, `requireFreshUser`, `requireTrustLevel("expert")`, `validate(listReportsQuerySchema, "query")` | Query: `status, page, limit` | 200 `{ success: true, data: [reports], meta: { total, pendingCount } }` |
| PATCH | /admin/reports/:reportId/resolve | admin guard, `validate(reportIdParamSchema, "params")`, `validate(resolveReportSchema)` | Body: `action (remove|warn|dismiss), note?` | 200 `{ success: true, data: <result> }` |
| POST | /admin/users/:anonId/ban | admin guard, `validate(anonIdParamSchema, "params")`, `validate(banUserSchema)` | Body: `reason, durationDays?` | 200 `{ success: true, data: <result> }` |

---

**Notes:** All success responses use the envelope from [src/utils/apiResponse.js](src/utils/apiResponse.js#L1): `{ success: true, data, meta? }`.

---

Route mounting: [src/routes/index.js](src/routes/index.js#L1)

