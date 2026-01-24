# Phase 6: Modal & Entry Point - Research

**Researched:** 2026-01-24
**Domain:** React modal dialogs, multi-step forms, UI patterns in Next.js 15
**Confidence:** HIGH

## Summary

Phase 6 implements the correction modal entry point and current data display (Step 1 of 3-step wizard). Research focused on Radix UI Dialog patterns, Next.js 15 client/server component architecture, multi-step wizard UX, and data quality indicator design.

The project already uses shadcn/ui (Radix UI primitives) with dialog component installed. Standard approach is to create a client component modal that displays current album data in a read-only, organized format. User decisions specify centered modal (not slide-over), extra-large width (1000px+), wrench icon entry point, collapsible sections, and session persistence for step navigation.

**Primary recommendation:** Build controlled Dialog with client state management, use shadcn accordion for collapsible sections, implement session storage for step state persistence, and create reusable data quality badge component.

## Standard Stack

The established libraries/tools for this domain:

### Core

**Library:** Radix UI Dialog (via shadcn/ui)  
**Version:** @radix-ui/react-dialog ^1.1.14  
**Purpose:** Accessible modal dialog primitive  
**Why Standard:** WAI-ARIA compliant, built-in focus trapping, keyboard navigation (Esc closes), controlled/uncontrolled modes, zero accessibility config needed

**Library:** Next.js 15 App Router  
**Version:** 15.x (current project)  
**Purpose:** Server/client component architecture  
**Why Standard:** Modal requires client-side state (useState for open/close), data fetching can be server-side, "use client" boundary at modal level

**Library:** Tailwind CSS  
**Version:** 3.x (current project)  
**Purpose:** Styling and responsive design  
**Why Standard:** Project uses shadcn/ui which is built on Tailwind, custom width overrides via className prop

**Library:** lucide-react  
**Version:** Latest (current project)  
**Purpose:** Icon library  
**Why Standard:** Configured in components.json, provides Wrench icon for entry point button

### Supporting

**Library:** shadcn/ui Accordion  
**Version:** Latest via CLI  
**Purpose:** Collapsible sections for current data  
**When to Use:** Install via `npx shadcn@latest add accordion`, use for "Basic Info", "Tracks", "External IDs" sections

**Library:** shadcn/ui Tooltip  
**Version:** Already installed  
**Purpose:** Icon hover hints and ID expansion  
**When to Use:** Entry point button ("Fix album data"), quality badge details, truncated external IDs

**Library:** shadcn/ui Badge  
**Version:** Already installed  
**Purpose:** Data quality indicator  
**When to Use:** Display quality level (Excellent/Good/Fair/Poor), clickable for detail breakdown

**Library:** sessionStorage (Web API)  
**Version:** Native browser API  
**Purpose:** Persist step state per album  
**When to Use:** Store current step index, keyed by albumId, cleared on modal close or apply

### Alternatives Considered

**Instead of:** Slide-over panel (Sheet component)  
**Could Use:** Dialog (centered modal)  
**Tradeoff:** User decision locked this choice - centered modal prioritizes comparison clarity in later phases over maintaining list context

**Instead of:** Custom collapsible components  
**Could Use:** shadcn/ui Accordion  
**Tradeoff:** Accordion is accessible by default, handles keyboard navigation, aria attributes automatic

**Instead of:** URL-synced modal state  
**Could Use:** Session-only state  
**Tradeoff:** User decision from roadmap - no URL state, no DB persistence, modal state is ephemeral

**Installation:**
```bash
# Install missing components
npx shadcn@latest add accordion

# Tooltip and Badge already installed
# Dialog already installed
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   └── admin/
│       └── music-database/
│           ├── page.tsx                        # Server component, album table
│           └── CorrectionModal.tsx             # Client component modal
├── components/
│   ├── admin/
│   │   ├── correction/
│   │   │   ├── CorrectionModal.tsx            # Main modal wrapper (3 steps)
│   │   │   ├── StepIndicator.tsx              # Linear step UI
│   │   │   ├── CurrentDataView.tsx            # Step 1: current album display
│   │   │   ├── DataQualityBadge.tsx           # Quality indicator component
│   │   │   ├── ExternalIdStatus.tsx           # External ID display
│   │   │   └── TrackListing.tsx               # Track display with collapse
│   └── ui/
│       ├── dialog.tsx                         # Already exists
│       ├── accordion.tsx                      # Add via CLI
│       ├── tooltip.tsx                        # Already exists
│       └── badge.tsx                          # Already exists
├── hooks/
│   └── useCorrectionModalState.ts             # Session storage + step navigation
└── lib/
    └── correction/
        └── session-storage.ts                 # Session persistence helpers
```

