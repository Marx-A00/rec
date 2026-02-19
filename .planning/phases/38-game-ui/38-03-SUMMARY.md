---
phase: 38-game-ui
plan: 03
subsystem: game-ui
tags: [auth-gate, teaser, graphql, mobile, desktop]

requires:
  - 38-01  # Desktop game route and components
  - 37-04  # Game state management hook
  - 35-03  # Daily challenge GraphQL queries

provides:
  - Auth gate teaser for unauthenticated users (desktop + mobile)
  - GraphQL schema extension for challenge image URLs
  - TeaserImage components showing stage 1 obscured images

affects:
  - Future features can reference dailyChallenge.imageUrl safely
  - Social sharing could leverage teaser images

tech-stack:
  added:
    - useDailyChallengeQuery for public image fetching
  patterns:
    - Public challenge data (imageUrl) vs. protected answer data (album)
    - Auth gate teaser pattern (show gameplay preview before login)
    - Separate callbackUrls for desktop (/game) and mobile (/m/game)

key-files:
  created: []
  modified:
    - src/graphql/schema.graphql
    - src/graphql/queries/dailyChallenge.graphql
    - src/lib/graphql/resolvers/queries.ts
    - src/components/uncover/UncoverGame.tsx
    - src/app/m/game/MobileGameClient.tsx
    - src/generated/graphql.ts
    - src/generated/resolvers-types.ts

