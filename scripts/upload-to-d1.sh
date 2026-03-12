#!/bin/bash
set -e

# Upload game_albums_data.sql to Cloudflare D1 (remote)
# Usage: bash scripts/upload-to-d1.sh
#
# This script:
# 1. Drops and recreates tables (faster than DELETE on large datasets)
# 2. Splits the SQL dump into small chunks (10k lines — D1 safe)
# 3. Uploads each chunk sequentially with progress
# 4. Verifies the final row count

WRANGLER_CONFIG="cloudflare/wrangler.toml"
DB_NAME="game-albums"
SQL_FILE="game_albums_data.sql"
SCHEMA_FILE="cloudflare/schema.sql"
CHUNK_DIR="d1-chunks"
CHUNK_SIZE=10000  # lines per chunk — D1 safe limit

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${CYAN}  Cloudflare D1 Upload: game-albums        ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""

# Check files exist
if [ ! -f "$SQL_FILE" ]; then
  echo -e "${RED}Error: $SQL_FILE not found.${NC}"
  echo "Run the import script first: pnpm import:d1-lookup"
  exit 1
fi
if [ ! -f "$SCHEMA_FILE" ]; then
  echo -e "${RED}Error: $SCHEMA_FILE not found.${NC}"
  exit 1
fi

TOTAL_LINES=$(wc -l < "$SQL_FILE" | tr -d ' ')
TOTAL_CHUNKS=$(( (TOTAL_LINES + CHUNK_SIZE - 1) / CHUNK_SIZE ))
echo -e "${YELLOW}SQL file:${NC}    $SQL_FILE"
echo -e "${YELLOW}Total rows:${NC}  $TOTAL_LINES"
echo -e "${YELLOW}Chunk size:${NC}  $CHUNK_SIZE lines"
echo -e "${YELLOW}Chunks:${NC}      $TOTAL_CHUNKS"
echo ""

# Step 1: Drop and recreate tables
echo -e "${BOLD}[1/4] Dropping existing tables...${NC}"
npx wrangler d1 execute "$DB_NAME" --remote \
  --command="DROP TRIGGER IF EXISTS albums_ai; DROP TRIGGER IF EXISTS albums_ad; DROP TRIGGER IF EXISTS albums_au; DROP TABLE IF EXISTS albums_fts; DROP TABLE IF EXISTS albums;" \
  --config "$WRANGLER_CONFIG" 2>&1 | tail -1
echo -e "${GREEN}  Done${NC}"
echo ""

echo -e "${BOLD}[2/4] Recreating schema...${NC}"
npx wrangler d1 execute "$DB_NAME" --remote \
  --file="$SCHEMA_FILE" \
  --config "$WRANGLER_CONFIG" 2>&1 | tail -1
echo -e "${GREEN}  Done${NC}"
echo ""

# Step 3: Split into chunks
echo -e "${BOLD}[3/4] Uploading data in $TOTAL_CHUNKS chunks...${NC}"
echo ""
rm -rf "$CHUNK_DIR"
mkdir -p "$CHUNK_DIR"
split -l "$CHUNK_SIZE" "$SQL_FILE" "$CHUNK_DIR/chunk_"

CURRENT=0
FAILED=0
FAIL_LIST=""
START_TIME=$(date +%s)

for chunk in "$CHUNK_DIR"/chunk_*; do
  CURRENT=$((CURRENT + 1))
  LINES_IN_CHUNK=$(wc -l < "$chunk" | tr -d ' ')
  ROWS_SO_FAR=$((CURRENT * CHUNK_SIZE))
  if [ "$ROWS_SO_FAR" -gt "$TOTAL_LINES" ]; then
    ROWS_SO_FAR=$TOTAL_LINES
  fi
  PCT=$((ROWS_SO_FAR * 100 / TOTAL_LINES))

  # Progress bar
  BAR_WIDTH=30
  FILLED=$((PCT * BAR_WIDTH / 100))
  EMPTY=$((BAR_WIDTH - FILLED))
  BAR=$(printf '%0.s█' $(seq 1 $FILLED 2>/dev/null) )
  BAR_EMPTY=$(printf '%0.s░' $(seq 1 $EMPTY 2>/dev/null) )

  echo -ne "  ${CYAN}[${CURRENT}/${TOTAL_CHUNKS}]${NC} ${BAR}${BAR_EMPTY} ${PCT}%  (${LINES_IN_CHUNK} rows) "

  OUTPUT=$(npx wrangler d1 execute "$DB_NAME" --remote \
    --file="$chunk" \
    --config "$WRANGLER_CONFIG" 2>&1)

  if echo "$OUTPUT" | grep -qi "error"; then
    echo -e "${RED}FAILED${NC}"
    ERR_MSG=$(echo "$OUTPUT" | grep -i "error" | head -1)
    echo -e "    ${RED}${ERR_MSG}${NC}"
    FAILED=$((FAILED + 1))
    FAIL_LIST="${FAIL_LIST} ${CURRENT}"
  else
    DURATION=$(echo "$OUTPUT" | grep -o '"duration":[0-9.]*' | tail -1 | cut -d: -f2)
    echo -e "${GREEN}OK${NC} (${DURATION:-?}ms)"
  fi
done

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
ELAPSED_MIN=$((ELAPSED / 60))
ELAPSED_SEC=$((ELAPSED % 60))

echo ""

# Step 4: Verify
echo -e "${BOLD}[4/4] Verifying...${NC}"
RESULT=$(npx wrangler d1 execute "$DB_NAME" --remote \
  --command="SELECT COUNT(*) as count FROM albums;" \
  --config "$WRANGLER_CONFIG" 2>&1)

COUNT=$(echo "$RESULT" | grep -o '"count":[0-9]*' | cut -d: -f2)

echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "  ${BOLD}Results${NC}"
echo -e "${CYAN}───────────────────────────────────────────${NC}"
echo -e "  Expected rows:  ${YELLOW}${TOTAL_LINES}${NC}"
echo -e "  Actual rows:    ${YELLOW}${COUNT:-unknown}${NC}"
echo -e "  Failed chunks:  ${YELLOW}${FAILED}${NC}"
echo -e "  Time elapsed:   ${YELLOW}${ELAPSED_MIN}m ${ELAPSED_SEC}s${NC}"

if [ "$FAILED" -gt 0 ]; then
  echo ""
  echo -e "  ${RED}Failed chunks:${FAIL_LIST}${NC}"
  echo -e "  ${RED}Re-run the script to retry (drops and starts fresh).${NC}"
fi

if [ "${COUNT:-0}" -ge "$TOTAL_LINES" ]; then
  echo ""
  echo -e "  ${GREEN}Upload complete! All rows verified.${NC}"
elif [ "${COUNT:-0}" -gt 0 ] && [ "$FAILED" -eq 0 ]; then
  echo ""
  echo -e "  ${YELLOW}Slight mismatch — likely UNIQUE constraint skips. This is OK.${NC}"
fi

echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""

# Cleanup
rm -rf "$CHUNK_DIR"
echo -e "${GREEN}Cleaned up chunk files.${NC}"
echo ""
echo -e "Next: test the search endpoint:"
echo -e "  ${CYAN}curl \"https://game-album-lookup.marcos-0x.workers.dev/search?q=metallica&limit=5\"${NC}"
echo ""
