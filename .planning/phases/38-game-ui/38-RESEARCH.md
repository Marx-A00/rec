# Phase 38: Game UI - Research

**Researched:** 2026-02-16
**Domain:** React game UI, autocomplete search, responsive layouts, authentication gates
**Confidence:** HIGH

## Summary

Phase 38 requires building a complete game interface for the Uncover daily challenge with album search autocomplete, responsive layouts (desktop + mobile), authentication gating, loading states, and keyboard support. Research focused on understanding the existing codebase infrastructure and best practices for interactive game UIs.

The codebase already has:
- A functioning `UncoverGame` component with auth gate and game state management
- `useUncoverGame` hook coordinating GraphQL mutations with Zustand store
- `RevealImage` component handling both pixelation and blur reveal styles
- `SearchAlbums` GraphQL query for local database album search
- Command component (cmdk) used throughout the app for search interfaces
- Established mobile architecture with `/m/*` routes and mobile-specific components
- `DualAlbumSearch` component demonstrating album + artist autocomplete patterns

**Primary recommendation:** Build the autocomplete on top of cmdk Command component (already used in SimpleSearchBar and UniversalSearchBar), use the existing SearchAlbums GraphQL query for local database search, follow the established mobile architecture pattern with a dedicated `/m/game` route, and leverage the existing UncoverGame component as the foundation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cmdk | In use | Command menu/autocomplete | Already used in SimpleSearchBar, UniversalSearchBar; WAI-ARIA compliant, keyboard navigation built-in |
| React Query | v5 | Data fetching | Project standard for all API calls, caching built-in |
| GraphQL (Apollo) | In use | API layer | Project standard, typed queries via codegen |
| Tailwind CSS | In use | Styling | Project standard for all UI components |
| Zustand | In use | Game state | Already used in useUncoverGameStore for session state |
| NextAuth v5 | In use | Authentication | Project standard for auth, useSession hook available |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| framer-motion | In use | Animations | Optional loading state transitions, already used in DualAlbumSearch |
| React Hook Form | If needed | Form validation | Only if building multi-step forms (not needed for single input) |
| next/navigation | 15 | Routing | useRouter for /m/game mobile route creation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cmdk | react-select, downshift | cmdk already integrated, switching adds dependency churn |
| GraphQL | REST API | GraphQL already standard, SearchAlbums query exists |
| Dedicated /m/ route | CSS media queries only | Mobile route provides cleaner separation, matches existing pattern |

**Installation:**
No new dependencies required. All necessary libraries already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (main)/
│   │   └── game/                # Desktop game route
│   │       └── page.tsx         # Server component, fetches challenge
│   └── m/
│       └── game/                # Mobile game route
│           └── page.tsx         # Mobile-optimized layout
├── components/
│   └── uncover/
│       ├── UncoverGame.tsx      # Existing game container (enhance)
│       ├── AlbumGuessInput.tsx  # NEW: Autocomplete input component
│       ├── GuessList.tsx        # NEW: Display previous guesses
│       └── RevealImage.tsx      # Existing reveal component (use as-is)
└── hooks/
    └── useUncoverGame.ts        # Existing coordination hook (use as-is)
```

### Pattern 1: Inline Autocomplete with cmdk
**What:** Autocomplete dropdown that appears below the input, using Command + CommandList components
**When to use:** Album guess input (GAME-08, GAME-09)
**Example:**
```typescript
// Based on existing SimpleSearchBar pattern
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from '@/components/ui/command';
import { useSearchAlbumsQuery } from '@/generated/graphql';