### Pattern 1: Controlled Dialog with Client State

**What:** Dialog open/close state managed by parent component, modal receives data as props  
**When to use:** Admin page manages which album is being corrected, modal is stateless regarding open/close  
**Example:**
```typescript
// Admin page (Server Component boundary)
'use client';

import { useState } from 'react';
import CorrectionModal from './CorrectionModal';

export default function MusicDatabasePage() {
  const [correctionAlbumId, setCorrectionAlbumId] = useState<string | null>(null);
  
  return (
    <>
      <Table>
        {albums.map(album => (
          <TableRow key={album.id}>
            <TableCell>
              <Button 
                size="icon" 
                variant="ghost"
                onClick={() => setCorrectionAlbumId(album.id)}
              >
                <Wrench className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </Table>
      
      <CorrectionModal
        albumId={correctionAlbumId}
        open={correctionAlbumId !== null}
        onClose={() => setCorrectionAlbumId(null)}
      />
    </>
  );
}
```

### Pattern 2: Session Storage for Step State

**What:** Persist current step per album using sessionStorage, restore on modal reopen  
**When to use:** User decision - reopening modal picks up where admin left off  
**Example:**
```typescript
// hooks/useCorrectionModalState.ts
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'correction-modal-state';

interface ModalState {
  currentStep: number;
  // Future: searchResults, selectedCandidate, etc.
}

export function useCorrectionModalState(albumId: string | null) {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Load state from session storage
  useEffect(() => {
    if (!albumId) return;
    
    const stored = sessionStorage.getItem(`${STORAGE_KEY}-${albumId}`);
    if (stored) {
      const state: ModalState = JSON.parse(stored);
      setCurrentStep(state.currentStep);
    }
  }, [albumId]);
  
  // Save state to session storage
  useEffect(() => {
    if (!albumId) return;
    
    const state: ModalState = { currentStep };
    sessionStorage.setItem(`${STORAGE_KEY}-${albumId}`, JSON.stringify(state));
  }, [albumId, currentStep]);
  
  const clearState = () => {
    if (albumId) {
      sessionStorage.removeItem(`${STORAGE_KEY}-${albumId}`);
    }
  };
  
  return { currentStep, setCurrentStep, clearState };
}
```

### Pattern 3: Extra-Large Modal Width Override

**What:** Override shadcn Dialog default max-w-lg to 1000px+ for side-by-side comparison  
**When to use:** User decision - maximum space for later preview comparison  
**Example:**
```typescript
// components/admin/correction/CorrectionModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function CorrectionModal({ albumId, open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:!max-w-[1100px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fixing: {album.title} by {album.artist}</DialogTitle>
        </DialogHeader>
        {/* ... */}
      </DialogContent>
    </Dialog>
  );
}
```

**Note:** Use `!max-w-[size]` (with Tailwind important prefix) to override DialogContent's built-in `max-w-lg` class.

### Pattern 4: Accordion for Collapsible Sections

**What:** Group album fields into collapsible sections with expand/collapse state  
**When to use:** User decision - all sections collapsible, admin controls focus  
**Example:**
```typescript
// components/admin/correction/CurrentDataView.tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function CurrentDataView({ album }) {
  // Default all sections expanded
  const [openSections, setOpenSections] = useState(['basic', 'tracks', 'external-ids']);
  
  return (
    <Accordion type="multiple" value={openSections} onValueChange={setOpenSections}>
      <AccordionItem value="basic">
        <AccordionTrigger>Basic Info</AccordionTrigger>
        <AccordionContent>
          <dl>
            <dt>Title</dt>
            <dd>{album.title}</dd>
            <dt>Release Date</dt>
            <dd>{album.releaseDate || '—'}</dd>
          </dl>
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="tracks">
        <AccordionTrigger>Tracks</AccordionTrigger>
        <AccordionContent>
          <TrackListing tracks={album.tracks} />
        </AccordionContent>
      </AccordionItem>
      
      <AccordionItem value="external-ids">
        <AccordionTrigger>External IDs</AccordionTrigger>
        <AccordionContent>
          <ExternalIdStatus album={album} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
```

### Pattern 5: Unsaved Changes Warning

