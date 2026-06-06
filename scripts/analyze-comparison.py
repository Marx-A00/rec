#!/usr/bin/env python3
"""
Analyze and compare new release data from three sources:
- ListenBrainz (fresh-releases API)
- Deezer (editorial/releases API)
- Spotify (search API with tag:new)

Produces a side-by-side comparison report.
"""

import json
import os
import sys
from collections import Counter
from datetime import datetime, timedelta

# =============================================================================
# HELPERS
# =============================================================================

def load_json(path):
    """Load a JSON file, return None if it doesn't exist."""
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def safe_get(d, *keys, default=None):
    """Safely traverse nested dicts."""
    for key in keys:
        if isinstance(d, dict):
            d = d.get(key, default)
        else:
            return default
    return d


# =============================================================================
# PARSERS - Normalize each source into a common format
# =============================================================================

def parse_listenbrainz(data_dir):
    """Parse ListenBrainz fresh-releases response."""
    raw = load_json(os.path.join(data_dir, "listenbrainz_raw.json"))
    if not raw:
        return None

    releases = raw.get("payload", {}).get("releases", [])
    total = raw.get("payload", {}).get("total_count", len(releases))

    parsed = []
    for r in releases:
        parsed.append({
            "source": "listenbrainz",
            "title": r.get("release_name", ""),
            "artist": r.get("artist_credit_name", ""),
            "release_date": r.get("release_date", ""),
            "primary_type": r.get("release_group_primary_type", ""),
            "secondary_type": r.get("release_group_secondary_type"),
            "tags": r.get("release_tags") or [],
            "has_cover_art": bool(r.get("caa_id")),
            "external_ids": {
                "release_mbid": r.get("release_mbid"),
                "release_group_mbid": r.get("release_group_mbid"),
                "artist_mbids": r.get("artist_mbids", []),
            },
            # ListenBrainz-specific
            "confidence": r.get("confidence"),
            "caa_id": r.get("caa_id"),
        })

    return {
        "source": "ListenBrainz",
        "endpoint": "GET /1/explore/fresh-releases/",
        "auth_required": False,
        "rate_limit": "Rate-limit headers (generous)",
        "total_count": total,
        "releases": parsed,
    }


def parse_deezer(data_dir):
    """Parse Deezer editorial/releases responses (2 pages)."""
    page1 = load_json(os.path.join(data_dir, "deezer_page1.json"))
    page2 = load_json(os.path.join(data_dir, "deezer_page2.json"))

    if not page1:
        return None

    items = page1.get("data", [])
    total = page1.get("total", len(items))

    if page2:
        items.extend(page2.get("data", []))

    # Also load any full album objects for field richness analysis
    full_albums = {}
    for fname in os.listdir(data_dir):
        if fname.startswith("deezer_album_") and fname.endswith(".json"):
            album_data = load_json(os.path.join(data_dir, fname))
            if album_data and "id" in album_data:
                full_albums[album_data["id"]] = album_data

    parsed = []
    for item in items:
        album_id = item.get("id")
        full = full_albums.get(album_id, {})

        parsed.append({
            "source": "deezer",
            "title": item.get("title", ""),
            "artist": safe_get(item, "artist", "name", default=""),
            "release_date": item.get("release_date", ""),
            "primary_type": item.get("type", "album"),
            "secondary_type": None,  # Deezer doesn't distinguish
            "tags": [],  # No tags in list endpoint
            "has_cover_art": bool(item.get("cover")),
            "external_ids": {
                "deezer_id": album_id,
                "deezer_artist_id": safe_get(item, "artist", "id"),
            },
            # Deezer-specific (from full album if available)
            "genre": safe_get(full, "genres", "data", default=[]),
            "label": full.get("label"),
            "fans": full.get("fans"),
            "nb_tracks": full.get("nb_tracks") or item.get("nb_tracks"),
            "upc": full.get("upc"),
            "record_type": full.get("record_type"),
            "explicit_lyrics": full.get("explicit_lyrics"),
            "duration_seconds": full.get("duration"),
        })

    return {
        "source": "Deezer",
        "endpoint": "GET /editorial/0/releases",
        "auth_required": False,
        "rate_limit": "Query quota (undocumented limit)",
        "total_count": total,
        "releases": parsed,
        "full_album_fields_available": list(full_albums.values())[0].keys() if full_albums else [],
    }


