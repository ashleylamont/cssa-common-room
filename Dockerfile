# syntax=docker/dockerfile:1

############################
# -------- builder --------
############################
FROM oven/bun:1.2-slim AS builder

WORKDIR /app

# 1) install all deps (including dev-deps for Vite/Prisma)
COPY bun.lock package.json tsconfig.json* ./
RUN bun install --frozen-lockfile

# 2) copy source and build everything
COPY . .
RUN bunx prisma generate \
    && bunx vite build --mode=production

############################
# -------- runtime --------
############################
FROM oven/bun:1.2-slim AS runtime

WORKDIR /app

# 1) install *prod* deps only (slimmer image)
COPY bun.lock package.json tsconfig.json* ./
RUN bun install --frozen-lockfile --production

# 2) bring in the compiled artefacts & prisma folder
COPY --from=builder /app/dist   ./dist
COPY --from=builder /app/prisma ./prisma

# 3) entrypoint will run migrations, regenerate client if needed, etc.
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bun", "src/doorStatus.ts"]