**What:** Prevent modal close when admin has made changes (future phases)  
**When to use:** User decision - custom styled dialog warns of unsaved changes  
**Example:**
```typescript
// Pattern for future phases (Step 2/3)
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

const handleClose = () => {
  if (hasUnsavedChanges) {
    // Show confirmation dialog
    if (confirm('You have unsaved changes. Close anyway?')) {
      onClose();
    }
  } else {
    onClose();
  }
};

// Radix Dialog supports onOpenAutoFocus and onCloseAutoFocus
<Dialog 
  open={open} 
  onOpenChange={(isOpen) => {
    if (!isOpen) handleClose();
  }}
>
```

### Anti-Patterns to Avoid

**Server Component Modal:** Don't make the modal itself a server component - dialog state (open/close) requires client-side hooks (useState)

**Click-Outside Close:** User decision - no click-outside close, only X button and Escape key. Don't add `onPointerDownOutside` handler

**Hidden Empty Fields:** User decision - show all fields even if empty, use "—" or "Not set" for visibility. Don't conditionally render based on field presence

**Global Step State:** Don't use global state (Zustand, Redux) for step navigation - session storage is sufficient and avoids memory leaks across multiple album corrections

**Inline Editing:** Don't add inline edit controls in Step 1 - user decision is read-only display only. Manual edits happen in admin database table, not this modal

## Don't Hand-Roll

Problems that look simple but have existing solutions:

**Problem:** Modal accessibility (focus trapping, Esc key, ARIA attributes)  
**Don't Build:** Custom modal with manual focus management  
**Use Instead:** Radix UI Dialog (via shadcn/ui)  
**Why:** WCAG 2.1 Level AA compliance automatic, keyboard navigation tested, screen reader announcements built-in

**Problem:** Keyboard shortcut management  
**Don't Build:** Global keydown listener for shortcuts  
**Use Instead:** Radix Dialog's built-in Esc handling, consider react-hotkeys for future global shortcuts  
**Why:** Dialog primitives handle Esc automatically, prevents conflicts with nested components, handles cleanup

**Problem:** Collapsible sections with keyboard navigation  
**Don't Build:** Custom expand/collapse with state management  
**Use Instead:** shadcn/ui Accordion  
**Why:** ARIA roles (region, button), Space/Enter activation, focus indicators automatic

**Problem:** Session state persistence  
**Don't Build:** Custom localStorage wrapper with serialization  
**Use Instead:** Native sessionStorage with typed helpers  
**Why:** Session-only lifetime matches user requirement (no DB persistence), tab-scoped prevents cross-tab conflicts

**Problem:** Step indicator UI  
**Don't Build:** Complex stepper component with progress tracking  
**Use Instead:** Simple numbered list with active state  
**Why:** Only 3 steps, clickable navigation is simple conditional rendering, no library overhead

**Key insight:** Radix UI primitives handle 90% of modal complexity (accessibility, focus, keyboard, animations). Custom logic should focus on business logic (data display, step navigation) not UI primitives.

## Common Pitfalls

### Pitfall 1: Dialog Width Override Not Working

**What goes wrong:** Setting `className="max-w-7xl"` on DialogContent has no effect, modal stays at default 512px width  
**Why it happens:** shadcn DialogContent has built-in `max-w-lg` class that takes precedence in Tailwind cascade  
**How to avoid:** Use Tailwind's important prefix: `className="!max-w-[1100px]"` or `sm:!max-w-7xl`  
**Warning signs:** Modal appears but width doesn't change, DevTools shows `max-w-lg` overriding custom class

### Pitfall 2: Modal Re-renders Causing Data Fetch Loops

**What goes wrong:** Opening modal triggers GraphQL query, query result changes props, modal re-renders infinitely  
**Why it happens:** Parent component passes album data as prop, query refetch updates parent state, causes child re-render  
**How to avoid:** Fetch album data in modal component (not parent), use React Query's `enabled` option based on `open` prop  
**Warning signs:** Network tab shows repeated GraphQL requests, console warnings about state updates during render

### Pitfall 3: Accordion State Persists Across Modal Opens

**What goes wrong:** Admin collapses "Tracks" section, closes modal, reopens for same album - "Tracks" still collapsed  
**Why it happens:** Accordion state in useState doesn't reset when modal closes  
**How to avoid:** User decision - reset all sections to expanded on each modal open. Use `key={albumId}` on Accordion or reset state in useEffect when `open` changes  
**Warning signs:** Sections remain in previous collapse state, UX inconsistency across modal opens

### Pitfall 4: Session Storage Not Cleared on Apply

