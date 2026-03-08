#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
# dev-start.sh — boot Colima, Docker, and Redis
# ─────────────────────────────────────────────────────────

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

step() { echo -e "\n${CYAN}▸ $1${NC}"; }
ok()   { echo -e "  ${GREEN}✔ $1${NC}"; }
warn() { echo -e "  ${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "  ${RED}✖ $1${NC}"; exit 1; }

# ── Colima ─────────────────────────────────────────────

step "Colima"

if colima status 2>&1 | grep -qi "running"; then
  ok "Already running"
else
  warn "Starting Colima..."
  colima start || fail "Could not start Colima"
  ok "Started"
fi

# ── Docker ─────────────────────────────────────────────

step "Docker"

if docker info >/dev/null 2>&1; then
  ok "Daemon is reachable"
else
  fail "Docker daemon is not responding (is Colima healthy?)"
fi

# ── Redis ──────────────────────────────────────────────

step "Redis"

if docker ps --format '{{.Names}}' | grep -qx "redis"; then
  ok "Already running"
elif docker ps -a --format '{{.Names}}' | grep -qx "redis"; then
  warn "Container exists but stopped — starting..."
  docker start redis >/dev/null || fail "Could not start Redis"
  ok "Started"
else
  warn "No container found — creating..."
  docker run -d --name redis -p 6379:6379 redis:latest >/dev/null || fail "Could not create Redis"
  ok "Created and running"
fi

sleep 0.5
if docker exec redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
  ok "Responding to PING"
else
  warn "Running but not responding yet — give it a moment"
fi

# ── Done ───────────────────────────────────────────────

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Infrastructure is ready!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
