#!/bin/sh
set -e

if [ "${NODE_ENV:-development}" != "production" ]; then
  if [ ! -f node_modules/.deps-synced ] || ! cmp -s package-lock.json node_modules/.deps-synced 2>/dev/null; then
    echo "Syncing npm dependencies..."
    npm ci
    cp package-lock.json node_modules/.deps-synced
  fi
fi

if [ -f prisma/schema.prisma ]; then
  if [ -d src/generated/prisma ] && [ ! -f src/generated/prisma/client.ts ]; then
    echo "Removing incomplete Prisma Client at src/generated/prisma..."
    rm -rf src/generated/prisma
  fi
  npx prisma generate
fi

if [ "${SKIP_MIGRATIONS:-false}" != "true" ]; then
  echo "Applying database migrations..."
  max_attempts=30
  attempt=0

  until npx prisma migrate deploy; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "Migration failed after ${max_attempts} attempts"
      exit 1
    fi
    echo "Database not ready, retrying in 2s... (${attempt}/${max_attempts})"
    sleep 2
  done

  echo "Migrations applied successfully"
fi

exec "$@"
