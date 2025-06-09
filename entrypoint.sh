#!/usr/bin/env sh
set -e

echo "🚀  Running Prisma migrations…"
bunx prisma migrate deploy          # or bunx prisma migrate dev --name init

echo "🔧  Generating Prisma client…"
bunx prisma generate                # idempotent

echo "🎨  Building Vite assets…"
# If you already have a build script in package.json call `bun run build` instead.
bunx vite build --mode=${NODE_ENV:-production}

echo "✅  Starting Bun server"
exec "$@"                           # hands control to CMD from Dockerfile
