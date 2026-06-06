#!/usr/bin/env bash
# =============================================================================
# New Releases Source Comparison Script
# Compares: Spotify (tag:new search) vs ListenBrainz (fresh-releases) vs Deezer (editorial/releases)
#
# Usage:
#   chmod +x scripts/compare-new-releases.sh
#   ./scripts/compare-new-releases.sh
#
# Requirements:
#   - curl
#   - python3
#   - .env file with SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET
#
# NOTE: This script creates temp files in /tmp/rec-compare/ and a final
#       comparison report. It does NOT write to the database.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

COMPARE_DIR="$PROJECT_DIR/scripts/comparison-output"
mkdir -p "$COMPARE_DIR"

TODAY=$(date +%Y-%m-%d)
YEAR=$(date +%Y)

# Load .env file for Spotify credentials
if [ -f "$PROJECT_DIR/.env" ]; then
  # Extract Spotify creds (strip quotes)
  SPOTIFY_CLIENT_ID=$(grep '^SPOTIFY_CLIENT_ID=' "$PROJECT_DIR/.env" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
  SPOTIFY_CLIENT_SECRET=$(grep '^SPOTIFY_CLIENT_SECRET=' "$PROJECT_DIR/.env" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
fi

echo "=============================================="
echo "  New Releases Source Comparison"
echo "  Date: $TODAY"
echo "=============================================="
echo ""

# -----------------------------------------------------------------------------
# 1. LISTENBRAINZ - Fresh Releases (no auth needed)
# -----------------------------------------------------------------------------
echo "[1/3] Fetching ListenBrainz fresh releases..."
echo "  Endpoint: GET /1/explore/fresh-releases/"
echo "  Params: release_date=$TODAY, days=14, past=true, future=true"
echo ""

curl -s \
  "https://api.listenbrainz.org/1/explore/fresh-releases/?release_date=${TODAY}&days=14&past=true&future=true&sort=release_date" \
  -o "$COMPARE_DIR/listenbrainz_raw.json"

echo "  Saved to: $COMPARE_DIR/listenbrainz_raw.json"
echo ""

# -----------------------------------------------------------------------------
# 2. DEEZER - Editorial Releases (no auth needed)
# -----------------------------------------------------------------------------
echo "[2/3] Fetching Deezer editorial releases..."
echo "  Endpoint: GET /editorial/0/releases"
echo "  Params: limit=200 (max available)"
echo ""

# Deezer paginates at 100 max per page, total is 200
curl -s "https://api.deezer.com/editorial/0/releases?limit=100" \
  -o "$COMPARE_DIR/deezer_page1.json"

curl -s "https://api.deezer.com/editorial/0/releases?limit=100&index=100" \
  -o "$COMPARE_DIR/deezer_page2.json"

echo "  Saved to: $COMPARE_DIR/deezer_page1.json, deezer_page2.json"
echo ""

# Also fetch full album details for a sample to compare field richness
# (pick first 5 album IDs from page 1)
echo "  Fetching 5 full album objects for field comparison..."
DEEZER_SAMPLE_IDS=$(python3 -c "
import json
with open('$COMPARE_DIR/deezer_page1.json') as f:
    data = json.load(f)
ids = [str(item['id']) for item in data.get('data', [])[:5]]
print(' '.join(ids))
")

for ALBUM_ID in $DEEZER_SAMPLE_IDS; do
  curl -s "https://api.deezer.com/album/$ALBUM_ID" \
    -o "$COMPARE_DIR/deezer_album_${ALBUM_ID}.json"
done
echo "  Saved 5 full album objects"
echo ""

# -----------------------------------------------------------------------------
# 3. SPOTIFY - Search with tag:new (requires auth token)
# -----------------------------------------------------------------------------
echo "[3/3] Fetching Spotify new releases via Search API..."
echo "  Endpoint: GET /v1/search"
echo "  Query: tag:new year:$YEAR"
echo "  Params: type=album, market=US, limit=50, 3 pages"
echo ""

if [ -z "${SPOTIFY_CLIENT_ID:-}" ] || [ -z "${SPOTIFY_CLIENT_SECRET:-}" ]; then
  echo "  WARNING: SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not found in .env"
  echo "  Skipping Spotify fetch. Will compare with existing data if available."
  echo ""
else
  # Auto-fetch bearer token via client credentials flow
  echo "  Fetching access token via client credentials..."
  SPOTIFY_ACCESS_TOKEN=$(curl -s -X POST "https://accounts.spotify.com/api/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=client_credentials&client_id=${SPOTIFY_CLIENT_ID}&client_secret=${SPOTIFY_CLIENT_SECRET}" \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("access_token",""))')

  if [ -z "$SPOTIFY_ACCESS_TOKEN" ]; then
    echo "  ERROR: Failed to get Spotify access token. Check credentials."
    echo "  Skipping Spotify fetch."
    echo ""
  else
  echo "  Got access token."
  echo ""
  QUERY="tag:new%20year:${YEAR}"
  for PAGE in 0 1 2; do
    OFFSET=$((PAGE * 50))
    curl -s \
      -H "Authorization: Bearer $SPOTIFY_ACCESS_TOKEN" \
      "https://api.spotify.com/v1/search?q=${QUERY}&type=album&market=US&limit=50&offset=${OFFSET}" \
      -o "$COMPARE_DIR/spotify_page${PAGE}.json"
  done
  echo "  Saved to: $COMPARE_DIR/spotify_page0.json, spotify_page1.json, spotify_page2.json"
  echo ""

  # Fetch artist details for follower data (first 50 unique primary artists)
  echo "  Fetching artist details for follower counts..."
  ARTIST_IDS=$(python3 -c "
import json, sys
artist_ids = set()
for page in range(3):
    try:
        with open(f'$COMPARE_DIR/spotify_page{page}.json') as f:
            data = json.load(f)
        for album in data.get('albums', {}).get('items', []):
            if album.get('artists'):
                artist_ids.add(album['artists'][0]['id'])
    except: pass
# Spotify allows 50 IDs per request
ids = list(artist_ids)[:50]
print(','.join(ids))
")

  if [ -n "$ARTIST_IDS" ]; then
    curl -s \
      -H "Authorization: Bearer $SPOTIFY_ACCESS_TOKEN" \
      "https://api.spotify.com/v1/artists?ids=${ARTIST_IDS}" \
      -o "$COMPARE_DIR/spotify_artists.json"
    echo "  Saved artist details"
  fi
  echo ""
  fi  # end token check
fi  # end creds check

# -----------------------------------------------------------------------------
# 4. ANALYSIS - Run Python comparison
# -----------------------------------------------------------------------------
echo "=============================================="
echo "  Running comparison analysis..."
echo "=============================================="
echo ""

python3 scripts/analyze-comparison.py "$COMPARE_DIR" "$TODAY"

echo ""
echo "=============================================="
echo "  Done! Full report: $COMPARE_DIR/comparison_report.txt"
echo "=============================================="