def parse_spotify(data_dir):
    """Parse Spotify search responses (3 pages) + artist details."""
    albums = []
    for page in range(3):
        page_data = load_json(os.path.join(data_dir, f"spotify_page{page}.json"))
        if page_data:
            items = safe_get(page_data, "albums", "items", default=[])
            albums.extend(items)

    if not albums:
        return None

    # Load artist follower data
    artist_data = load_json(os.path.join(data_dir, "spotify_artists.json"))
    artist_map = {}
    if artist_data:
        for artist in artist_data.get("artists", []):
            if artist:
                artist_map[artist["id"]] = {
                    "followers": safe_get(artist, "followers", "total", default=0),
                    "popularity": artist.get("popularity", 0),
                    "genres": artist.get("genres", []),
                }

    parsed = []
    for album in albums:
        primary_artist_id = album["artists"][0]["id"] if album.get("artists") else None
        artist_info = artist_map.get(primary_artist_id, {})

        parsed.append({
            "source": "spotify",
            "title": album.get("name", ""),
            "artist": ", ".join(a["name"] for a in album.get("artists", [])),
            "release_date": album.get("release_date", ""),
            "primary_type": album.get("album_type", ""),
            "secondary_type": None,  # Spotify doesn't have this
            "tags": [],  # No tags from search endpoint
            "has_cover_art": bool(album.get("images")),
            "external_ids": {
                "spotify_id": album.get("id"),
                "spotify_url": safe_get(album, "external_urls", "spotify"),
            },
            # Spotify-specific
            "release_date_precision": album.get("release_date_precision"),
            "total_tracks": album.get("total_tracks"),
            "album_type": album.get("album_type"),
            "artist_followers": artist_info.get("followers"),
            "artist_popularity": artist_info.get("popularity"),
            "artist_genres": artist_info.get("genres", []),
        })

    return {
        "source": "Spotify",
        "endpoint": "GET /v1/search?q=tag:new",
        "auth_required": True,
        "rate_limit": "OAuth token + rate headers",
        "total_count": len(parsed),
        "releases": parsed,
    }


# =============================================================================
# ANALYSIS
# =============================================================================

def analyze_source(source_data):
    """Produce analysis stats for a single source."""
    if not source_data:
        return None

    releases = source_data["releases"]
    n = len(releases)

    # Type breakdown
    type_counts = Counter(r["primary_type"] for r in releases)

    # Secondary type breakdown (compilations, live, etc.)
    secondary_counts = Counter(
        r["secondary_type"] for r in releases if r["secondary_type"]
    )

    # Clean albums (no compilations, live, soundtracks, etc.)
    clean_albums = [
        r for r in releases
        if r["primary_type"] in ("Album", "album")
        and not r["secondary_type"]
    ]

    # Date range
    dates = [r["release_date"] for r in releases if r["release_date"]]
    date_range = (min(dates), max(dates)) if dates else ("?", "?")

    # Cover art coverage
    with_art = sum(1 for r in releases if r["has_cover_art"])

    # Tag coverage
    with_tags = sum(1 for r in releases if r["tags"])

    # Date precision (Spotify-specific)
    precision_counts = Counter(
        r.get("release_date_precision", "day") for r in releases
    )

    # Unique artists
    artists = set(r["artist"] for r in releases)

    return {
        "total_releases": n,
        "clean_albums": len(clean_albums),
        "type_breakdown": dict(type_counts.most_common()),
        "secondary_types": dict(secondary_counts.most_common()),
        "date_range": date_range,
        "cover_art_pct": round(with_art / n * 100, 1) if n else 0,
        "tags_pct": round(with_tags / n * 100, 1) if n else 0,
        "unique_artists": len(artists),
        "date_precision": dict(precision_counts),
    }


def find_overlap(sources):
    """Find artists/albums that appear in multiple sources."""
    # Normalize: lowercase artist + title for matching
    source_sets = {}
    for src in sources:
        if src:
            key = src["source"]
            source_sets[key] = set()
            for r in src["releases"]:
                normalized = f"{r['artist'].lower().strip()} - {r['title'].lower().strip()}"
                source_sets[key].add(normalized)

    overlaps = {}
    source_names = list(source_sets.keys())
    for i, name_a in enumerate(source_names):
        for name_b in source_names[i + 1:]:
            common = source_sets[name_a] & source_sets[name_b]
            overlaps[f"{name_a} & {name_b}"] = {
                "count": len(common),
                "examples": sorted(list(common))[:15],
            }

    # All three
    if len(source_sets) == 3:
        all_common = set.intersection(*source_sets.values())
        overlaps["ALL THREE"] = {
            "count": len(all_common),
            "examples": sorted(list(all_common))[:15],
        }

    return overlaps


# =============================================================================
# REPORT
# =============================================================================

