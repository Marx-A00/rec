# Requirements: Daily Album Art Game

**Defined:** 2026-02-12
**Core Value:** Keep users coming back daily through an engaging album guessing game that drives music discovery.

## v1.5 Requirements

Requirements for the daily album art guessing game.

### Game Core

- [ ] **GAME-01**: Player sees obscured album cover at game start
- [ ] **GAME-02**: Player has 6 attempts to guess the album
- [ ] **GAME-03**: Each wrong guess reveals more of the image
- [ ] **GAME-04**: Player can skip a guess (counts as wrong guess)
- [ ] **GAME-05**: Game detects win when correct album guessed
- [ ] **GAME-06**: Game detects loss after 6 failed attempts
- [ ] **GAME-07**: Full album cover revealed on game end (win or lose)
- [ ] **GAME-08**: Player searches albums via autocomplete against local database
- [ ] **GAME-09**: Search results show album name and artist
- [ ] **GAME-10**: Player cannot guess the same album twice

### Image Reveal

- [ ] **REVEAL-01**: Pixelation reveal style implemented (starts blocky, tiles reveal)
- [ ] **REVEAL-02**: Blur reveal style implemented (starts blurry, progressively clears)
- [ ] **REVEAL-03**: Player can toggle between reveal styles
- [ ] **REVEAL-04**: Reveal style preference persists across sessions
- [ ] **REVEAL-05**: 6 reveal stages (one per guess attempt)
- [ ] **REVEAL-06**: Image processing happens client-side (no server load)

### Stats & Streaks

- [ ] **STATS-01**: Track total games played per user
- [ ] **STATS-02**: Track win count and calculate win rate
- [ ] **STATS-03**: Track current streak (consecutive days won)
- [ ] **STATS-04**: Track max streak (best ever)
- [ ] **STATS-05**: Track guess distribution (1-guess wins, 2-guess wins, etc.)
- [ ] **STATS-06**: Stats persisted in database (not localStorage)
- [ ] **STATS-07**: Stats viewable after each game
- [ ] **STATS-08**: Stats synced across devices for logged-in users

### Daily Challenge

- [ ] **DAILY-01**: One album selected per day (same for all players)
- [ ] **DAILY-02**: Daily reset at UTC midnight
- [ ] **DAILY-03**: Player cannot replay today's puzzle after completing
- [ ] **DAILY-04**: Game state persists if player leaves mid-game
- [ ] **DAILY-05**: Album selection is deterministic (reproducible for debugging)

### Archive Mode

- [ ] **ARCHIVE-01**: Player can access past daily puzzles
- [ ] **ARCHIVE-02**: Archive shows which days were played/missed
- [ ] **ARCHIVE-03**: Archive puzzles don't affect current streak
- [ ] **ARCHIVE-04**: Archive puzzles still track win/loss stats

### Album Pool

- [ ] **POOL-01**: Curated pool of game-eligible albums
- [ ] **POOL-02**: Eligibility criteria: has cover art (cloudflareImageId)
- [ ] **POOL-03**: Eligibility criteria: recognizable/classic albums (manual curation or popularity threshold)
- [ ] **POOL-04**: Admin can add/remove albums from game pool
- [ ] **POOL-05**: Daily selection pulls only from curated pool

### Music Discovery (Post-Game)

- [ ] **DISCOVER-01**: Post-game screen shows album details
- [ ] **DISCOVER-02**: Link to full album page on rec-music.org
- [ ] **DISCOVER-03**: One-click "Add to Collection" button
- [ ] **DISCOVER-04**: Link to artist page

### Authentication

- [ ] **AUTH-01**: Login required to play the game
- [ ] **AUTH-02**: Unauthenticated users see login prompt
- [ ] **AUTH-03**: Game state tied to user account

### UI/UX

- [ ] **UI-01**: Desktop layout for game
- [ ] **UI-02**: Mobile layout for game (responsive or /m/ route)
- [ ] **UI-03**: Loading states for image processing
- [ ] **UI-04**: Error states (network issues, etc.)
- [ ] **UI-05**: Keyboard support for guess input

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

| Feature | Reason |
|---------|--------|
| Multiplayer/real-time | Complexity, not needed for daily game |
| Custom puzzles | Admin overhead, focus on curated experience |
| Paid hints/lives | Keep it free and simple |
| Audio hints | Different feature entirely |
| Timed mode | Adds stress, not fun for casual play |

## Traceability

| Requirement | Phase | Status  |
|-------------|-------|---------|
| GAME-01     | 37    | Pending |
| GAME-02     | 37    | Pending |
| GAME-03     | 37    | Pending |
| GAME-04     | 37    | Pending |
| GAME-05     | 37    | Pending |
| GAME-06     | 37    | Pending |
| GAME-07     | 37    | Pending |
| GAME-08     | 38    | Pending |
| GAME-09     | 38    | Pending |
| GAME-10     | 37    | Pending |
| REVEAL-01   | 36    | Pending |
| REVEAL-02   | 36    | Pending |
| REVEAL-03   | 36    | Pending |
| REVEAL-04   | 36    | Pending |
| REVEAL-05   | 36    | Pending |
| REVEAL-06   | 36    | Pending |
| STATS-01    | 39    | Pending |
| STATS-02    | 39    | Pending |
| STATS-03    | 39    | Pending |
| STATS-04    | 39    | Pending |
| STATS-05    | 39    | Pending |
| STATS-06    | 33    | Pending |
| STATS-07    | 39    | Pending |
| STATS-08    | 39    | Pending |
| DAILY-01    | 35    | Pending |
| DAILY-02    | 35    | Pending |
| DAILY-03    | 37    | Pending |
| DAILY-04    | 37    | Pending |
| DAILY-05    | 35    | Pending |
| ARCHIVE-01  | 40    | Pending |
| ARCHIVE-02  | 40    | Pending |
| ARCHIVE-03  | 40    | Pending |
| ARCHIVE-04  | 40    | Pending |
| POOL-01     | 34    | Pending |
| POOL-02     | 34    | Pending |
| POOL-03     | 34    | Pending |
| POOL-04     | 34    | Pending |
| POOL-05     | 34    | Pending |
| DISCOVER-01 | 41    | Pending |
| DISCOVER-02 | 41    | Pending |
| DISCOVER-03 | 41    | Pending |
| DISCOVER-04 | 41    | Pending |
| AUTH-01     | 37    | Pending |
| AUTH-02     | 38    | Pending |
| AUTH-03     | 33    | Pending |
| UI-01       | 38    | Pending |
| UI-02       | 38    | Pending |
| UI-03       | 38    | Pending |
| UI-04       | 42    | Pending |
| UI-05       | 38    | Pending |

**Coverage:**

- v1.5 requirements: 47 total
- Mapped to phases: 47 (100%)
- Unmapped: 0

---

*Requirements defined: 2026-02-12*
*Last updated: 2026-02-12 after roadmap creation*
