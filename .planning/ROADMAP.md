# Roadmap: v1.5 Daily Album Art Game

**Milestone:** v1.5
**Created:** 2026-02-12
**Status:** Planning

## Overview

Build a daily album art guessing game that drives repeat visits and music discovery. Players see an obscured album cover that progressively reveals with each guess (pixelation or blur style). Six attempts to guess correctly. Stats and streaks persist across sessions. Archive mode for past puzzles. Post-game discovery links.

## Milestones

- **v1.0-v1.3** - Core platform, admin corrections (Phases 1-25) - SHIPPED
- **v1.4 LlamaLog** - Entity provenance & audit system (Phases 26-32) - SHIPPED 2026-02-10
- **v1.5 Daily Album Art Game** - Phases 33-42 (current)

## Phases

**Phase Numbering:**
- Integer phases (33, 34, 35...): Planned milestone work
- Decimal phases (33.1, 33.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 33: Data Foundation** - Prisma models for game state ✓
- [x] **Phase 34: Album Pool** - Curated game-eligible albums ✓
- [x] **Phase 35: Daily Challenge System** - Album selection and scheduler ✓
- [ ] **Phase 36: Image Reveal Engine** - Canvas pixelation and CSS blur
- [ ] **Phase 37: Game State & Logic** - Zustand store, guess validation
- [ ] **Phase 38: Game UI** - Desktop and mobile layouts
- [ ] **Phase 39: Stats & Streaks** - Tracking and persistence
- [ ] **Phase 40: Archive Mode** - Past puzzles access
- [ ] **Phase 41: Music Discovery** - Post-game integration
- [ ] **Phase 42: Polish** - Error states, loading, keyboard support

---

## Phase 33: Data Foundation

**Goal:** Database models exist for tracking game sessions, guesses, and player statistics.

**Depends on:** Nothing (foundation phase)

**Requirements:**
- AUTH-03: Game state tied to user account
- STATS-06: Stats persisted in database (not localStorage)

**Success Criteria:**

1. **Models exist:** `DailyChallenge`, `GameSession`, `GameGuess`, `PlayerGameStats` tables created via migration
2. **Relations correct:** GameSession links to User and DailyChallenge, GameGuess links to GameSession
3. **Prisma generates:** `pnpm prisma generate` succeeds with all game-related types

**Plans:** 1 plan

Plans:
- [x] 33-01-PLAN.md - Add Prisma models and run migration ✓

---

## Phase 34: Album Pool

**Goal:** Curated pool of game-eligible albums with admin management.

**Depends on:** Phase 33

**Requirements:**
- POOL-01: Curated pool of game-eligible albums
- POOL-02: Eligibility criteria: has cover art (cloudflareImageId)
- POOL-03: Eligibility criteria: recognizable/classic albums (manual curation or popularity threshold)
- POOL-04: Admin can add/remove albums from game pool
- POOL-05: Daily selection pulls only from curated pool

**Success Criteria:**

1. **Pool field exists:** Album model has `gameStatus` enum field (ELIGIBLE/EXCLUDED/NONE)
2. **Admin can manage:** Admin UI allows managing game eligibility for albums
3. **Eligibility enforced:** Only albums with cloudflareImageId can be marked eligible
4. **Query works:** GraphQL query returns all game-eligible albums

**Plans:** 3 plans

Plans:
- [x] 34-01-PLAN.md — Add gameStatus enum to Album model ✓
- [x] 34-02-PLAN.md — GraphQL API for game pool management ✓
- [x] 34-03-PLAN.md — Admin UI for game pool ✓

---

## Phase 35: Daily Challenge System

**Goal:** One album selected per day, same for all players, with UTC midnight reset.

**Depends on:** Phase 34 (album pool must exist)

**Requirements:**
- DAILY-01: One album selected per day (same for all players)
- DAILY-02: Daily reset at UTC midnight
- DAILY-05: Album selection is deterministic (reproducible for debugging)

**Success Criteria:**

1. **Daily challenge exists:** For any given date, system returns the same album for all users
2. **Deterministic selection:** Given the same date and pool, algorithm produces identical album choice
3. **Reset works:** After UTC midnight, new album is selected
4. **On-demand creation:** Challenge row created when first requested (no scheduler needed)

**Plans:** 3 plans

Plans:
- [x] 35-01-PLAN.md — Add CuratedChallenge Prisma model for ordered album list ✓
- [x] 35-02-PLAN.md — Selection and challenge services (deterministic date-to-album mapping) ✓
- [x] 35-03-PLAN.md — GraphQL API for daily challenge and admin curation ✓

---

## Phase 36: Image Reveal Engine

**Goal:** Client-side image processing with pixelation and blur reveal styles.

**Depends on:** Nothing (can parallelize with 34-35)

**Requirements:**
- REVEAL-01: Pixelation reveal style implemented (starts blocky, tiles reveal)
- REVEAL-02: Blur reveal style implemented (starts blurry, progressively clears)
- REVEAL-03: Player can toggle between reveal styles
- REVEAL-04: Reveal style preference persists across sessions
- REVEAL-05: 6 reveal stages (one per guess attempt)
- REVEAL-06: Image processing happens client-side (no server load)

**Success Criteria:**

1. **Pixelation works:** Image displays with configurable pixelation level (6 stages from heavily pixelated to clear)
2. **Blur works:** Image displays with configurable blur level (6 stages from heavy blur to clear)
3. **Toggle exists:** User can switch between pixelation and blur styles mid-game
4. **Preference persists:** localStorage saves reveal style preference, loads on return
5. **No server load:** All image processing via Canvas API and CSS filters (no API calls)

**Plans:** 3 plans

Plans:
- [ ] 36-01-PLAN.md — Foundation: seedrandom, reveal patterns, Zustand store
- [ ] 36-02-PLAN.md — Canvas pixelation renderer with tile-based reveal
- [ ] 36-03-PLAN.md — Blur renderer and RevealImage orchestrator with toggle

---

## Phase 37: Game State & Logic

**Goal:** Complete game logic with Zustand store and server-side validation.

**Depends on:** Phase 33 (data models), Phase 35 (daily challenge), Phase 36 (reveal engine)

**Requirements:**
- GAME-01: Player sees obscured album cover at game start
- GAME-02: Player has 6 attempts to guess the album
- GAME-03: Each wrong guess reveals more of the image
- GAME-04: Player can skip a guess (counts as wrong guess)
- GAME-05: Game detects win when correct album guessed
- GAME-06: Game detects loss after 6 failed attempts
- GAME-07: Full album cover revealed on game end (win or lose)
- GAME-10: Player cannot guess the same album twice
- DAILY-03: Player cannot replay today's puzzle after completing
- DAILY-04: Game state persists if player leaves mid-game
- AUTH-01: Login required to play the game

**Success Criteria:**

1. **Game playable:** Player can start game, make guesses, win or lose
2. **State persists:** Refreshing page mid-game restores exact state (guess count, reveal level, previous guesses)
3. **Replay blocked:** After completing daily challenge, player sees results not game
4. **Server validation:** Guess correctness validated server-side (answer not exposed to client)
5. **Skip works:** Skipping a guess advances reveal level without guessing

**Plans:** TBD

---

## Phase 38: Game UI

**Goal:** Complete game interface for desktop and mobile with search integration.

**Depends on:** Phase 37 (game logic must exist)

**Requirements:**
- GAME-08: Player searches albums via autocomplete against local database
- GAME-09: Search results show album name and artist
- AUTH-02: Unauthenticated users see login prompt
- UI-01: Desktop layout for game
- UI-02: Mobile layout for game (responsive or /m/ route)
- UI-03: Loading states for image processing
- UI-05: Keyboard support for guess input

**Success Criteria:**

1. **Search works:** Typing in guess field shows autocomplete dropdown with album + artist
2. **Responsive:** Game plays correctly on both desktop and mobile viewports
3. **Auth gate:** Unauthenticated users cannot access game, see login CTA
4. **Loading states:** Image processing shows skeleton/spinner during reveal transitions
5. **Keyboard:** Enter submits guess, Tab navigates, Escape closes dropdown

**Plans:** TBD

---

## Phase 39: Stats & Streaks

**Goal:** Complete statistics tracking with database persistence and display.

**Depends on:** Phase 37 (game logic triggers stats updates)

**Requirements:**
- STATS-01: Track total games played per user
- STATS-02: Track win count and calculate win rate
- STATS-03: Track current streak (consecutive days won)
- STATS-04: Track max streak (best ever)
- STATS-05: Track guess distribution (1-guess wins, 2-guess wins, etc.)
- STATS-07: Stats viewable after each game
- STATS-08: Stats synced across devices for logged-in users

**Success Criteria:**

1. **Stats calculated:** Win rate, current streak, max streak all correctly computed
2. **Distribution tracked:** Histogram shows 1-6 guess win counts
3. **Post-game display:** Stats modal appears after game completion
4. **Cross-device sync:** Playing on phone updates stats visible on desktop

**Plans:** TBD

---

## Phase 40: Archive Mode

**Goal:** Players can access and play past daily puzzles.

**Depends on:** Phase 37 (game logic), Phase 39 (stats tracking)

**Requirements:**
- ARCHIVE-01: Player can access past daily puzzles
- ARCHIVE-02: Archive shows which days were played/missed
- ARCHIVE-03: Archive puzzles don't affect current streak
- ARCHIVE-04: Archive puzzles still track win/loss stats

**Success Criteria:**

1. **Archive accessible:** Calendar/list view shows past challenges
2. **Status visible:** Each past day shows played/missed/won/lost status
3. **Streak protected:** Playing archive puzzle does not break or extend current streak
4. **Stats update:** Archive wins/losses increment total games played and win rate

**Plans:** TBD

---

## Phase 41: Music Discovery

**Goal:** Post-game screen drives engagement with album and artist pages.

**Depends on:** Phase 37 (game completion triggers post-game)

**Requirements:**
- DISCOVER-01: Post-game screen shows album details
- DISCOVER-02: Link to full album page on rec-music.org
- DISCOVER-03: One-click "Add to Collection" button
- DISCOVER-04: Link to artist page

**Success Criteria:**

1. **Album revealed:** Post-game shows full album art, title, artist, year
2. **Album link works:** Click navigates to album detail page
3. **Collection add:** One click adds album to user's default collection
4. **Artist link works:** Click navigates to artist page

**Plans:** TBD

---

## Phase 42: Polish

**Goal:** Error handling, edge cases, and final UX refinements.

**Depends on:** All previous phases

**Requirements:**
- UI-04: Error states (network issues, etc.)

**Success Criteria:**

1. **Network errors handled:** Offline/failed requests show user-friendly message
2. **Edge cases covered:** Empty album pool, missing cover art, concurrent sessions all handled gracefully
3. **Performance:** Image reveal transitions are smooth (no jank)
4. **Accessibility:** Game playable with keyboard only, screen reader announces key states

**Plans:** TBD

---

## Dependencies

**Phase execution order:**

```
33 (Data Foundation)
  ↓
34 (Album Pool)
  ↓
35 (Daily Challenge) ←─────────┐
  ↓                            │
36 (Image Reveal) ─────────────┤ (can parallelize with 34-35)
  ↓                            │
37 (Game State & Logic) ───────┘
  ↓
38 (Game UI)
  ↓
39 (Stats & Streaks)
  ↓
40 (Archive Mode)
  ↓
41 (Music Discovery)
  ↓
42 (Polish)
```

**Parallelization opportunities:**
- Phase 36 (Image Reveal) can run in parallel with Phases 34-35
- Phases 40 and 41 could potentially parallelize after 39

---

## Progress Tracking

| Phase | Name                      | Requirements | Status      | Completed |
|-------|---------------------------|--------------|-------------|-----------|
| 33    | Data Foundation           | 2            | Complete    | 2026-02-15 |
| 34    | Album Pool                | 5            | Complete    | 2026-02-15 |
| 35    | Daily Challenge System    | 3            | Complete    | 2026-02-16 |
| 36    | Image Reveal Engine       | 6            | Not started | -         |
| 37    | Game State & Logic        | 11           | Not started | -         |
| 38    | Game UI                   | 7            | Not started | -         |
| 39    | Stats & Streaks           | 7            | Not started | -         |
| 40    | Archive Mode              | 4            | Not started | -         |
| 41    | Music Discovery           | 4            | Not started | -         |
| 42    | Polish                    | 1            | Not started | -         |

**Total:** 10 phases, 47 requirements (100% coverage)

---

## Requirement Coverage

| Requirement | Phase | Status  | Description                              |
|-------------|-------|---------|------------------------------------------|
| GAME-01     | 37    | Pending | Player sees obscured album cover         |
| GAME-02     | 37    | Pending | Player has 6 attempts                    |
| GAME-03     | 37    | Pending | Each wrong guess reveals more            |
| GAME-04     | 37    | Pending | Player can skip a guess                  |
| GAME-05     | 37    | Pending | Game detects win                         |
| GAME-06     | 37    | Pending | Game detects loss                        |
| GAME-07     | 37    | Pending | Full cover revealed on end               |
| GAME-08     | 38    | Pending | Album search via autocomplete            |
| GAME-09     | 38    | Pending | Search shows album + artist              |
| GAME-10     | 37    | Pending | Cannot guess same album twice            |
| REVEAL-01   | 36    | Pending | Pixelation reveal style                  |
| REVEAL-02   | 36    | Pending | Blur reveal style                        |
| REVEAL-03   | 36    | Pending | Toggle between styles                    |
| REVEAL-04   | 36    | Pending | Style preference persists                |
| REVEAL-05   | 36    | Pending | 6 reveal stages                          |
| REVEAL-06   | 36    | Pending | Client-side image processing             |
| STATS-01    | 39    | Pending | Track total games played                 |
| STATS-02    | 39    | Pending | Track win count/rate                     |
| STATS-03    | 39    | Pending | Track current streak                     |
| STATS-04    | 39    | Pending | Track max streak                         |
| STATS-05    | 39    | Pending | Track guess distribution                 |
| STATS-06    | 33    | Complete | Stats persisted in database              |
| STATS-07    | 39    | Pending | Stats viewable after game                |
| STATS-08    | 39    | Pending | Stats synced across devices              |
| DAILY-01    | 35    | Complete | One album per day for all                |
| DAILY-02    | 35    | Complete | UTC midnight reset                       |
| DAILY-03    | 37    | Pending | Cannot replay today's puzzle             |
| DAILY-04    | 37    | Pending | State persists mid-game                  |
| DAILY-05    | 35    | Complete | Deterministic selection                  |
| ARCHIVE-01  | 40    | Pending | Access past puzzles                      |
| ARCHIVE-02  | 40    | Pending | Shows played/missed status               |
| ARCHIVE-03  | 40    | Pending | No streak impact                         |
| ARCHIVE-04  | 40    | Pending | Still tracks win/loss stats              |
| POOL-01     | 34    | Complete | Curated pool of eligible albums          |
| POOL-02     | 34    | Complete | Eligibility: has cover art               |
| POOL-03     | 34    | Complete | Eligibility: recognizable albums         |
| POOL-04     | 34    | Complete | Admin can manage pool                    |
| POOL-05     | 34    | Complete | Daily selection from pool only           |
| DISCOVER-01 | 41    | Pending | Post-game album details                  |
| DISCOVER-02 | 41    | Pending | Link to album page                       |
| DISCOVER-03 | 41    | Pending | Add to Collection button                 |
| DISCOVER-04 | 41    | Pending | Link to artist page                      |
| AUTH-01     | 37    | Pending | Login required to play                   |
| AUTH-02     | 38    | Pending | Unauthenticated see login prompt         |
| AUTH-03     | 33    | Complete | State tied to user account               |
| UI-01       | 38    | Pending | Desktop layout                           |
| UI-02       | 38    | Pending | Mobile layout                            |
| UI-03       | 38    | Pending | Loading states                           |
| UI-04       | 42    | Pending | Error states                             |
| UI-05       | 38    | Pending | Keyboard support                         |

**Coverage:** 47/47 requirements mapped (100%)

---

_Roadmap created: 2026-02-12_
_Last updated: 2026-02-16_
