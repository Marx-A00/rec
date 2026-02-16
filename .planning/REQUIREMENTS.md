# Requirements: Daily Album Art Game

**Defined:** 2026-02-12
**Core Value:** Keep users coming back daily through an engaging album guessing game that drives music discovery.

## v1.5 Requirements

Requirements for the daily album art guessing game.

### Game Core

- [x] **GAME-01**: Player sees obscured album cover at game start
- [x] **GAME-02**: Player has 6 attempts to guess the album
- [x] **GAME-03**: Each wrong guess reveals more of the image
- [x] **GAME-04**: Player can skip a guess (counts as wrong guess)
- [x] **GAME-05**: Game detects win when correct album guessed
- [x] **GAME-06**: Game detects loss after 6 failed attempts
- [x] **GAME-07**: Full album cover revealed on game end (win or lose)
- [x] **GAME-08**: Player searches albums via autocomplete against local database
- [x] **GAME-09**: Search results show album name and artist
- [x] **GAME-10**: Player cannot guess the same album twice

### Image Reveal

- [x] **REVEAL-01**: Pixelation reveal style implemented (starts blocky, tiles reveal)
- [x] **REVEAL-02**: Blur reveal style implemented (starts blurry, progressively clears)
- [x] **REVEAL-03**: Player can toggle between reveal styles
- [x] **REVEAL-04**: Reveal style preference persists across sessions
- [x] **REVEAL-05**: 6 reveal stages (one per guess attempt)
- [x] **REVEAL-06**: Image processing happens client-side (no server load)

### Stats & Streaks

- [ ] **STATS-01**: Track total games played per user
- [ ] **STATS-02**: Track win count and calculate win rate
- [ ] **STATS-03**: Track current streak (consecutive days won)
- [ ] **STATS-04**: Track max streak (best ever)
- [ ] **STATS-05**: Track guess distribution (1-guess wins, 2-guess wins, etc.)
- [x] **STATS-06**: Stats persisted in database (not localStorage)
- [ ] **STATS-07**: Stats viewable after each game
- [ ] **STATS-08**: Stats synced across devices for logged-in users

### Daily Challenge

- [x] **DAILY-01**: One album selected per day (same for all players)
- [x] **DAILY-02**: Daily reset at UTC midnight
- [x] **DAILY-03**: Player cannot replay today's puzzle after completing
- [x] **DAILY-04**: Game state persists if player leaves mid-game
- [x] **DAILY-05**: Album selection is deterministic (reproducible for debugging)

### Archive Mode

- [ ] **ARCHIVE-01**: Player can access past daily puzzles
- [ ] **ARCHIVE-02**: Archive shows which days were played/missed
- [ ] **ARCHIVE-03**: Archive puzzles don't affect current streak
- [ ] **ARCHIVE-04**: Archive puzzles still track win/loss stats

### Album Pool

- [x] **POOL-01**: Curated pool of game-eligible albums
- [x] **POOL-02**: Eligibility criteria: has cover art (cloudflareImageId)
- [x] **POOL-03**: Eligibility criteria: recognizable/classic albums (manual curation or popularity threshold)
- [x] **POOL-04**: Admin can add/remove albums from game pool
- [x] **POOL-05**: Daily selection pulls only from curated pool

### Music Discovery (Post-Game)

- [ ] **DISCOVER-01**: Post-game screen shows album details
- [ ] **DISCOVER-02**: Link to full album page on rec-music.org
- [ ] **DISCOVER-03**: One-click "Add to Collection" button
- [ ] **DISCOVER-04**: Link to artist page

### Authentication

- [x] **AUTH-01**: Login required to play the game
- [x] **AUTH-02**: Unauthenticated users see login prompt
- [x] **AUTH-03**: Game state tied to user account

### UI/UX

