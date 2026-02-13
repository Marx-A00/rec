# rec-music.org

## What This Is

A music discovery platform where users can share album recommendations, build collections, and explore music through social connections. The platform integrates with MusicBrainz, Discogs, and Spotify for comprehensive album metadata.

## Core Value

Help people discover music they'll love through trusted recommendations from people with similar taste.

## Current State

**Shipped:** v1.4 LlamaLog (2026-02-10)

The platform has a complete admin correction system with dual-source support (MusicBrainz/Discogs), entity lifecycle tracking via LlamaLog, and comprehensive audit trails for all album/artist/track operations.

**Tech stack:** Next.js 15, GraphQL (Apollo), Prisma, React Query, Zustand, BullMQ

## Current Milestone: v1.5 Daily Album Art Game

**Goal:** Create a daily engagement game where players guess albums from progressively revealed cover art, driving repeat visits and music discovery.

**Target features:**

- 🎨 Daily album guessing game (same album for all players each day)
- 🎨 Obscured cover art that reveals progressively with each guess
- 🎨 Two reveal styles to prototype: pixelation→tiles and blur→clear
- 🎨 Autocomplete search against local album database
- 🎨 5-6 attempts per game
- 🎨 Streak and stats tracking
- 🎨 Curated pool of classic/iconic albums

## Requirements

### Validated

- ✓ Admin can fix broken albums via correction modal — v1.0-v1.3
- ✓ Dual-source corrections (MusicBrainz + Discogs) — v1.3
- ✓ Entity lifecycle tracking via LlamaLog — v1.4
- ✓ Parent-child job relationships for audit trails — v1.2-v1.4

### Active

- [ ] Daily game displays obscured album cover
- [ ] Image reveals progressively with each wrong guess
- [ ] Pixelation/tile reveal style implemented
- [ ] Blur/clear reveal style implemented
- [ ] Players can switch between reveal styles (A/B testing)
- [ ] Autocomplete search against local album database
- [ ] 5-6 attempts max per game
- [ ] Game tracks win/loss and attempts used
- [ ] Streak tracking persists across days
- [ ] Stats display (games played, win rate, current streak, max streak)
- [ ] Same daily album for all players
- [ ] Curated album pool for game eligibility

### Out of Scope

- Social sharing of results (future enhancement)
- Leaderboards (future enhancement)
- Genre-specific game modes (future enhancement)
- Difficulty progression by day of week (future enhancement)
- Post-game album linking/collection add (future enhancement)
- Game naming and navigation placement (defer until core works)

## Context

This is a new feature direction — daily engagement mechanics to drive repeat visits. The album guessing game is the first in what could become a suite of daily challenges.

**Existing infrastructure to leverage:**

- Album database with cover art (cloudflareImageId for optimized delivery)
- AlbumImage component for image rendering
- Existing search patterns (SimpleSearchBar, autocomplete)
- User authentication for streak persistence

**New territory:**

- Image manipulation (pixelation, blur effects)
- Daily game state management
- Game-specific database models (daily challenges, player stats)

## Constraints

- **Tech Stack**: Next.js 15, GraphQL (Apollo), Prisma — follow existing patterns
- **No external API calls during gameplay**: All search against local database
- **Album pool**: Must have sufficient classic/iconic albums before launch
- **Image processing**: Client-side for reveal effects (no server load)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MusicBrainz only for v1 | It's the base data source; Discogs/Spotify can come later | ✓ Good |
| Rename EnrichmentLog → LlamaLog | Reflects broader purpose beyond just enrichment | ✓ Good |
| Prototype both reveal styles | A/B test to find what's most fun | — Pending |
| Local database search only | No API latency during gameplay | — Pending |
| Curated album pool | Avoid obscure albums that frustrate players | — Pending |

---

*Last updated: 2026-02-12 after v1.5 milestone started*