def generate_report(data_dir, today, lb_data, dz_data, sp_data):
    """Generate the final comparison report."""

    lb_stats = analyze_source(lb_data)
    dz_stats = analyze_source(dz_data)
    sp_stats = analyze_source(sp_data)

    sources = [s for s in [lb_data, dz_data, sp_data] if s]
    overlaps = find_overlap(sources)

    lines = []
    lines.append("=" * 72)
    lines.append("  NEW RELEASES SOURCE COMPARISON REPORT")
    lines.append(f"  Generated: {today}")
    lines.append("=" * 72)
    lines.append("")

    # --- Per-source summary ---
    for src_data, stats, label in [
        (lb_data, lb_stats, "LISTENBRAINZ"),
        (dz_data, dz_stats, "DEEZER"),
        (sp_data, sp_stats, "SPOTIFY"),
    ]:
        lines.append(f"{'─' * 72}")
        lines.append(f"  {label}")
        lines.append(f"{'─' * 72}")

        if not src_data or not stats:
            lines.append("  [NO DATA - Source was not fetched]")
            lines.append("")
            continue

        lines.append(f"  Endpoint:       {src_data['endpoint']}")
        lines.append(f"  Auth Required:  {'Yes' if src_data['auth_required'] else 'No'}")
        lines.append(f"  Rate Limiting:  {src_data['rate_limit']}")
        lines.append(f"  Total Releases: {stats['total_releases']}")
        lines.append(f"  Clean Albums:   {stats['clean_albums']} (no compilations/live/remixes)")
        lines.append(f"  Unique Artists: {stats['unique_artists']}")
        lines.append(f"  Date Range:     {stats['date_range'][0]} to {stats['date_range'][1]}")
        lines.append(f"  Cover Art:      {stats['cover_art_pct']}% have artwork")
        lines.append(f"  Genre Tags:     {stats['tags_pct']}% have tags")
        lines.append("")

        lines.append("  Type Breakdown:")
        for t, c in sorted(stats["type_breakdown"].items(), key=lambda x: -x[1]):
            lines.append(f"    {t:<20} {c:>5}")

        if stats["secondary_types"]:
            lines.append("")
            lines.append("  Secondary Types (reissues, compilations, etc.):")
            for t, c in sorted(stats["secondary_types"].items(), key=lambda x: -x[1]):
                lines.append(f"    {t:<20} {c:>5}")

        if stats["date_precision"].get("year") or stats["date_precision"].get("month"):
            lines.append("")
            lines.append("  Date Precision:")
            for p, c in stats["date_precision"].items():
                lines.append(f"    {p:<20} {c:>5}")

        lines.append("")

        # Show first 20 clean albums
        clean = [
            r for r in src_data["releases"]
            if r["primary_type"] in ("Album", "album")
            and not r["secondary_type"]
        ]
        clean.sort(key=lambda x: x.get("release_date", ""), reverse=True)

        lines.append(f"  Sample Clean Albums (newest first, up to 20):")
        for r in clean[:20]:
            date = r["release_date"] or "????"
            artist = r["artist"][:35]
            title = r["title"][:40]
            art = "Y" if r["has_cover_art"] else "N"
            lines.append(f"    {date}  {artist:<35}  {title:<40}  art:{art}")
        lines.append("")

    # --- OVERLAP ANALYSIS ---
    lines.append(f"{'─' * 72}")
    lines.append("  OVERLAP ANALYSIS")
    lines.append(f"{'─' * 72}")
    lines.append("")

    for pair, data in overlaps.items():
        lines.append(f"  {pair}: {data['count']} matching releases")
        if data["examples"]:
            for ex in data["examples"][:10]:
                lines.append(f"    - {ex}")
        lines.append("")

    # --- FIELD COMPARISON ---
    lines.append(f"{'─' * 72}")
    lines.append("  FIELD-BY-FIELD COMPARISON")
    lines.append(f"{'─' * 72}")
    lines.append("")

    fields = [
        ("Album Title",            "Y", "Y", "Y"),
        ("Artist Name",            "Y", "Y", "Y"),
        ("Release Date",           "Y (accurate, from MB)", "Y (digital dist. date)", "Y (unreliable for reissues)"),
        ("Release Date Precision", "Always day", "Always day", "year/month/day varies"),
        ("Primary Type",           "Y (Album/Single/EP/Other/Broadcast)", "Y (album only in editorial)", "Y (album/single/compilation)"),
        ("Secondary Type",         "Y (Compilation/Live/Remix/Soundtrack/etc)", "N", "N"),
        ("Genre Tags",             "Y (MusicBrainz community tags)", "Y (via full album lookup)", "Only on artist object"),
        ("Cover Art",              "Y (Cover Art Archive ID)", "Y (multiple sizes)", "Y (multiple sizes)"),
        ("MusicBrainz IDs",        "Y (release + release_group + artist MBIDs)", "N", "N"),
        ("Spotify/Deezer IDs",     "N", "Y (Deezer ID)", "Y (Spotify ID)"),
        ("UPC/Barcode",            "N (available via MB API)", "Y (via full album lookup)", "N"),
        ("Label",                  "N (available via MB API)", "Y (via full album lookup)", "N"),
        ("Track Count",            "N", "Y", "Y"),
        ("Duration",               "N", "Y (total seconds)", "N"),
        ("Popularity/Fans",        "N", "Y (fans count)", "Y (artist popularity 0-100)"),
        ("Follower Count",         "N", "N", "Y (via artist lookup)"),
        ("Explicit Flag",          "N", "Y", "N"),
        ("Auth Required",          "No", "No", "Yes (OAuth)"),
        ("Curated/Filtered",       "No (all MB releases)", "Yes (Deezer editorial team)", "No (search results)"),
        ("Reissue Detection",      "Y (secondary_type field)", "Implicit (editorial filters)", "N (major blind spot)"),
        ("Max Results",            "3370+ in 14 days", "200 (hard cap)", "~150 (3 pages x 50)"),
    ]

    # Print as aligned list (not table, per formatting rules)
    for field_info in fields:
        name = field_info[0]
        lines.append(f"  {name}:")
        lines.append(f"    ListenBrainz: {field_info[1]}")
        lines.append(f"    Deezer:       {field_info[2]}")
        lines.append(f"    Spotify:      {field_info[3]}")
        lines.append("")

    # --- VERDICT ---
    lines.append(f"{'─' * 72}")
    lines.append("  VERDICT & RECOMMENDATIONS")
    lines.append(f"{'─' * 72}")
    lines.append("")
    lines.append("  ListenBrainz Strengths:")
    lines.append("    + Largest dataset (3000+ releases in 14-day window)")
    lines.append("    + Accurate release dates from MusicBrainz database")
    lines.append("    + Secondary type field = instant reissue/compilation detection")
    lines.append("    + MusicBrainz IDs on everything (plugs into existing enrichment)")
    lines.append("    + No auth required, generous rate limits")
    lines.append("    + Community genre tags")
    lines.append("    - No popularity/follower filtering (need external signal)")
    lines.append("    - Cover art via Cover Art Archive (extra lookup for URLs)")
    lines.append("    - Tags coverage is spotty (depends on MB community)")
    lines.append("")
    lines.append("  Deezer Strengths:")
    lines.append("    + Editorially curated = high quality, no reissue noise")
    lines.append("    + Rich album metadata (genre, label, UPC, fans, duration)")
    lines.append("    + Multiple cover art sizes included")
    lines.append("    + No auth required")
    lines.append("    - Hard cap of 200 releases total")
    lines.append("    - Biased toward French/European market")
    lines.append("    - No secondary type field")
    lines.append("    - No MusicBrainz IDs (harder to cross-reference)")
    lines.append("")
    lines.append("  Spotify Strengths:")
    lines.append("    + Follower/popularity data for filtering")
    lines.append("    + Spotify IDs for direct linking")
    lines.append("    + Artist genre data")
    lines.append("    - Auth required (OAuth token management)")
    lines.append("    - Release dates unreliable (reissues show as 'new')")
    lines.append("    - No secondary type = can't detect compilations/live")
    lines.append("    - tag:new is noisy (Bach, reissues, etc.)")
    lines.append("    - Limited to 150 results (3 pages)")
    lines.append("")
    lines.append("  Recommended Strategy:")
    lines.append("    1. PRIMARY: ListenBrainz fresh-releases for discovery")
    lines.append("       - Filter: primary_type='Album', secondary_type=null")
    lines.append("       - Already have MBIDs for enrichment pipeline")
    lines.append("    2. ENRICHMENT: Cross-reference with Deezer for metadata")
    lines.append("       - Genre, label, UPC, fan counts")
    lines.append("    3. ENRICHMENT: Cross-reference with Spotify for popularity")
    lines.append("       - Follower counts, popularity scores")
    lines.append("    4. OPTIONAL: Deezer editorial as curated 'staff picks' feed")
    lines.append("")

    report = "\n".join(lines)

    # Print to stdout
    print(report)

    # Save to file
    report_path = os.path.join(data_dir, "comparison_report.txt")
    with open(report_path, "w") as f:
        f.write(report)

    # Also save raw stats as JSON for programmatic use
    stats_path = os.path.join(data_dir, "comparison_stats.json")
    with open(stats_path, "w") as f:
        json.dump({
            "generated": today,
            "listenbrainz": lb_stats,
            "deezer": dz_stats,
            "spotify": sp_stats,
            "overlaps": {k: {"count": v["count"]} for k, v in overlaps.items()},
        }, f, indent=2)


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 analyze-comparison.py <data_dir> <today_date>")
        sys.exit(1)

    data_dir = sys.argv[1]
    today = sys.argv[2]

    lb_data = parse_listenbrainz(data_dir)
    dz_data = parse_deezer(data_dir)
    sp_data = parse_spotify(data_dir)

    generate_report(data_dir, today, lb_data, dz_data, sp_data)
