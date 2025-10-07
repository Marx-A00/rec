#!/bin/bash
# Railway startup script - decides whether to run web or worker

if [ "$SERVICE_TYPE" = "worker" ]; then
  echo "🔧 Starting worker service..."
  pnpm worker
else
  echo "🌐 Starting web service..."
  pnpm start
fi
