# Stack Research: Daily Album Art Game

**Project:** rec - Daily Album Art Guessing Game Feature
**Researched:** 2026-02-12
**Mode:** Ecosystem (stack additions for new feature)

## Executive Summary

The daily album art guessing game requires **client-side image manipulation** for pixelation/blur effects and **persistent game state** for daily challenges and streaks. The existing stack already provides most infrastructure needed. Only minimal additions are required.

**Key Decision:** Use **native Canvas API + CSS filters** instead of adding a library like Konva. The pixelation and blur effects needed are simple enough that adding a 50KB+ library is unnecessary overhead.

---

## Recommended Stack Additions

### Image Manipulation: NO NEW LIBRARIES NEEDED

**Recommendation:** Native Canvas API for pixelation, CSS `filter: blur()` for blur effects.

**Rationale:**
- The game needs only two effects: pixelation and blur
- Canvas API handles pixelation natively via `drawImage()` with scaling + `imageSmoothingEnabled: false`
- CSS `filter: blur(Xpx)` is hardware-accelerated and trivially simple
- Konva.js (50KB+ gzipped) would be overkill for these two effects
- No dependency maintenance, no version conflicts

### Game State Persistence: USE EXISTING ZUSTAND

**Recommendation:** Continue using Zustand with `persist` middleware (already in use).

**Already in package.json:** `"zustand": "^5.0.8"`

**Rationale:**
- Project already uses Zustand persist pattern in multiple stores
- localStorage persistence matches Wordle-style daily game pattern
- Existing code patterns in `useSearchStore.ts`, `useTourStore.ts` provide templates
- No new dependencies needed

### Daily Challenge Seed: Date-Based Deterministic Selection

**Recommendation:** Use `Date` + simple hash for daily album selection (no library needed).

**Rationale:**
- Daily games like Wordle use client-side date-based word selection
- Simple formula: `albumIndex = hash(dateString) % totalAlbums`
- Can use existing database album pool
- No need for server-side scheduling for MVP

---

## Image Manipulation Approach

### Approach A: CSS Blur (Recommended for Blur Style)

**Implementation:**
```tsx
// Simple CSS filter approach
<div 
  className="transition-all duration-500"
  style={{ filter: `blur(${20 - revealLevel * 4}px)` }}
>
  <AlbumImage src={album.coverUrl} cloudflareImageId={album.cloudflareImageId} />
</div>
```

**Pros:**
- Hardware accelerated in modern browsers
- Trivial implementation
- Smooth CSS transitions built-in
- Works directly with existing AlbumImage component

**Cons:**
- Not "pixelation" - different visual style
- Heavy blur (20px+) on large images can cause performance issues on mobile
- Users can inspect element and remove filter (not a real security concern for a game)

### Approach B: Canvas Pixelation (Recommended for Pixelate Style)

**Implementation:**
```tsx
// Canvas downscale + upscale for pixelation
const pixelateImage = (img: HTMLImageElement, pixelSize: number): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // Set final size
  canvas.width = img.width;
  canvas.height = img.height;
  
  // Disable smoothing for crisp pixels
  ctx.imageSmoothingEnabled = false;
  
  // Draw at tiny size
  const smallWidth = Math.max(1, Math.floor(img.width / pixelSize));
  const smallHeight = Math.max(1, Math.floor(img.height / pixelSize));
  ctx.drawImage(img, 0, 0, smallWidth, smallHeight);
  
  // Scale back up with no smoothing = pixelated
  ctx.drawImage(canvas, 0, 0, smallWidth, smallHeight, 0, 0, img.width, img.height);
  
  return canvas.toDataURL();
};
```

**Pros:**
- True pixelation effect (matches classic guessing games)
- Full control over pixel block size
- One-time computation, result is static image

**Cons:**
- Requires CORS handling for external images
- Slightly more complex implementation

### CORS Considerations for Canvas

**Critical:** Canvas `drawImage()` with external images requires CORS headers. If the image server doesn't send `Access-Control-Allow-Origin`, the canvas becomes "tainted" and `toDataURL()` throws a security error.

**Cloudflare Images:** Already configured with proper CORS headers for this domain. Verify by checking network response headers for `Access-Control-Allow-Origin: *` or specific domain.

**Fallback:** If CORS fails, use CSS blur approach which doesn't have this limitation.

### Recommendation

**Prototype both approaches:**
1. **CSS Blur** for "blur-to-clear" reveal style - simpler, guaranteed to work
2. **Canvas Pixelation** for "pixelate-to-tile-reveal" style - better visual effect

The game design document mentions prototyping both. Start with CSS blur (easier), add Canvas pixelation if blur feels too easy to "see through."

---

## Integration Points

### Cloudflare Images

**Current:** AlbumImage component already handles Cloudflare image URLs with `cloudflareImageId`.

