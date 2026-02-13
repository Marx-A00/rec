# Pitfalls Research: Daily Album Art Game

**Domain:** Daily guessing game with progressive image reveal  
**Researched:** 2026-02-12  
**Confidence:** HIGH (verified with multiple authoritative sources)

## Critical Pitfalls

High-impact mistakes that cause rewrites or major user experience failures.

---

### Pitfall 1: Answer Exposed in Frontend Code or Network Requests

**What goes wrong:**  
The correct album answer is sent to the client before the user guesses, allowing cheaters to find it via browser DevTools (Network tab, Sources, or Redux DevTools).

**Why it happens:**  
Developers send the full puzzle data (including the answer) to avoid additional server roundtrips for validation. This was a well-documented vulnerability in Wordle where the answer was visible in API responses and JavaScript source code.

**Consequences:**  
- Cheaters can always win by inspecting network requests
- Leaderboards become meaningless
- Community trust erodes when cheating becomes common knowledge
- Security researchers may publicly disclose the vulnerability

**Warning signs:**  
- API response contains `answer`, `correctAlbumId`, or similar fields
- Album ID or title visible in page source before guess
- Network tab shows GET request with answer in response

**Prevention:**  
1. **Server-side validation only** - Client sends guesses, server responds with correct/incorrect
2. **Hash-based verification** - Send hashed answer, verify hash matches user's guess hash
3. **Progressive reveal from server** - Each guess unlocks more image data from server, never client
4. **Avoid storing answer in Redux/Zustand state** - DevTools extensions can inspect state

**Which phase should address:** Phase 1 (Foundation) - Architecture decision before any implementation

