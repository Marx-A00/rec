# Stack Research: Admin Data Correction UI

**Domain:** Admin data correction/enrichment UI for music database
**Researched:** 2026-01-23
**Overall Confidence:** HIGH

## Executive Summary

This research covers the optimal stack for building an admin data correction feature that allows fixing problematic albums/artists by searching MusicBrainz, previewing data side-by-side, and applying selective corrections. The project already has excellent foundations (fuzzysort, Radix UI, Zod, vaul drawer) that should be leveraged rather than replaced.

**Key finding:** Most required functionality can be achieved with existing dependencies plus minimal additions. The main gap is form handling for selective field updates, which React Hook Form fills perfectly.

---

## Recommended Stack

### Core Technologies (Already in Project)

**Technology:** fuzzysort ^3.1.0
- **Purpose:** Fuzzy string matching for album/artist search results ranking
- **Why Recommended:** Already installed. Fastest fuzzy search library (13k files in <1ms). Perfect for matching user's local album titles against MusicBrainz results. Simpler API than Fuse.js with excellent scoring for file/title matching.
- **Confidence:** HIGH (verified via GitHub, already in package.json)

**Technology:** @radix-ui/react-dialog ^1.1.14
- **Purpose:** Modal dialogs for correction workflows
- **Why Recommended:** Already installed. Industry-standard accessibility, focus trapping, portal rendering. Foundation for the correction modal/panel UI.
- **Confidence:** HIGH (already in project)

**Technology:** vaul ^1.1.2
- **Purpose:** Bottom sheet/drawer for mobile correction workflows
- **Why Recommended:** Already installed. Smooth gesture-based drawers that work well for mobile admin interfaces. Can be used for correction panels that slide up from bottom.
- **Confidence:** HIGH (already in project)

**Technology:** zod ^3.25.67
- **Purpose:** Schema validation for correction form data
- **Why Recommended:** Already installed. Type-safe validation with excellent TypeScript inference. Integrates seamlessly with React Hook Form via @hookform/resolvers.
- **Confidence:** HIGH (already in project)

**Technology:** allotment ^1.20.4
- **Purpose:** Resizable split panels for side-by-side comparison
- **Why Recommended:** Already installed (used in SplitMosaic.tsx). VS Code-derived codebase, industry-standard look and feel. Perfect for showing current data vs MusicBrainz data side-by-side with resizable panels.
- **Confidence:** HIGH (already in project, actively maintained)

### New Dependencies Required

**Library:** react-hook-form
- **Version:** ^7.71.1
- **Purpose:** Selective field updates, form state management
- **Why Recommended:** 
  - Uncontrolled inputs with refs = minimal re-renders (critical for forms with many fields)
  - Native `watch()` and `setValue()` for selective field updates
  - `useFieldArray` for dynamic field management
  - 8.6kb minified+gzipped, zero dependencies
  - Seamless Zod integration via @hookform/resolvers
  - Outperforms Formik significantly for partial updates (isolates re-renders to changed fields)
- **When to Use:** All correction forms where admin selects which fields to update
- **Confidence:** HIGH (verified GitHub releases, v7.71.1 released Jan 2025, React 19 compatible)

**Library:** @hookform/resolvers
- **Version:** ^3.9.1
- **Purpose:** Zod resolver for React Hook Form validation
- **Why Recommended:** Official resolver package from React Hook Form team. Bridges RHF and Zod for type-safe validation. Supports Zod v4.
- **When to Use:** Any form using React Hook Form with Zod schemas
- **Confidence:** HIGH (verified GitHub, actively maintained)

### UI Components Pattern (No New Dependencies)

