#!/bin/bash
# Railway startup script - decides whether to run web or worker

# Run migrations before starting any service
echo "🗄️  Running database migrations..."
pnpm prisma migrate deploy

if [ "$SERVICE_TYPE" = "worker" ]; then
  echo "🔧 Starting worker service..."
  pnpm worker
else
  echo "🌐 Starting web service..."
  pnpm start
fi
