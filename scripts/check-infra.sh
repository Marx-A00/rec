#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# check-infra.sh — verify Colima, Docker, and Redis are up
#
# Exits non-zero if anything is missing.
# Run `pnpm infra:start` to boot everything.
# ─────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

FAILED=0

# Colima
if colima status 2>&1 | grep -qi "running"; then
  echo -e "${GREEN}✔${NC} Colima"
else
  echo -e "${RED}✖ Colima is not running${NC}"
  FAILED=1
fi

# Docker
if docker info >/dev/null 2>&1; then
  echo -e "${GREEN}✔${NC} Docker"
else
  echo -e "${RED}✖ Docker daemon is not reachable${NC}"
  FAILED=1
fi

# Redis
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "redis"; then
  echo -e "${GREEN}✔${NC} Redis"
else
  echo -e "${RED}✖ Redis container is not running${NC}"
  FAILED=1
fi

if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo -e "${RED}Infrastructure is not ready. Run: pnpm infra:start${NC}"
  exit 1
fi