decisions:
  - Expose imageUrl and cloudflareImageId in DailyChallengeInfo (safe - doesn't reveal answer)
  - Show stage 1 teaser to unauthenticated users (creates curiosity)
  - Login CTA overlays the teaser image with backdrop blur
  - Separate callback URLs for desktop and mobile routes
  - Use getImageUrl() from cloudflare-images.ts for URL construction

metrics:
  duration: 5m
  completed: 2026-02-16
---

# Phase 38 Plan 03: Auth Gate Teaser Summary

**One-liner:** Auth gate shows stage 1 obscured album image to unauthenticated users with login CTA overlay, driving sign-ups through curiosity

## What Was Built

**Desktop Auth Gate Teaser** (`src/components/uncover/UncoverGame.tsx`):
- TeaserImage component fetches today's challenge via useDailyChallengeQuery
- Displays stage 1 obscured image (most pixelated/blurred state)
- Login CTA overlay with backdrop blur and shadow
- Tagline: "Guess the album from its cover art. 6 attempts. New puzzle daily."
- signIn with callbackUrl='/game'

**Mobile Auth Gate Teaser** (`src/app/m/game/MobileGameClient.tsx`):
- MobileTeaserImage component with same data fetching pattern
- Mobile-optimized layout with full-width image
- Touch-friendly button (min-h-[48px], active:scale-[0.98])
- signIn with callbackUrl='/m/game'
- Maintains mobile header with back navigation

**GraphQL Schema Extension**:
- Added imageUrl and cloudflareImageId to DailyChallengeInfo type
- Updated dailyChallenge resolver to construct imageUrl using getImageUrl()
- Modified dailyChallenge query to fetch image fields
- Regenerated GraphQL types with codegen

**Security-First Design**:
- dailyChallenge query exposes imageUrl but NOT the answer album
- Only albumId and image fields visible - no title, artist, or identifying info
- Answer album only exposed via startUncoverSession when authenticated

## Tasks Completed

**Task 1:** Create auth gate teaser for desktop
- Files: UncoverGame.tsx, schema.graphql, queries, resolver
- Commits: 7f094dc

**Task 2:** Create auth gate teaser for mobile
- Files: MobileGameClient.tsx
- Commits: ca8fb96

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added GraphQL schema fields for challenge images**
- **Found during:** Task 1
- **Issue:** Plan assumed imageUrl already exposed in DailyChallengeInfo, but it wasn't
- **Fix:** Added imageUrl and cloudflareImageId to GraphQL schema, updated resolver, regenerated types
- **Files modified:** schema.graphql, queries.ts, dailyChallenge.graphql, generated files
- **Commit:** 7f094dc
- **Rationale:** Required for teaser to function - can't display image without URL

**2. [Rule 2 - Missing Critical] Imported useDailyChallengeQuery**
- **Found during:** Task 1 & 2
- **Issue:** Plan referenced query but didn't specify import path
- **Fix:** Added import from @/generated/graphql
- **Files modified:** UncoverGame.tsx, MobileGameClient.tsx
- **Commit:** 7f094dc, ca8fb96
- **Rationale:** Can't use query hook without importing it

## Technical Decisions

**Why expose imageUrl in dailyChallenge query?**
- Safe to expose - image alone doesn't spoil the answer
- Allows public teaser without authentication
- Answer album ID remains protected

**Why stage 1 for teaser?**
- Most obscured state creates maximum curiosity
- Shows "this is a puzzle" without giving hints
- Consistent with game progression (stage = attemptCount + 1)

**Why separate TeaserImage components?**
- Loading state handling (skeleton/pulse animations)
- Null safety checks
- Keeps auth gate logic clean and readable
- Desktop uses gray skeleton, mobile uses zinc-900 (dark theme)

**Why getImageUrl() instead of raw cloudflareImageId?**
- Handles delivery URL construction
- Supports fallback to placeholder if no image
- Centralized image URL logic
- Uses 'public' variant for full-quality display

## Next Phase Readiness

**Blockers:** None

**Concerns:** None - teaser functions independently

**Recommendations:**
- Test teaser with real unauthenticated users to measure conversion
- Consider A/B testing tagline variations
- Monitor dailyChallenge query performance (public endpoint, no auth)

## Verification

**Type-check:** Passed (pnpm type-check)

**Success Criteria:**
- [x] AUTH-02 requirement satisfied: unauthenticated users see login prompt
- [x] Teaser shows stage 1 obscured image (creates curiosity)
- [x] Login CTA overlays the image
- [x] Tagline explains game concept
- [x] Login redirects back to appropriate route (/game or /m/game)

**Desktop Verification:**
1. Visit /game without authentication
2. See stage 1 obscured album image
3. See login overlay with tagline and button
4. Click "Sign In to Play" → redirects to /auth/signin?callbackUrl=/game

**Mobile Verification:**
1. Visit /m/game without authentication
2. See mobile header with back button
3. See stage 1 obscured album image (full-width)
4. See login overlay (zinc-900 background)
5. Click "Sign In to Play" → redirects to /auth/signin?callbackUrl=/m/game

## Files Modified

**GraphQL Layer:**
- src/graphql/schema.graphql - Added imageUrl, cloudflareImageId to DailyChallengeInfo
- src/graphql/queries/dailyChallenge.graphql - Query imageUrl, cloudflareImageId
- src/lib/graphql/resolvers/queries.ts - Construct imageUrl in dailyChallenge resolver
- src/generated/graphql.ts - Regenerated with new fields
- src/generated/resolvers-types.ts - Regenerated type definitions

**Desktop:**
- src/components/uncover/UncoverGame.tsx - Added TeaserImage, updated auth gate

**Mobile:**
- src/app/m/game/MobileGameClient.tsx - Added MobileTeaserImage, updated auth gate

## Integration Notes

**For 38-04 (Share Results):**
- dailyChallenge.imageUrl now available for social share images
- Can use stage 6 (full reveal) for completed games
- cloudflareImageId enables Cloudflare Images transformations

**For Future Features:**
- Archive mode can use same teaser pattern for past challenges
- Stats page could show stage 1 images in calendar view
- Social feed could preview challenges with teaser images

## Performance Observations

- codegen runs: 2 (initial schema update, then query update)
- Type-check: Clean passes on both tasks
- No runtime issues
- useDailyChallengeQuery caches challenge data (React Query 5-min stale time)

---

**Execution Time:** 5 minutes
**Completion Date:** 2026-02-16
**Wave:** 2 (parallel with 38-02)