**What goes wrong:** Admin applies correction, closes modal, reopens same album - still on Step 3  
**Why it happens:** sessionStorage persists across page refreshes, not cleared after successful apply  
**How to avoid:** Call `clearState()` from hook on successful correction apply (onSuccess callback from mutation)  
**Warning signs:** Modal reopens at wrong step, stored data becomes stale after corrections

### Pitfall 5: Data Quality Enum Mismatch

**What goes wrong:** DataQuality enum is LOW/MEDIUM/HIGH but UI shows Excellent/Good/Fair/Poor  
**Why it happens:** Schema enum doesn't match user decision for 4-level badge  
**How to avoid:** Map schema enum to display labels: `{ LOW: 'Poor', MEDIUM: 'Fair', HIGH: 'Good' }`, add logic for "Excellent" (e.g., HIGH + all external IDs present)  
**Warning signs:** TypeScript errors on badge variant, undefined badge labels

### Pitfall 6: Missing Unsaved Changes Warning on Escape Key

**What goes wrong:** Admin on Step 2, presses Esc, modal closes without warning despite unsaved changes  
**Why it happens:** Radix Dialog's default behavior is close on Esc, doesn't check application state  
**How to avoid:** Use `onEscapeKeyDown` event handler, call `event.preventDefault()` if `hasUnsavedChanges`, show confirmation dialog  
**Warning signs:** Modal closes unexpectedly, admin loses work, no warning shown

## Code Examples

Verified patterns from official sources and codebase:

### Entry Point Button with Icon

```typescript
// Admin music database page - table row action
import { Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button 
        size="icon" 
        variant="ghost"
        onClick={() => openCorrectionModal(album.id)}
        className={cn(
          album.dataQuality === 'LOW' && 'text-warning hover:text-warning'
        )}
      >
        <Wrench className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Fix album data</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Data Quality Badge Component

```typescript
// components/admin/correction/DataQualityBadge.tsx
import { Badge } from '@/components/ui/badge';
import { DataQuality } from '@/generated/graphql';
import { cn } from '@/lib/utils';

interface DataQualityBadgeProps {
  quality: DataQuality;
  hasAllExternalIds: boolean;
  onClick?: () => void;
}

export default function DataQualityBadge({ 
  quality, 
  hasAllExternalIds,
  onClick 
}: DataQualityBadgeProps) {
  // Map schema enum to 4-level display
  const getLevel = () => {
    if (quality === 'HIGH' && hasAllExternalIds) return 'Excellent';
    if (quality === 'HIGH') return 'Good';
    if (quality === 'MEDIUM') return 'Fair';
    return 'Poor';
  };
  
  const level = getLevel();
  
  const variants = {
    Excellent: 'bg-emeraled-green text-white',
    Good: 'bg-maximum-yellow text-black',
    Fair: 'bg-zinc-600 text-white',
    Poor: 'bg-dark-pastel-red text-white',
  };
  
  return (
    <Badge 
      className={cn(
        'cursor-pointer',
        variants[level]
      )}
      onClick={onClick}
    >
      {level}
    </Badge>
  );
}
```

### External ID Status Display

```typescript
// components/admin/correction/ExternalIdStatus.tsx
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ExternalIdStatusProps {
  album: {
    musicbrainzId: string | null;
    spotifyId: string | null;
    discogsId: string | null;
  };
}