**Sources:**
- [SiliconANGLE: API vulnerabilities in Wordle exposed answers](https://siliconangle.com/2022/12/19/api-vulnerabilities-wordle-exposed-answers-opened-door-potential-hacking/)
- [Medium: Re-Hacking Wordle](https://medium.com/@capJavert/re-hacking-wordle-114ba75d1344)

---

### Pitfall 2: Timezone Desync Causes Streak Loss

**What goes wrong:**  
Users lose streaks because the "daily" puzzle resets at different times for different users, or streak tracking uses inconsistent timezone logic between client and server.

**Why it happens:**  
- Client uses local timezone, server uses UTC
- "Midnight" reset happens at different real-world times
- localStorage streak data uses local dates, server uses UTC dates
- DST transitions cause edge cases

**Consequences:**  
- User anger: "I played every day and lost my 100-day streak!"
- Support tickets spike around DST changes
- Chess.com and other games have extensive forum complaints about this exact issue

**Warning signs:**  
- Streak logic references `new Date()` without timezone normalization
- Server and client use different date formats
- No explicit timezone documentation

**Prevention:**  
1. **Use UTC everywhere** - Both client and server calculate "today" in UTC
2. **Reset at UTC midnight** - Document and communicate: "New puzzle daily at midnight UTC (7pm EST)"
3. **Generous grace period** - Allow 25-hour window between plays to account for timezone edge cases
4. **Store timestamps, not dates** - Store ISO timestamps, calculate dates consistently

**Which phase should address:** Phase 1 (Foundation) - Core infrastructure decision

**Sources:**
- [Kisekidle: Fixed timezone streak reset bug](https://kisekidle.com/)
- [Chess.com forums: Multiple streak reset complaints](https://www.chess.com/forum/view/help-support/daily-puzzle-streak)

---

### Pitfall 3: Canvas Tainted by CORS - Image Manipulation Blocked

**What goes wrong:**  
Attempting to pixelate or blur album art fails with "SecurityError: The canvas has been tainted by cross-origin data" because the image was loaded from a different origin without proper CORS headers.

**Why it happens:**  
Album art URLs come from external services (Spotify CDN, MusicBrainz, Cover Art Archive) that may not include `Access-Control-Allow-Origin` headers, or the `crossOrigin` attribute is missing/incorrectly ordered on the image element.

**Consequences:**  
- `canvas.toDataURL()`, `canvas.getImageData()`, and pixelation effects completely fail
- Game is broken for all external album art
- Silent failure if not properly error-handled

**Warning signs:**  
- Works with local images but fails with external URLs
- Works in development (same-origin) but fails in production
- Safari/Firefox behave differently than Chrome

**Prevention:**  
1. **Use Cloudflare Images** - The codebase already has `cloudflareImageId` infrastructure; serve all game images through your own CDN
2. **Proxy external images** - Fetch through your backend API that adds proper CORS headers
3. **Attribute order matters** - `crossOrigin="anonymous"` MUST come before `src` on img elements
4. **Cache-busting for Chrome** - Add dummy query param to avoid cached non-CORS responses: `?cors=1`

**Which phase should address:** Phase 1 (Foundation) - Use existing Cloudflare Images system

**Existing codebase asset:**  
```
src/components/ui/AlbumImage.tsx - Already handles cloudflareImageId with fallbacks
src/lib/cloudflare-images.ts - Image URL generation
```

**Sources:**
- [MDN: Use cross-origin images in a canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)
- [Konva.js: Resolving Tainted Canvas](https://konvajs.org/docs/posts/Tainted_Canvas.html)
- [CORSFix: Tainted Canvas explanation](https://corsfix.com/blog/tainted-canvas)

---

## Image Manipulation Pitfalls

Canvas and CSS-specific issues for the reveal mechanic.

---

### Pitfall 4: Blur Performance Varies Wildly by Browser

**What goes wrong:**  
CSS `filter: blur()` or canvas Gaussian blur performs well in Chrome but causes severe lag in Firefox (5-10 FPS) or Safari, especially on mobile.

**Why it happens:**  
- Chrome/Safari use GPU-accelerated blur; Firefox uses software rendering (unless WebRender enabled)
- Canvas blur in Firefox is particularly slow - "order of magnitude slower than Chrome"
- Blur values < 1px cause CPU fallback even in Chrome

**Consequences:**  
- Game feels broken on Firefox/Safari
- Mobile devices overheat and drain battery
- Users blame your app, not their browser

**Warning signs:**  
- Development on Chrome feels smooth, production complaints about performance
- FPS drops during reveal animations
- Mobile users report "laggy" or "choppy" game

**Prevention:**  
1. **CSS blur for static effects** - Hardware accelerated when not animating
2. **Pre-render blur states** - Generate 6 blur levels as separate images, swap instead of calculating
3. **Avoid blur radius < 1px** - Causes CPU fallback in Chrome
4. **Test on Firefox mobile** - Worst-case scenario for performance
5. **Use pixelation instead of blur** - Much cheaper computationally

**Which phase should address:** Phase 2 (Image Reveal) - Critical path for prototype validation

**Sources:**
- [Mozilla Bug: CSS blur filter slower than Chrome](https://bugzilla.mozilla.org/show_bug.cgi?id=925025)
- [Mozilla Bug: Canvas blur inefficient](https://bugzilla.mozilla.org/show_bug.cgi?id=1498291)
- [MDN: Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)

---

### Pitfall 5: Blurry Canvas on High-DPI / Retina Displays

**What goes wrong:**  
Canvas renders pixelated or blurry on modern phones and Retina Macs because canvas pixel dimensions don't account for `devicePixelRatio`.

**Why it happens:**  
Canvas dimensions are set in CSS pixels but modern displays have 2x-3x physical pixels. Without scaling, the browser upscales the canvas bitmap, causing blur.

**Consequences:**  
- Album art looks muddy on iPhones, high-end Android devices
- "Why does your game look worse than the rest of the site?"
- Harder to recognize albums in heavily pixelated state

**Warning signs:**  
- Looks fine on low-DPI monitors, fuzzy on phones
- Canvas `width`/`height` set without `devicePixelRatio` consideration

**Prevention:**  
```javascript
const dpr = window.devicePixelRatio || 1;
canvas.width = desiredWidth * dpr;
canvas.height = desiredHeight * dpr;
canvas.style.width = `${desiredWidth}px`;
canvas.style.height = `${desiredHeight}px`;
ctx.scale(dpr, dpr);
```

**Which phase should address:** Phase 2 (Image Reveal) - Part of canvas implementation

**Sources:**
- [MDN: Window.devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio)
- [learn-canvas: Fixing Canvas Blur](https://learn-canvas.com/t/pixeldensity/)

---

### Pitfall 6: Image Not Loaded Before Canvas Draw

**What goes wrong:**  
Canvas draws empty or partial image because `drawImage()` was called before the image finished loading.

**Why it happens:**  
Image loading is asynchronous. Code like `img.src = url; ctx.drawImage(img)` fails because the image hasn't loaded yet.

**Consequences:**  
- Blank canvas on first render
- Intermittent failures based on cache state
- Race conditions that are hard to reproduce

**Warning signs:**  
- Works on refresh (cached) but fails on first load
- Works locally (fast network) but fails in production

**Prevention:**  
1. **Always use onload**:
   ```javascript
   const img = new Image();
   img.crossOrigin = 'anonymous';
   img.onload = () => ctx.drawImage(img, 0, 0);
   img.src = url;
   ```
2. **Use Image preloading** - Load images before game starts
3. **Show loading state** - Skeleton screen until image ready

**Which phase should address:** Phase 2 (Image Reveal) - Basic implementation requirement

---

## Daily Game Pitfalls

State management, cheating, and synchronization issues specific to daily games.

---

### Pitfall 7: localStorage Hydration Mismatch (Next.js SSR)

**What goes wrong:**  
React hydration error: "Text content does not match server-rendered HTML" because server renders default state while client has localStorage data.

**Why it happens:**  
Server doesn't have access to localStorage during SSR. Client hydrates with localStorage values, causing mismatch.

**Consequences:**  
- Console errors flood
- Flash of incorrect content
- Potential layout shifts

**Warning signs:**  
- "Hydration mismatch" errors in console
- Game state flickers on page load
- Zustand/Redux state different on first render

**Prevention:**  
1. **Double-render pattern** - First render uses default, useEffect updates with localStorage
2. **useSyncExternalStore** - React 18+ proper solution for external stores
3. **Zustand persist with skipHydration**:
   ```javascript
   const useStore = create(
     persist(
       (set) => ({ ... }),
       { 
         name: 'daily-game-storage',
         skipHydration: true 
       }
     )
   );
   // In component
   useEffect(() => { useStore.persist.rehydrate() }, []);
   ```
4. **Loading skeleton during hydration** - Show neutral UI until client state loaded

**Which phase should address:** Phase 3 (Game State) - Core state management architecture

**Sources:**
- [Medium: Fixing Zustand persist hydration errors](https://medium.com/@judemiracle/fixing-react-hydration-errors-when-using-zustand-persist-with-usesyncexternalstore-b6d7a40f2623)
- [Josh Comeau: Persisting React State in localStorage](https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/)

---

### Pitfall 8: Safari Clears localStorage in Embedded Contexts

**What goes wrong:**  
User's game progress and streaks disappear because Safari clears localStorage for sites embedded in iframes or with certain privacy settings.

**Why it happens:**  
Safari's Intelligent Tracking Prevention (ITP) aggressively clears storage for "non-top-level" browsing contexts. Also affects sites not visited frequently.

**Consequences:**  
- Streaks lost for Safari users (15%+ of mobile users)
- No way to recover without server-side backup

**Warning signs:**  
- Safari-specific bug reports about lost data
- Works in Chrome but not Safari

**Prevention:**  
1. **Server-side streak storage for authenticated users** - Primary source of truth
2. **Sync localStorage to server** - Backup/restore on login
3. **Don't rely solely on localStorage** - Treat as cache, not database

**Which phase should address:** Phase 3 (Game State) and Phase 4 (Streaks)

**Sources:**
- [The Daily Spell devlog: Safari localStorage issues](https://jamwitch.itch.io/the-daily-spell/devlog/1135541/thinkycon-thoughts-and-the-development-of-the-daily-spell)

---

### Pitfall 9: Deterministic RNG Breaks When Other Random Calls Happen First

**What goes wrong:**  
"Daily puzzle same for everyone" breaks because seeded RNG was polluted by other random number generation before selecting the daily album.

**Why it happens:**  
Pseudo-random number generators produce sequences. If you seed with today's date but call `random()` for other purposes first, the sequence position shifts.

**Consequences:**  
- Different users get different daily puzzles
- "My friend got a different album!" complaints
- Leaderboard/sharing becomes impossible

**Warning signs:**  
- Daily puzzle varies between page loads
- Different albums for users in different situations

**Prevention:**  
1. **Isolated RNG for daily selection**:
   ```javascript
   // Use a hash function, not Math.random()
   function getDailyAlbumIndex(date: string, albumCount: number): number {
     const hash = hashCode(date + 'salt');
     return Math.abs(hash) % albumCount;
   }
   ```
2. **Server-side daily selection** - Don't trust client RNG at all
3. **Pre-generate daily puzzles** - Schedule a week ahead, store in database

**Which phase should address:** Phase 1 (Foundation) - Core architecture decision

**Sources:**
- [Unity Discussions: Daily game seed generation](https://discussions.unity.com/t/making-a-daily-game-with-set-seed-as-well-as-random-games-players-must-play-the-daily-first-for-rng-seed-to-work-properly/347676)
- [Grid Sage Games: Working with Seeds](https://www.gridsagegames.com/blog/2017/05/working-seeds/)

---

### Pitfall 10: Autocomplete Reveals Answer

**What goes wrong:**  
Typing the first letter of the correct album shows it at the top of autocomplete suggestions, essentially revealing the answer.

**Why it happens:**  
Autocomplete rankings based on popularity, recency, or alphabetical order may consistently surface the answer.

**Consequences:**  
- Game becomes trivially easy
- Users learn to "fish" through autocomplete

**Warning signs:**  
- Correct answer appears in top 3 suggestions frequently
- Users report "guessing" correctly too often

**Prevention:**  
1. **Randomize autocomplete order** - Don't rank by relevance
2. **Require minimum characters** - 3+ characters before suggestions appear
3. **Large result pool** - Show many results so answer isn't obvious
4. **Server-side filtering** - Don't send answer until committed

**Which phase should address:** Phase 5 (Search/Guess Input)

---

## Integration Pitfalls

Issues when adding the daily game to the existing rec codebase.

---

### Pitfall 11: Image Loading Conflicts with Existing AlbumImage Component

**What goes wrong:**  
Game tries to use existing `AlbumImage` component but needs canvas access for pixelation, causing architecture conflicts.

**Why it happens:**  
`AlbumImage` is designed for display, not manipulation. It handles Cloudflare URLs, fallbacks, and error states - but doesn't expose the underlying image for canvas drawing.

**Consequences:**  
- Either duplicate image loading logic or architectural awkwardness
- Cloudflare image optimizations may conflict with canvas needs

**Warning signs:**  
- Duplicating image URL logic in game component
- Fighting `AlbumImage` to get raw image data

**Prevention:**  
1. **Create separate `GameImage` component** - Purpose-built for canvas manipulation
2. **Extract shared image URL logic** - Reuse `getImageUrl` from cloudflare-images.ts
3. **Preload original resolution** - Don't use Cloudflare resizing for canvas source

**Which phase should address:** Phase 2 (Image Reveal) - New component design

**Existing codebase asset:**  
```
src/lib/cloudflare-images.ts - Reusable URL generation
src/components/ui/AlbumImage.tsx - Reference for error handling patterns
```

---

### Pitfall 12: Mobile Layout Conflicts

**What goes wrong:**  
Daily game doesn't fit mobile navigation patterns already established in `/m/*` routes.

**Why it happens:**  
Existing mobile architecture uses server components with client component children. Game may need different patterns for canvas interaction.

**Consequences:**  
- Inconsistent mobile UX
- Navigation/header misalignment
- Touch target issues

**Warning signs:**  
- Game feels "different" from rest of mobile app
- Back navigation doesn't work as expected

**Prevention:**  
1. **Follow existing `/m/` route patterns** - Server component page, client component game
2. **Reuse `MobileHeader`** - Consistent navigation
3. **44px minimum touch targets** - Match existing mobile button standards
4. **Test on actual devices** - Emulators miss touch nuances

**Which phase should address:** Phase 2 (Image Reveal) - Early mobile consideration

**Existing codebase asset:**  
```
src/components/mobile/MobileHeader.tsx
src/components/mobile/MobileButton.tsx
```

---

### Pitfall 13: Loading States Feel Broken

**What goes wrong:**  
Users see blank screen or spinning loader while image loads, feels like the game is broken.

**Why it happens:**  
No skeleton screen or meaningful loading state. Loading spinners provide no progress indication.

**Consequences:**  
- Users think game is broken and leave
- Perceived load time feels longer than actual
- Poor first impression

**Warning signs:**  
- Spinner for > 1 second
- Blank areas during image load
- No feedback during canvas processing

**Prevention:**  
1. **Skeleton screens** - Show album card outline immediately
2. **Progressive reveal** - Show blurred/pixelated version ASAP, enhance as loaded
3. **Preload tomorrow's image** - After today's game, quietly load next
4. **Never use bare spinners for > 1 second** - Add context or progress

**Which phase should address:** Phase 2 (Image Reveal) - UX polish

**Sources:**
- [UX Design: Stop using loading spinners](https://uxdesign.cc/stop-using-a-loading-spinner-theres-something-better-d186194f771e)
- [Smashing Magazine: Skeleton screens](https://www.smashingmagazine.com/2020/04/skeleton-screens-react/)

---

## Prevention Strategy Summary

| Phase | Critical Checks |
|-------|-----------------|
| **Phase 1: Foundation** | Server-side answer validation, UTC timezone everywhere, deterministic daily selection |
| **Phase 2: Image Reveal** | CORS via Cloudflare Images, devicePixelRatio handling, blur performance testing, mobile layout |
| **Phase 3: Game State** | Zustand hydration pattern, server-side streak backup |
| **Phase 4: Streaks** | Timezone-aware streak logic, Safari localStorage fallback |
| **Phase 5: Search** | Autocomplete doesn't reveal answer |

---

## Confidence Assessment

- **Critical Pitfalls (1-3):** HIGH - Verified with official security research and MDN documentation
- **Image Manipulation (4-6):** HIGH - Verified with Mozilla bugs and MDN
- **Daily Game (7-10):** HIGH - Verified with multiple game developer accounts and React documentation
- **Integration (11-13):** MEDIUM - Based on codebase analysis, pattern matching to known issues

---

## Sources Summary

**Official Documentation:**
- [MDN: Cross-origin images in canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)
- [MDN: Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [MDN: devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio)

**Security Research:**
- [SiliconANGLE: Wordle API vulnerabilities](https://siliconangle.com/2022/12/19/api-vulnerabilities-wordle-exposed-answers-opened-door-potential-hacking/)
- [Medium: Hacking Wordle](https://medium.com/@capJavert/hacking-wordle-6889101eab73)

**Developer Experience:**
- [The Daily Spell devlog](https://jamwitch.itch.io/the-daily-spell/devlog/1135541/thinkycon-thoughts-and-the-development-of-the-daily-spell)
- [Chess.com streak issues](https://www.chess.com/forum/view/help-support/daily-puzzle-streak)
- [Wordlealternative: State of Wordle 2025](https://wordlealternative.com/state-of-wordle-alternatives-2025)

**Performance:**
- [Mozilla Bug 925025: CSS blur performance](https://bugzilla.mozilla.org/show_bug.cgi?id=925025)
- [Josh Comeau: localStorage in React](https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/)
