FROM node:18-alpine AS base
WORKDIR /app

COPY package*.json ./
COPY .env ./
COPY prisma ./prisma
RUN apk add --no-cache openssl python3 make g++

RUN npm ci --omit=dev && npx prisma generate

COPY src ./src

# Run as non-root user — never run the container as root in production.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

EXPOSE 3000

COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Run as non-root user
RUN chown -R appuser:appgroup /app
USER appuser

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