export default function ExternalIdStatus({ album }: ExternalIdStatusProps) {
  const ids = [
    { 
      name: 'MusicBrainz', 
      value: album.musicbrainzId,
      url: album.musicbrainzId ? `https://musicbrainz.org/release/${album.musicbrainzId}` : null,
      short: album.musicbrainzId ? album.musicbrainzId.slice(0, 8) + '...' : null
    },
    { 
      name: 'Discogs', 
      value: album.discogsId,
      url: album.discogsId ? `https://www.discogs.com/release/${album.discogsId}` : null,
      short: album.discogsId
    },
    { 
      name: 'Spotify', 
      value: album.spotifyId,
      url: album.spotifyId ? `https://open.spotify.com/album/${album.spotifyId}` : null,
      short: album.spotifyId ? album.spotifyId.slice(0, 12) + '...' : null
    },
  ];
  
  return (
    <div className="flex gap-3">
      {ids.map(id => (
        <TooltipProvider key={id.name}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                {id.value ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emeraled-green" />
                    <a 
                      href={id.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-cosmic-latte hover:underline flex items-center gap-1"
                    >
                      {id.name}: {id.short}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{id.name}</span>
                  </>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {id.value ? `Full ID: ${id.value}` : `No ${id.name} ID`}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}
```

### Track Listing with Auto-Collapse

```typescript
// components/admin/correction/TrackListing.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Track {
  trackNumber: number;
  title: string;
  durationMs: number | null;
}

interface TrackListingProps {
  tracks: Track[];
}

export default function TrackListing({ tracks }: TrackListingProps) {
  const COLLAPSE_THRESHOLD = 30;
  const [showAll, setShowAll] = useState(tracks.length < COLLAPSE_THRESHOLD);
  
  const displayTracks = showAll ? tracks : tracks.slice(0, 10);
  
  const formatDuration = (ms: number | null) => {
    if (!ms) return '—';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="space-y-2">
      <ol className="space-y-1">
        {displayTracks.map(track => (
          <li key={track.trackNumber} className="flex justify-between text-sm">
            <span>
              {track.trackNumber}. {track.title}
            </span>
            <span className="text-muted-foreground">
              {formatDuration(track.durationMs)}
            </span>
          </li>
        ))}
      </ol>
      
      {tracks.length >= COLLAPSE_THRESHOLD && (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full"
        >
          {showAll ? (
            <>Show less <ChevronUp className="ml-2 h-4 w-4" /></>
          ) : (
            <>Show all {tracks.length} tracks <ChevronDown className="ml-2 h-4 w-4" /></>
          )}
        </Button>
      )}
    </div>
  );
}
```

### Step Indicator Component

```typescript
// components/admin/correction/StepIndicator.tsx
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  currentStep: number;
  steps: string[];
  onStepClick: (step: number) => void;
}

export default function StepIndicator({ currentStep, steps, onStepClick }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center justify-between mb-6">
        {steps.map((label, index) => (
          <li key={index} className="flex items-center flex-1">
            <button
              onClick={() => onStepClick(index)}
              className={cn(
                'flex items-center gap-2 text-sm font-medium transition-colors',
                index === currentStep && 'text-cosmic-latte',
                index !== currentStep && 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span 
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                  index === currentStep && 'border-cosmic-latte bg-cosmic-latte text-black',
                  index !== currentStep && 'border-muted-foreground'
                )}
              >
                {index + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            
            {index < steps.length - 1 && (
              <div 
                className={cn(
                  'mx-2 h-0.5 flex-1 transition-colors',
                  index < currentStep ? 'bg-cosmic-latte' : 'bg-muted-foreground'
                )}
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

### Modal Footer with Step Navigation

```typescript
// components/admin/correction/CorrectionModal.tsx
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

<DialogFooter className="sticky bottom-0 bg-background border-t pt-4 mt-6">
  <div className="flex justify-between w-full">
    <Button 
      variant="outline"
      onClick={handleClose}
    >
      Cancel
    </Button>
    
    <div className="flex gap-2">
      {currentStep > 0 && (
        <Button 
          variant="outline"
          onClick={() => setCurrentStep(currentStep - 1)}
        >
          Back
        </Button>
      )}
      
      {currentStep < 2 && (
        <Button 
          variant="primary"
          onClick={() => setCurrentStep(currentStep + 1)}
        >
          Next
        </Button>
      )}
      
      {currentStep === 2 && (
        <Button 
          variant="success"
          onClick={handleApplyCorrection}
        >
          Apply Correction
        </Button>
      )}
    </div>
  </div>
</DialogFooter>
```

## State of the Art

**Old Approach:** Custom modal with manual focus management, jQuery-style show/hide  
**Current Approach:** Radix UI Dialog primitives with React state, WAI-ARIA automatic  
**When Changed:** Radix UI Primitives v1.0 (2021), shadcn/ui popularized pattern (2023)  
**Impact:** Accessibility is baseline, not extra effort. Focus management, keyboard nav, ARIA free.

**Old Approach:** localStorage for all client state persistence  
**Current Approach:** sessionStorage for ephemeral UI state, localStorage for user preferences  
**When Changed:** Best practice shift ~2020, session-scoped reduces stale data bugs  
**Impact:** Modal state doesn't pollute localStorage, tab-scoped prevents cross-tab conflicts

**Old Approach:** Stepper libraries (react-stepzilla, react-multistep v5)  
**Current Approach:** Headless patterns (react-multistep v6), custom step management  
**When Changed:** v6 rewrite (2024), headless UI trend  
**Impact:** For simple 3-step wizard, custom state management is simpler than library API

**Deprecated/outdated:**

**Click-outside close by default:** Radix Dialog supports `onPointerDownOutside` but user decision is X + Esc only. Prevents accidental closes during complex workflows.

**Global modal managers (react-modal-hook, nice-modal-react):** For admin tool with single modal type, local state is simpler. Global managers add complexity for multi-modal apps.

## Open Questions

Things that couldn't be fully resolved:

1. **Keyboard Shortcut for Modal Open**
   - What we know: User decision allows Claude to decide on keyboard shortcut implementation
   - What's unclear: Whether to implement global shortcut (e.g., Ctrl+F) or wait for user feedback on UX need
   - Recommendation: Skip for Phase 6, add in future if admins request it. Modal is already one click away, shortcut adds complexity (conflict detection, discoverability)

2. **Data Quality "Excellent" Logic**
   - What we know: Schema has 3-level enum (LOW/MEDIUM/HIGH), UI requires 4-level (Excellent/Good/Fair/Poor)
   - What's unclear: Exact criteria for "Excellent" - HIGH quality + all external IDs? Or more complex scoring?
   - Recommendation: Start with simple rule: `Excellent = HIGH && musicbrainzId && spotifyId && discogsId`. Refine in future based on admin feedback.

3. **Section Collapse State on Step Navigation**
   - What we know: User decision - sections reset to expanded on modal open
   - What's unclear: Should collapse state persist when navigating between steps (Step 1 → 2 → back to 1)?
   - Recommendation: Reset to expanded on each step change for consistency. Prevents confusion when step content changes.

## Sources

### Primary (HIGH confidence)

**Radix UI Dialog Documentation**
- [Dialog – Radix Primitives](https://www.radix-ui.com/primitives/docs/components/dialog) - API reference, accessibility features
- [Alert Dialog – Radix Primitives](https://www.radix-ui.com/primitives/docs/components/alert-dialog) - Unsaved changes pattern

**shadcn/ui Documentation**
- [How do I change Dialog Modal width?](https://github.com/shadcn-ui/ui/issues/1870) - Width override pattern with `!` prefix
- [Accordion - shadcn/ui](https://ui.shadcn.com/docs/components/accordion) - Installation and API

**Next.js Official Documentation**
- [Getting Started: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) - Client boundary pattern

**Codebase**
- `/prisma/schema.prisma` - Album model, DataQuality enum, external ID fields
- `/src/components/ui/dialog.tsx` - Existing shadcn Dialog implementation
- `/src/lib/correction/preview/types.ts` - Phase 5 correction types
- `/tailwind.config.ts` - Custom color palette (emeraled-green, cosmic-latte, etc.)

### Secondary (MEDIUM confidence)

**React Patterns**
- [React: Building a Multi-Step Form with Wizard Pattern](https://medium.com/@vandanpatel29122001/react-building-a-multi-step-form-with-wizard-pattern-85edec21f793) - Multi-step modal patterns
- [Shareable Modals in Next.js: URL-Synced UI Made Simple](https://javascript-conference.com/blog/shareable-modals-nextjs/) - Next.js modal architecture (not using URL sync but good context)

**Keyboard Shortcuts**
- [How to Design Keyboard Accessibility for Complex React Experiences](https://www.freecodecamp.org/news/designing-keyboard-accessibility-for-complex-react-experiences/) - Esc key handling, focus management

**Unsaved Changes**
- [How to Create a Custom Hook for Unsaved Changes Alerts in React](https://medium.com/@ignatovich.dm/how-to-create-a-custom-hook-for-unsaved-changes-alerts-in-react-b1441f0ae712) - useBlocker pattern
- [Communicating unsaved changes - Cloudscape Design System](https://cloudscape.design/patterns/general/unsaved-changes/) - UX best practices

### Tertiary (LOW confidence)

**Badge Design**
- [Exploring Badge UI Design: Tips, Tricks, Usability, and Use Cases](https://www.setproduct.com/blog/badge-ui-design) - General badge UX patterns (not React-specific)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Radix UI Dialog verified via package.json, shadcn/ui already configured, lucide-react confirmed
- Architecture: HIGH - Codebase patterns verified (existing Dialog usage in AlbumModal.tsx), session storage is native API
- Pitfalls: MEDIUM - Width override confirmed via GitHub issues, other pitfalls based on common React patterns not codebase-specific bugs
- Code examples: HIGH - Based on existing codebase patterns (button variants, color scheme, GraphQL types) and official Radix UI docs

**Research date:** 2026-01-24  
**Valid until:** 2026-02-24 (30 days - stable technologies, minor version changes unlikely)