- [x] **UI-01**: Desktop layout for game
- [x] **UI-02**: Mobile layout for game (responsive or /m/ route)
- [x] **UI-03**: Loading states for image processing
- [ ] **UI-04**: Error states (network issues, etc.)
- [x] **UI-05**: Keyboard support for guess input

## Future Requirements

Deferred to later milestones.

### Sharing

- **SHARE-01**: Spoiler-free emoji share grid
- **SHARE-02**: Copy results to clipboard
- **SHARE-03**: Share shows reveal style used

### Social

- **SOCIAL-01**: See who else recommended the daily album
- **SOCIAL-02**: Leaderboards (friends, global)
- **SOCIAL-03**: Challenge friends to beat your score

### Advanced

- **ADV-01**: Anonymous play with localStorage stats
- **ADV-02**: Merge anonymous stats on login
- **ADV-03**: Difficulty modes (easy/hard albums)
- **ADV-04**: Genre-specific game modes
- **ADV-05**: Hints system (year, genre, artist initial)

## Out of Scope

| Feature               | Reason                                      |
| --------------------- | ------------------------------------------- |
| Multiplayer/real-time | Complexity, not needed for daily game       |
| Custom puzzles        | Admin overhead, focus on curated experience |
| Paid hints/lives      | Keep it free and simple                     |
| Audio hints           | Different feature entirely                  |
| Timed mode            | Adds stress, not fun for casual play        |

## Traceability

| Requirement | Phase | Status   |
| ----------- | ----- | -------- |
| GAME-01     | 37    | Complete |
| GAME-02     | 37    | Complete |
| GAME-03     | 37    | Complete |
| GAME-04     | 37    | Complete |
| GAME-05     | 37    | Complete |
| GAME-06     | 37    | Complete |
| GAME-07     | 37    | Complete |
| GAME-08     | 38    | Complete |
| GAME-09     | 38    | Complete |
| GAME-10     | 37    | Complete |
| REVEAL-01   | 36    | Complete |
| REVEAL-02   | 36    | Complete |
| REVEAL-03   | 36    | Complete |
| REVEAL-04   | 36    | Complete |
| REVEAL-05   | 36    | Complete |
| REVEAL-06   | 36    | Complete |
| STATS-01    | 39    | Pending  |
| STATS-02    | 39    | Pending  |
| STATS-03    | 39    | Pending  |
| STATS-04    | 39    | Pending  |
| STATS-05    | 39    | Pending  |
| STATS-06    | 33    | Complete |
| STATS-07    | 39    | Pending  |
| STATS-08    | 39    | Pending  |
| DAILY-01    | 35    | Complete |
| DAILY-02    | 35    | Complete |
| DAILY-03    | 37    | Complete |
| DAILY-04    | 37    | Complete |
| DAILY-05    | 35    | Complete |
| ARCHIVE-01  | 40    | Pending  |
| ARCHIVE-02  | 40    | Pending  |
| ARCHIVE-03  | 40    | Pending  |
| ARCHIVE-04  | 40    | Pending  |
| POOL-01     | 34    | Complete |
| POOL-02     | 34    | Complete |
| POOL-03     | 34    | Complete |
| POOL-04     | 34    | Complete |
| POOL-05     | 34    | Complete |
| DISCOVER-01 | 41    | Pending  |
| DISCOVER-02 | 41    | Pending  |
| DISCOVER-03 | 41    | Pending  |
| DISCOVER-04 | 41    | Pending  |
| AUTH-01     | 37    | Complete |
| AUTH-02     | 38    | Complete |
| AUTH-03     | 33    | Complete |
| UI-01       | 38    | Complete |
| UI-02       | 38    | Complete |
| UI-03       | 38    | Complete |
| UI-04       | 42    | Pending  |
| UI-05       | 38    | Complete |

**Coverage:**

- v1.5 requirements: 47 total
- Mapped to phases: 47 (100%)
- Unmapped: 0

---

_Requirements defined: 2026-02-12_
_Last updated: 2026-02-16 after Phase 38 completion_