**For Game:**
- Cloudflare blur parameter (`?blur=250`) exists but is NOT recommended
  - Users can modify URL to remove blur
  - Maximum blur (250) may not be sufficient for game
- Use client-side effects instead for game integrity

**Cloudflare does NOT have pixelation parameter** - must be client-side.

### AlbumImage Component

**Current implementation path:** `src/components/ui/AlbumImage.tsx`

**Integration approach:**
- Create new `ObscuredAlbumImage` wrapper component
- Accepts `revealLevel` (0-5) and `style` ('blur' | 'pixelate')
- Wraps existing AlbumImage with effect layer
- Preserves all AlbumImage props (cloudflareImageId, fallback, etc.)

### Zustand Persist Pattern

**Existing pattern in codebase:**
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useDailyGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // state and actions
    }),
    {
      name: 'daily-album-game',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        currentStreak: state.currentStreak,
        maxStreak: state.maxStreak,
        lastPlayedDate: state.lastPlayedDate,
        todayGuesses: state.todayGuesses,
        todayCompleted: state.todayCompleted,
      }),
    }
  )
);
```

**Key patterns from existing stores:**
- Use `partialize` to exclude transient state from persistence
- Use `sessionStorage` for ephemeral state, `localStorage` for persistent stats
- Factory pattern (like correction stores) NOT needed - single global game state

---

## Avoid Adding

### Konva.js / react-konva
**Why not:** Adds 50KB+ for two simple effects. Canvas API is sufficient.

### fabric.js
**Why not:** Even heavier than Konva. Designed for complex canvas editing, not simple filters.

### Server-side image processing
**Why not:** Adds latency, server cost, complexity. Client-side effects are instant.

### Cloudflare Image Transforms for blur
**Why not:** URL parameters can be stripped by users. Not suitable for game mechanics.

### Additional state management
**Why not:** Zustand already in use with persist middleware. No need for Redux, Jotai, etc.

### next-lqip-images or similar
**Why not:** These are for loading placeholders, not game mechanics. Different use case.

---

## Game State Schema (for reference)

```typescript
interface DailyGameState {
  // === Persisted to localStorage ===
  
  // Stats
  currentStreak: number;
  maxStreak: number;
  gamesPlayed: number;
  gamesWon: number;
  guessDistribution: number[]; // [wins in 1 guess, wins in 2, ..., wins in 6]
  
  // Today's game
  lastPlayedDate: string; // ISO date "2026-02-12"
  todayGameIndex: number; // Which album from the pool
  todayGuesses: string[]; // Album IDs guessed
  todayCompleted: boolean;
  todayWon: boolean;
  
  // === NOT persisted (computed/transient) ===
  revealLevel: number; // 0-5, computed from todayGuesses.length
  targetAlbum: Album | null; // Fetched based on todayGameIndex
}
```

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Canvas API for pixelation | HIGH | MDN docs, multiple verified tutorials |
| CSS filter for blur | HIGH | MDN docs, hardware acceleration confirmed |
| Zustand persist | HIGH | Already in use in this codebase |
| Cloudflare CORS | MEDIUM | Assumed configured; verify in dev |
| No library needed | HIGH | Effects are simple enough for native APIs |

---

## Sources

**Canvas API & Pixelation:**
- [MDN - Pixel manipulation with canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas)
- [IMG.LY - How to Pixelate an Image in JavaScript](https://img.ly/blog/how-to-pixelate-an-image-in-javascript/)
- [Konva.js Pixelate Filter](https://konvajs.org/docs/filters/Pixelate.html) (reference, not recommended to use)

**CSS Blur:**
- [MDN - blur() CSS function](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/filter-function/blur)
- [MDN - CSS filter effects](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Filter_effects)

**CORS & Canvas:**
- [MDN - Use cross-origin images in a canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)
- [Corsfix - Tainted Canvas](https://corsfix.com/blog/tainted-canvas)

**Cloudflare Images:**
- [Cloudflare - Transform via URL](https://developers.cloudflare.com/images/transform-images/transform-via-url/)
- [Cloudflare - Apply blur](https://developers.cloudflare.com/images/manage-images/blur-variants/)

**Zustand Persist:**
- [Zustand - Persisting store data](https://zustand.docs.pmnd.rs/integrations/persisting-store-data)
- [Zustand - persist middleware](https://zustand.docs.pmnd.rs/middlewares/persist)

**Game State Patterns:**
- [React Game Design: Recreating Wordle](https://www.rozmichelle.com/react-game-design-recreating-wordle/)
- [Wordle in React: Picking Up Where We Left Off](https://cupofcode.blog/wordle-in-react-part-2/)

**CSS image-rendering:**
- [MDN - image-rendering](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/image-rendering)
- [MDN - Crisp pixel art look](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)
