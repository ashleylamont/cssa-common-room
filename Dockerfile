# syntax=docker/dockerfile:1

FROM oven/bun:1.2-slim

WORKDIR /app

# 1) install all deps (including dev-deps for Vite/Prisma)
COPY bun.lock package.json tsconfig.json* ./
RUN bun install --frozen-lockfile

# 2) install openssl
RUN apt-get update && apt-get install -y openssl
#    (needed for Prisma to generate the client with the correct schema)

# 3) copy source and build everything
COPY . .
RUN bunx prisma migrate deploy \
    && bunx prisma generate \
    && bunx vite build --mode=production

# 4) run the server
EXPOSE 3001
CMD ["bun", "src/doorStatus.ts"]
