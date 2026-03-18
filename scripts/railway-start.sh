#!/bin/bash
# Railway startup script - decides whether to run web or worker

# Run migrations before starting any service
echo "Running database migrations..."
pnpm prisma migrate deploy

if [ "$SERVICE_TYPE" = "worker" ]; then
  echo "Starting worker service..."
  tsx src/workers/queue-worker.ts
else
  echo "Starting web service..."
  # Standalone server must bind to 0.0.0.0 for Railway to route traffic
  HOSTNAME=0.0.0.0 PORT=${PORT:-3000} node server.js
fi
