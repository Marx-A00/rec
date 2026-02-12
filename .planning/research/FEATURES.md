# Features Research: Daily Album Art Game

**Domain:** Daily guessing game (Wordle-style)
**Researched:** 2026-02-12
**Mode:** Features landscape for daily album cover guessing game

---

## Table Stakes

Features users expect from ANY daily guessing game. Missing these makes the product feel incomplete or broken.

### Core Gameplay

**Single Daily Puzzle**
- One puzzle per day, same for all players
- Resets at consistent time (midnight UTC or local)
- Complexity: LOW
- Source: Universal across Wordle, Framed, Heardle, Gamedle

**Limited Attempts (5-6)**
- Creates tension and skill demonstration
- 6 attempts is the Wordle standard, some games use 5
- Complexity: LOW
- Source: Wordle (6), Framed (6), Heardle (6)

**Progressive Hint System**
- Each wrong guess reveals more information
- For album art: tile reveal, blur reduction, or pixelation clearing
- Complexity: MEDIUM
- Source: Framed (new image per guess), Albumle (pixelation clears), Posterdle (blur clears over time)

**Autocomplete Search**
- Type-ahead suggestions when guessing
- Essential for music (exact album titles are hard to type correctly)
- Complexity: LOW (already have this in existing platform)
- Source: Heardle, Framed, PopIdle

**Win/Lose State with Answer Reveal**
- Clear visual feedback on success/failure
- Always show correct answer when game ends
- Complexity: LOW

### Statistics & Progress

**Current Streak Counter**
- Consecutive days won
- Most emotionally important metric for retention
- Complexity: LOW
- Source: All daily games

**All-Time Statistics**
- Games played, win rate, guess distribution
- Guess distribution histogram (how many 1-guess wins, 2-guess wins, etc.)
- Complexity: LOW

**Streak Persistence**
- Stats survive browser refresh
- Local storage for anonymous, database for authenticated
- Complexity: LOW (existing auth system helps)

### Social Sharing