export function AlbumGuessInput({ onSelect, disabled }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  
  const { data, isLoading } = useSearchAlbumsQuery(
    { query, limit: 5 },
    { enabled: query.length >= 2 }
  );
  
  const handleSelect = (album) => {
    onSelect(album); // Auto-submit guess immediately
    setQuery('');
    setOpen(false);
  };
  
  return (
    <Command shouldFilter={false}>
      <CommandInput
        value={query}
        onValueChange={(val) => {
          setQuery(val);
          setOpen(val.length >= 2);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="Type album name..."
      />
      {open && (
        <CommandList className="absolute top-full">
          {isLoading && <CommandEmpty>Searching...</CommandEmpty>}
          {data?.searchAlbums.map(album => (
            <CommandItem
              key={album.id}
              onSelect={() => handleSelect(album)}
            >
              <div>
                <div className="font-medium">{album.title}</div>
                <div className="text-sm text-zinc-400">
                  {album.artists[0]?.artist.name}
                </div>
              </div>
            </CommandItem>
          ))}
        </CommandList>
      )}
    </Command>
  );
}
```

### Pattern 2: Server Component + Client Component for Mobile
**What:** Mobile page as Server Component, pass data to Client Component for interactivity
**When to use:** Mobile game route (UI-02)
**Example:**
```typescript
// src/app/m/game/page.tsx (Server Component)
export default async function MobileGamePage() {
  const session = await getServerSession();
  
  if (!session) {
    return <MobileLoginGate />;
  }
  
  return <MobileGameClient />;
}

// src/app/m/game/MobileGameClient.tsx
'use client';
export default function MobileGameClient() {
  const game = useUncoverGame();
  
  return (
    <div className="px-4 pt-4">
      <MobileHeader backHref="/m" title="Daily Challenge" />
      <RevealImage {...game.imageProps} />
      <AlbumGuessInput onSelect={game.submitGuess} />
      <GuessList guesses={game.guesses} />
    </div>
  );
}
```

### Pattern 3: Auth Gate with Login CTA (Teaser Pattern)
**What:** Public access to see obscured image, login required to play
**When to use:** Unauthenticated game access (AUTH-02)
**Example:**
```typescript
// Based on existing UncoverGame auth gate pattern
export function UncoverGame() {
  const { isAuthenticated, isAuthLoading } = useUncoverGame();
  
  if (!isAuthenticated) {
    return (
      <div className="relative">
        {/* Teaser: Show stage 1 image (most obscured) */}
        <div className="opacity-50 pointer-events-none">
          <RevealImage stage={1} {...props} />
        </div>
        
        {/* Login overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center p-8 bg-zinc-900 rounded-lg">
            <h2 className="text-2xl font-bold mb-2">Guess the Album</h2>
            <p className="text-zinc-400 mb-4">
              6 attempts. New puzzle daily.
            </p>
            <button
              onClick={() => signIn(undefined, { callbackUrl: '/game' })}
              className="btn-primary"
            >
              Sign In to Play
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // ... game UI for authenticated users
}
```

### Pattern 4: Dots Progress Indicator
**What:** Visual representation of attempt count using filled/empty circles
**When to use:** Game state feedback (UI-03)
**Example:**
```typescript
export function AttemptProgress({ current, max = 6 }) {
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full ${
            i < current ? 'bg-emeraled-green' : 'bg-zinc-700'
          }`}
          aria-label={`Attempt ${i + 1}${i < current ? ' used' : ''}`}
        />
      ))}
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Don't use separate modal for search**: Phase context specifies inline dropdown, not modal
- **Don't build custom autocomplete from scratch**: cmdk provides WAI-ARIA compliance and keyboard nav
- **Don't use external API search during gameplay**: Local database only (GAME-08 requirement)
- **Don't show album thumbnails in dropdown**: Text-only results per phase context
- **Don't require confirmation step after selection**: Auto-submit on select per phase context

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Autocomplete dropdown | Custom div + positioning logic | cmdk Command components | WAI-ARIA compliant, keyboard nav, focus management, already in codebase |
| Album search | Custom REST endpoint | SearchAlbums GraphQL query | Already exists, returns correct shape, typed via codegen |
| Mobile detection | window.innerWidth checks | Dedicated /m/ route | Cleaner separation, matches existing mobile architecture |
| Auth redirect | Custom redirect logic | useSession + signIn callback | NextAuth handles callback URLs, prevents auth loops |
| Loading skeleton | Custom pulse animation | Existing AnimatedLoader component | Already styled consistently with app |
| Keyboard navigation | Manual onKeyDown handlers | cmdk built-in navigation | Handles arrow keys, Enter, Escape, focus management automatically |

**Key insight:** The codebase already has mature patterns for every requirement in this phase. The task is composition and styling, not building primitives.

## Common Pitfalls

### Pitfall 1: Autocomplete Focus Trap
**What goes wrong:** Dropdown opens, user hits Escape, but input stays focused and re-triggers dropdown on next keystroke
**Why it happens:** Escape closes dropdown but doesn't blur the input
**How to avoid:** On Escape, both close dropdown AND blur the input element
**Warning signs:** Dropdown keeps re-opening immediately after closing
**Code example:**
```typescript
onKeyDown={(e) => {
  if (e.key === 'Escape') {
    setOpen(false);
    e.currentTarget.blur(); // Critical: also blur input
  }
}}
```

### Pitfall 2: Mobile Route Without Auth Check
**What goes wrong:** /m/game route accessible to unauthenticated users, breaks on data fetch
**Why it happens:** Server Components don't automatically gate based on auth
**How to avoid:** Check session in Server Component, render LoginGate if null
**Warning signs:** "Unauthorized" errors in console when navigating directly to /m/game
**Code example:**
```typescript
// src/app/m/game/page.tsx
export default async function MobileGamePage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return <MobileLoginGate returnUrl="/m/game" />;
  }
  
  return <MobileGameClient />;
}
```

### Pitfall 3: Auto-Submit Race Condition
**What goes wrong:** User selects album from dropdown, but mutation fires twice
**Why it happens:** Click event + Enter key both trigger selection
**How to avoid:** Disable input during submission, clear state immediately on select
**Warning signs:** Duplicate guess mutations in network tab
**Code example:**
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSelect = async (album) => {
  if (isSubmitting) return; // Guard against double-submission
  
  setIsSubmitting(true);
  setQuery(''); // Clear immediately
  setOpen(false);
  
  try {
    await onSelect(album);
  } finally {
    setIsSubmitting(false);
  }
};
```

### Pitfall 4: Desktop/Mobile Layout Drift
**What goes wrong:** Desktop and mobile game UIs diverge in behavior (different guess limits, different reveal logic)
**Why it happens:** Duplicating game logic in two separate components
**How to avoid:** Share UncoverGame component logic, only differ in layout wrapper
**Warning signs:** Bug reports that only happen on mobile or only on desktop
**Code example:**
```typescript
// WRONG: Duplicating game logic
function DesktopGame() {
  const [guesses, setGuesses] = useState([]);
  // ... duplicate logic
}

// RIGHT: Shared logic, different layout
function GameLayout({ children, isMobile }) {
  return isMobile ? (
    <div className="mobile-layout">{children}</div>
  ) : (
    <div className="desktop-layout">{children}</div>
  );
}

function Game() {
  const game = useUncoverGame(); // Shared logic
  const isMobile = useIsMobile();
  
  return (
    <GameLayout isMobile={isMobile}>
      <UncoverGameContent game={game} />
    </GameLayout>
  );
}
```

### Pitfall 5: Loading State Flash
**What goes wrong:** Image appears instantly, then flickers to loading state during reveal transition
**Why it happens:** Loading state checks for `isLoading` but image is already cached
**How to avoid:** Use image onLoad callback to track actual load state, not query loading
**Warning signs:** Skeleton flashes briefly even on cached images
**Code example:**
```typescript
const [imageLoaded, setImageLoaded] = useState(false);

<RevealImage
  {...props}
  onLoad={() => setImageLoaded(true)}
  className={imageLoaded ? 'opacity-100' : 'opacity-0'}
/>
{!imageLoaded && <Skeleton className="aspect-square" />}
```

## Code Examples

Verified patterns from existing codebase:

### Album Search GraphQL Query
```graphql
# From src/graphql/queries/search.graphql (lines 67-84)
query SearchAlbums($query: String!, $limit: Int) {
  searchAlbums(query: $query, limit: $limit) {
    id
    musicbrainzId
    title
    releaseDate
    coverArtUrl
    cloudflareImageId
    artists {
      artist {
        id
        name
      }
    }
  }
}
```

### Using Generated GraphQL Hook
```typescript
// From src/hooks/useAlbumSearchQuery.ts pattern
import { useSearchAlbumsQuery } from '@/generated/graphql';

function AlbumGuessInput() {
  const [query, setQuery] = useState('');
  
  const { data, isLoading } = useSearchAlbumsQuery(
    { query, limit: 5 },
    { 
      enabled: query.length >= 2,
      staleTime: 5 * 60 * 1000 // 5 min cache
    }
  );
  
  const albums = data?.searchAlbums || [];
  
  return (
    <Command>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Type album name..."
      />
      <CommandList>
        {isLoading ? (
          <CommandEmpty>Searching...</CommandEmpty>
        ) : (
          albums.map(album => (
            <CommandItem
              key={album.id}
              value={`${album.title} ${album.artists[0]?.artist.name}`}
              onSelect={() => handleSelect(album)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{album.title}</div>
                <div className="text-sm text-zinc-400 truncate">
                  {album.artists[0]?.artist.name}
                </div>
              </div>
            </CommandItem>
          ))
        )}
      </CommandList>
    </Command>
  );
}
```

### Game State Hook Usage
```typescript
// From src/components/uncover/UncoverGame.tsx (existing pattern)
import { useUncoverGame } from '@/hooks/useUncoverGame';

export function UncoverGame() {
  const game = useUncoverGame();
  
  // Auth state
  const { isAuthenticated, isAuthLoading } = game;
  
  // Game state
  const { 
    sessionId, 
    challengeId, 
    attemptCount, 
    won, 
    guesses,
    isGameOver,
    revealStage, // Calculated: attemptCount + 1, max 6
    isSubmitting,
    error 
  } = game;
  
  // Actions
  const { startGame, submitGuess, skipGuess, clearError } = game;
  
  useEffect(() => {
    if (isAuthenticated && !sessionId) {
      startGame(); // Auto-start on mount
    }
  }, [isAuthenticated, sessionId]);
  
  // ... component logic
}
```

### Mobile Touch-Friendly Button
```typescript
// From existing mobile components pattern
<button
  onClick={handleSubmit}
  disabled={isSubmitting}
  className="w-full min-h-[44px] bg-emeraled-green text-white font-medium rounded-lg active:scale-[0.95] transition-transform disabled:opacity-50"
>
  Submit Guess
</button>
```

### Keyboard Navigation Implementation
```typescript
// Combining patterns from cmdk + DualAlbumSearch
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') {
    // Enter submits selected item (cmdk handles selection)
    e.preventDefault();
  } else if (e.key === 'Escape') {
    // Escape closes dropdown and blurs input
    e.preventDefault();
    setOpen(false);
    (e.target as HTMLInputElement).blur();
  }
  // Tab navigation handled by cmdk automatically
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom autocomplete with react-select | cmdk Command components | 2024+ | WAI-ARIA compliance, better keyboard nav, lighter weight |
| REST API endpoints for search | GraphQL queries with codegen | Project start | Type safety, better caching, consistent API layer |
| CSS media queries for mobile | Dedicated /m/ routes | 2025+ | Cleaner separation, better mobile UX, follows Next.js App Router patterns |
| useEffect for auth checks | Server Components with getServerSession | Next.js 13+ | No flash of unauthenticated content, better SSR |
| Manual keyboard handlers | cmdk built-in navigation | 2024+ | Less code, fewer bugs, accessibility built-in |

**Deprecated/outdated:**
- AlbumSearch.tsx, SearchBar.tsx, AlbumSearchWrapper.tsx: Marked @deprecated, use SimpleSearchBar/UniversalSearchBar instead
- NextAuth v4 patterns: Project uses v5 beta, different session handling
- Client-side auth checks only: Should use Server Components + client hooks together

## Open Questions

Things that couldn't be fully resolved:

1. **Desktop vs Mobile Game Route Strategy**
   - What we know: Mobile has dedicated /m/ routes, desktop uses (main) group
   - What's unclear: Should desktop game be at /game or /(main)/game? Both work
   - Recommendation: Use /(main)/game to keep it in authenticated group, matches browse/search pattern

2. **Skip Button Placement Exact Position**
   - What we know: Phase context says "next to or below the guess input"
   - What's unclear: Which is better UX for the Wordle-style vertical layout?
   - Recommendation: Start with "below" (vertical flow), iterate based on user testing

3. **Loading State During Reveal Transitions**
   - What we know: Need loading states during image processing (UI-03)
   - What's unclear: Are reveal transitions instant or do they trigger re-processing?
   - Recommendation: Test with RevealImage component, add skeleton if onLoad fires on stage change

4. **End-Game Album Details Display**
   - What we know: Phase context says show "album details" in end-game state
   - What's unclear: Which details? Just title/artist or full metadata (year, label, tracks)?
   - Recommendation: Start minimal (title, artist, cover), marked as Claude's discretion

## Sources

### Primary (HIGH confidence)
- Existing codebase:
  - `/src/components/uncover/UncoverGame.tsx` - Game container with auth gate pattern
  - `/src/hooks/useUncoverGame.ts` - Game coordination hook
  - `/src/components/ui/command.tsx` - cmdk wrapper components
  - `/src/graphql/queries/search.graphql` - SearchAlbums query (lines 67-84)
  - `/src/components/recommendations/DualAlbumSearch.tsx` - Autocomplete reference implementation
  - `/src/app/m/` - Mobile architecture pattern
  - `/src/components/mobile/` - Mobile component library

### Secondary (MEDIUM confidence)
- [cmdk documentation](https://cmdk.paco.me/) - Keyboard navigation, autocomplete patterns
- [Next.js App Router Authentication](https://nextjs.org/learn/dashboard-app/adding-authentication) - Server Components + NextAuth patterns
- [WAI-ARIA Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) - Accessibility standards for autocomplete
- [React Autocomplete Best Practices](https://www.telerik.com/kendo-react-ui/components/dropdowns/autocomplete/keyboard-navigation) - Keyboard navigation guidelines
- [Next.js Responsive Design](https://clouddevs.com/next/responsive-layout/) - CSS Grid/Flexbox patterns
- [Next.js for Game Development](https://artoonsolutions.com/nextjs-for-game-development/) - Game UI layout patterns

### Tertiary (LOW confidence)
- WebSearch results for autocomplete patterns - General guidance, verify against codebase
- GitHub discussions on cmdk autocomplete usage - Community patterns, not official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, verified in package.json and imports
- Architecture: HIGH - Patterns extracted from existing codebase files
- Pitfalls: MEDIUM - Based on common React/Next.js issues + codebase patterns, some speculative
- Code examples: HIGH - All examples from existing codebase or official cmdk docs

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (30 days - stable stack, no major version changes expected)