**Pattern:** Custom side-by-side comparison component
- **Purpose:** Visual diff of current vs MusicBrainz data
- **Why Recommended:**
  - Dedicated diff libraries (react-diff-viewer-continued) have React 19 compatibility issues (open GitHub issue #63)
  - Project's use case is field-by-field comparison, not text diff
  - Custom component using existing Tailwind + Radix primitives is simpler and more maintainable
  - Full control over styling and behavior
- **Implementation approach:**
  - Use allotment for resizable split view
  - Custom `ComparisonField` component showing old/new values with visual indicators
  - Highlight changed fields with color coding (red=changed, green=new, gray=unchanged)
- **Confidence:** HIGH (avoids dependency with known issues, leverages existing stack)

### Panel/Modal Pattern (No New Dependencies)

**Pattern:** Radix Dialog with Sheet-style variants
- **Purpose:** Correction workflow modal/panel
- **Why Recommended:**
  - Existing @radix-ui/react-dialog supports overlay, focus trapping, portal rendering
  - Can be styled as full-screen panel or slide-over sheet with Tailwind
  - Existing vaul drawer handles mobile bottom-sheet pattern
  - No need for additional dependencies
- **Implementation approach:**
  - Desktop: Large Radix Dialog (80% viewport) with split comparison view
  - Mobile: Vaul drawer with stacked comparison (current → new)
- **Confidence:** HIGH (uses existing dependencies)

---

## Installation

```bash
# New dependencies only
pnpm add react-hook-form @hookform/resolvers

# Everything else is already installed:
# - fuzzysort (fuzzy matching)
# - @radix-ui/react-dialog (modals)
# - vaul (drawers)
# - allotment (split panels)
# - zod (validation)
# - lucide-react (icons)
```

---

## Alternatives Considered

**Recommended:** react-hook-form
- **Alternative:** Formik
- **When to Use Alternative:** Large enterprise teams valuing explicit APIs over performance. Not recommended here because RHF's isolated re-renders are critical for a form with many selectable fields.

**Recommended:** fuzzysort (keep existing)
- **Alternative:** Fuse.js
- **When to Use Alternative:** Need weighted multi-field search with complex scoring. Not needed here - fuzzysort's simpler API and better performance for title matching is sufficient.

**Recommended:** Custom comparison component
- **Alternative:** react-diff-viewer-continued
- **When to Use Alternative:** Need line-by-line text diff (like code review). Not suitable here because: (1) React 19 compatibility issues, (2) field-by-field comparison is the actual need, not text diff.

**Recommended:** allotment (keep existing)
- **Alternative:** react-resizable-panels (also in project)
- **When to Use Alternative:** Either works. allotment is already used in SplitMosaic.tsx, prefer consistency.

**Recommended:** Radix Dialog + custom sheet styling
- **Alternative:** @radix-ui/react-sheet (shadcn pattern)
- **When to Use Alternative:** Need official sheet component. However, Dialog + Tailwind animation achieves same result without new dependency.

---

## What NOT to Use

**Avoid:** react-diff-viewer or react-diff-viewer-continued
- **Why:** React 19 peer dependency not yet supported (GitHub issue #63 open since Feb 2025). Overkill for field comparison - designed for text/code diff, not structured data comparison.
- **Use Instead:** Custom `ComparisonField` component with Tailwind styling

**Avoid:** Formik
- **Why:** Re-renders entire form on any field change. Performance degrades with many fields. Larger bundle (44kb vs 8.6kb). Project already uses Zod which integrates better with RHF.
- **Use Instead:** react-hook-form with @hookform/resolvers/zod

**Avoid:** Fuse.js (for this use case)
- **Why:** Already have fuzzysort installed. Fuse.js is slower and more complex for simple title matching. Its advantages (weighted fields, extended search) aren't needed here.
- **Use Instead:** Keep using fuzzysort ^3.1.0

**Avoid:** Adding new modal/drawer libraries
- **Why:** Project already has @radix-ui/react-dialog and vaul. Adding another modal library creates inconsistency and bloat.
- **Use Instead:** Existing Dialog/Drawer components with custom styling

**Avoid:** React 19 native form actions (for this use case)
- **Why:** Great for simple forms with server actions. Admin correction UI needs complex client-side state: selective field toggling, preview before submit, undo capability. RHF handles this better.
- **Use Instead:** react-hook-form for complex client-side form state

---

## Stack Patterns by Feature

### Fuzzy Search for MusicBrainz Results

```typescript
import fuzzysort from 'fuzzysort';

// Score MusicBrainz results against local album title
const scoredResults = fuzzysort.go(localAlbum.title, musicBrainzResults, {
  key: 'title',
  threshold: 0.3, // Adjust based on testing
  limit: 10,
});

// Results include score (0-1) and highlighted matches
scoredResults.forEach(result => {
  console.log(result.score, result.target, result.highlight());
});
```

### Selective Field Updates Form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const correctionSchema = z.object({
  title: z.object({
    selected: z.boolean(),
    value: z.string(),
  }),
  artist: z.object({
    selected: z.boolean(), 
    value: z.string(),
  }),
  releaseDate: z.object({
    selected: z.boolean(),
    value: z.string().optional(),
  }),
  // ... other fields
});