**Spoiler-Free Share Grid**
- Emoji/icon representation of guess pattern
- Shows performance without revealing answer
- CRITICAL for viral growth (23.5M tweets in Wordle's first months)
- Complexity: MEDIUM
- Source: Wordle's emoji grid drove entire viral phenomenon

**One-Click Copy to Clipboard**
- Frictionless sharing
- Complexity: LOW

**Puzzle Number in Share**
- "Album #47 3/6" format
- Enables comparison: "I got today's in 3!"
- Complexity: LOW

---

## Differentiators

Features that could set this album game apart from generic Wordle clones and existing album guessing games.

### Music Discovery Integration (UNIQUE TO THIS PLATFORM)

**"Discover Album" CTA After Game**
- Win or lose, link to full album details page
- Play clips, save to collection, see recommendations
- Leverages existing platform features
- Complexity: LOW (just link to existing pages)
- Differentiator: Games like PopIdle/Albumle have NO music platform integration

**"I Know This Album" Collection Link**
- Quick-add to user's collection after correct guess
- Natural engagement funnel from game to platform
- Complexity: LOW

**Artist Discovery Path**
- After game, show "More from [Artist]" 
- Link to artist page, discography
- Complexity: LOW

### Enhanced Gameplay

**Tile Reveal Mechanic (Gamedle-style)**
- Grid of tiles covering album art
- Player chooses which tiles to reveal
- Adds strategy element: "Which part gives best clues?"
- Different from blur/pixelation (feels more interactive)
- Complexity: MEDIUM

**Genre/Era Hints on Wrong Guess**
- "The album is from the 1990s"
- "The genre includes rock"
- Matches existing album metadata
- Complexity: LOW-MEDIUM

**Album Year Arrow Feedback**
- Like Gamedle: arrow UP = guess is older, arrow DOWN = guess is newer
- Helps narrow down without revealing answer
- Complexity: LOW

### Streak Protection

**Streak Freeze (One-Time Use)**
- Allow one missed day without breaking streak
- Major retention driver (Duolingo reports 2.3x engagement for 7+ day streakers)
- Could be earned (win 7 days in a row = earn a freeze)
- Complexity: MEDIUM

**Timezone-Aware Resets**
- Reset at midnight local time, not UTC
- Fairer for global users
- Complexity: MEDIUM-HIGH (requires tracking user timezone)

### Social Features

**Friends Leaderboard**
- If user has platform connections, show friend rankings
- Average guesses, current streaks
- Complexity: MEDIUM (requires friend system integration)

**Challenge a Friend**
- Share link for friend to play same puzzle
- Creates direct competition
- Complexity: LOW-MEDIUM

### Archive Mode

**Play Past Puzzles**
- Catch up on missed days
- Practice mode without affecting stats
- ~1M daily players on Framed archive
- Complexity: MEDIUM

---

## Anti-Features

Features to deliberately NOT build for v1. Common traps that waste time or harm the experience.

### Multiplayer/Real-Time

**Live Head-to-Head Mode**
- Sounds fun, massive complexity
- Requires real-time infrastructure
- Wordle's success is SOLO, not multiplayer
- Why avoid: 10x complexity for unclear benefit

**Chat/Comments on Daily Puzzle**
- Spoiler risk
- Moderation burden
- Why avoid: Social happens on external platforms via share feature

### Over-Complexity

**Multiple Game Modes at Launch**
- "Classic", "Hard Mode", "Speed Mode" etc.
- Split the user base
- Why avoid: Nail ONE mode first, expand later
- Note: Gamedle has many modes but built them over years

**Custom Puzzle Creator**
- Let users create their own puzzles
- Content moderation nightmare
- Why avoid: Focus on curated daily experience

**Hints That Cost Currency**
- Freemium hint system
- Feels punitive, against daily game ethos
- Why avoid: Wordle is free, players expect fairness

### Technical Overengineering

**Real-Time Sync Across Devices**
- Play on phone, continue on desktop
- Requires account system, sync infrastructure
- Why avoid: Most daily games are single-session

**Offline Mode**
- Complex caching of puzzle data
- Why avoid: Daily games are inherently online

**Push Notifications**
- "Come back and play today's puzzle!"
- Feels spammy for daily games
- Users know to come back, that's the point
- Why avoid: Annoying, low ROI

### Content Overreach

**Unlimited Practice Mode at Launch**
- Kills the "one puzzle per day" scarcity
- Reduces viral sharing (nothing unique to share)
- Why avoid: Save for later as archive/practice feature

**User-Generated Playlists of Puzzles**
- Like themed weeks user-created
- Content quality issues
- Why avoid: Admin curation is simpler

### Analytics Overkill

**Detailed Per-Guess Analytics**
- "What letter do users guess first?"
- Interesting but not MVP
- Why avoid: Basic win/loss metrics are enough for v1

---

## Reference Games Analysis

### Wordle (Original, Word)
- **What works:** 6 guesses, color feedback, emoji sharing, streak tracking, single daily puzzle, consistent midnight reset
- **Key insight:** Sharing drove viral growth, not gameplay complexity
- **Lesson for us:** Nail the share format early

### Framed (Movie Frames)
- **What works:** 6 frames revealed progressively, autocomplete search, archive mode, "One Frame Challenge" variant
- **Key insight:** Visual reveal system keeps engagement high
- **Lesson for us:** Tile/blur reveal is proven for visual guessing

### Heardle (Music Audio)
- **What works:** Audio clips increase 1s->2s->4s->7s->11s->16s, skip to hear more
- **Key insight:** Progressive reveal creates "aha!" moments
- **Lesson for us:** Our visual reveal needs similar pacing

### Gamedle (Video Game Covers)
- **What works:** Multiple modes (cover art, keywords, specifications), arrow feedback for release year, color-coded property matching
- **Key insight:** Metadata feedback (year arrows) helps without spoiling
- **Lesson for us:** Use album year/genre as secondary hints

### Posterdle (Movie Posters)
- **What works:** Time-based blur clearing (20 seconds), pause timer to guess
- **Key insight:** Timer adds urgency
- **Lesson for us:** Timer is optional - could add tension but also frustration

### PopIdle / Albumle (Album Covers - Direct Competitors)
- **What works:** Pixelation clears with each guess, daily challenge
- **Limitations:** No music platform integration, no streaming links, no collection features
- **Lesson for us:** Integration with existing music platform is our UNIQUE advantage

---

## Feature Priority Matrix

### Must Ship (v1 MVP)

1. Daily puzzle with consistent reset
2. 5-6 guess limit
3. Tile reveal or blur mechanic
4. Autocomplete album search
5. Win/lose with answer reveal
6. Streak counter (current + max)
7. Guess distribution stats
8. Spoiler-free share (emoji grid)
9. "Discover this album" link post-game

### Should Ship (v1.1)

1. Year arrow feedback on wrong guess
2. Genre hint system
3. Archive mode for past puzzles
4. Friends leaderboard
5. Streak freeze mechanic

### Nice to Have (v2+)

1. Hard mode (no tile reveal)
2. Themed weeks/months
3. "One Tile Challenge" variant
4. Timer mode variant
5. Mobile app with push notifications

---

## Confidence Assessment

| Finding | Confidence | Basis |
|---------|------------|-------|
| Core mechanics (guesses, streaks) | HIGH | Universal across all daily games researched |
| Share grid is critical | HIGH | Wordle viral data (23.5M tweets) well documented |
| Progressive reveal works | HIGH | Framed, Albumle, Posterdle all use variants |
| Music platform integration differentiates | HIGH | Competitors (PopIdle, Albumle) lack this entirely |
| Archive mode expected | MEDIUM | Popular on Framed, but not universal |
| Timezone handling matters | MEDIUM | User complaints documented, but UTC works fine |
| Timer mode adds value | LOW | Posterdle uses it, but may add frustration |

---

## Sources

- [Wordle Wikipedia](https://en.wikipedia.org/wiki/Wordle)
- [Tom's Guide - What is Wordle](https://www.tomsguide.com/news/what-is-wordle)
- [Framed Game](https://framedgame.io/)
- [Gamedle](https://www.gamedle.wtf/)
- [Heardle Info](https://www.heardle.info/)
- [Newsweek - How to Play Heardle](https://www.newsweek.com/play-heardle-music-guessing-game-inspired-wordle-1684823)
- [PopIdle - Album Cover Game](https://popidle.the-sound.co.uk/)
- [Albumle App](https://albumle.app/)
- [COVER'D - Album Cover Game](http://coverd.space/)
- [Posterdle Guide](https://quordle.today/games/posterdle/)
- [Trophy - Handling Timezones in Gamification](https://trophy.so/blog/handling-time-zones-gamification)
- [Medium - Streaks: The Gamification Feature](https://medium.com/design-bootcamp/streaks-the-gamification-feature-everyone-gets-wrong-6506e46fa9ca)
- [Know Your Meme - Wordle](https://knowyourmeme.com/memes/subcultures/wordle)
- [Wordle Alternative - State of Alternatives 2025](https://wordlealternative.com/state-of-wordle-alternatives-2025)