type CorrectionForm = z.infer<typeof correctionSchema>;

const { register, watch, setValue, handleSubmit } = useForm<CorrectionForm>({
  resolver: zodResolver(correctionSchema),
  defaultValues: {
    title: { selected: false, value: musicBrainzData.title },
    // ...
  },
});

// Watch only selected fields for efficient re-renders
const selectedFields = watch(['title.selected', 'artist.selected']);
```

### Side-by-Side Comparison Panel

```typescript
// Using allotment for resizable split view
import { Allotment } from 'allotment';

<Allotment>
  <Allotment.Pane minSize={300}>
    <CurrentDataPanel album={localAlbum} />
  </Allotment.Pane>
  <Allotment.Pane minSize={300}>
    <MusicBrainzDataPanel 
      data={selectedMatch}
      onFieldSelect={(field) => setValue(`${field}.selected`, true)}
    />
  </Allotment.Pane>
</Allotment>
```

---

## Version Compatibility Matrix

- react-hook-form@^7.71.1: Compatible with React 19, Zod 3.x
- @hookform/resolvers@^3.9.1: Compatible with RHF 7.x, Zod 3.x and 4.x
- fuzzysort@^3.1.0: No React dependency (pure JS)
- allotment@^1.20.4: React 17-19 compatible (peer dependency)
- @radix-ui/react-dialog@^1.1.14: React 18-19 compatible
- vaul@^1.1.2: React 18-19 compatible
- zod@^3.25.67: No React dependency

---

## Sources

**Fuzzy Matching:**
- [fuzzysort GitHub](https://github.com/farzher/fuzzysort) - Version 3.1.0, performance characteristics
- [npm-compare fuzzy libraries](https://npm-compare.com/fuse.js,fuzzy-search,fuzzysort) - Comparison analysis

**Form Handling:**
- [React Hook Form Releases](https://github.com/react-hook-form/react-hook-form/releases) - v7.71.1 (Jan 2025)
- [React Hook Form Zod Integration](https://github.com/react-hook-form/resolvers) - @hookform/resolvers documentation
- [LogRocket RHF vs React 19](https://blog.logrocket.com/react-hook-form-vs-react-19/) - Comparison and use cases (Apr 2025)
- [Makers Den Form Handling 2025](https://makersden.io/blog/composable-form-handling-in-2025-react-hook-form-tanstack-form-and-beyond) - Current landscape

**Diff/Comparison:**
- [react-diff-viewer-continued React 19 Issue](https://github.com/Aeolun/react-diff-viewer-continued/issues/63) - Open issue since Feb 2025
- [react-diff-viewer-continued GitHub](https://github.com/Aeolun/react-diff-viewer-continued) - v3.4.0, last update Jan 2024

**Panel/Modal Patterns:**
- [Shadcn Sheet](https://www.shadcn.io/ui/sheet) - Sheet component patterns
- [Radix UI Primitives](https://www.radix-ui.com/primitives) - Dialog documentation
- [allotment GitHub](https://github.com/johnwalley/allotment) - v1.20.4, actively maintained

**Project Dependencies:**
- package.json analysis - Verified existing dependencies

---

*Stack research for: Admin Data Correction UI*
*Researched: 2026-01-23*
*Next step: Use these recommendations in roadmap creation*
