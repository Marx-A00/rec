---
phase: 38
plan: 04
subsystem: game-ui
tags: [loading-states, keyboard-accessibility, a11y, polish]
requires: [38-01, 38-02, 38-03]
provides: [loading-feedback, keyboard-navigation, accessibility-polish]
affects: []
tech-stack:
  added: []
  patterns: [loading-overlays, keyboard-handlers, focus-management]
key-files:
  created: []
  modified:
    - src/components/uncover/RevealImage.tsx
    - src/components/uncover/AlbumGuessInput.tsx
    - src/components/uncover/UncoverGame.tsx
    - src/app/m/game/MobileGameClient.tsx
decisions:
  - Spinner overlay for both image loading and guess submission
  - Refocus input after guess selection for continuous play
  - Escape key closes dropdown and blurs input
  - cmdk Command component handles Enter/Arrow keys automatically
metrics:
  duration: 3m 8s
  completed: 2026-02-16
---

# Phase 38 Plan 04: Loading States & Keyboard Accessibility Summary

Loading states and full keyboard accessibility for polished game UX

## What Was Done

Added loading feedback during image transitions and ensured complete keyboard-only playability for accessibility.

**Loading States:**
- RevealImage component tracks internal loading state
- Shows spinner overlay during image load
- Shows spinner overlay during guess submission (isSubmitting prop)
- Resets loading state when imageUrl changes
- Applied to both desktop and mobile game clients

**Keyboard Accessibility:**
- Enter key: Submits highlighted guess (cmdk handles)
- Escape key: Closes dropdown and blurs input
- Arrow keys: Navigate dropdown items (cmdk handles)
- Tab key: Natural tab order to Skip button
- Refocus input after selection for continuous play
- Screen reader support via aria-label

**Visual Feedback:**
- Focus rings on all interactive elements (emerald-500)
- Hover states on dropdown items (bg-zinc-700)
- Disabled states with reduced opacity (opacity-50)
- Keyboard-visible focus indicators

## Tasks Completed

**Task 1:** Added loading states for image reveal transitions
- Files: RevealImage.tsx, UncoverGame.tsx, MobileGameClient.tsx
- Changes:
  - Internal loading state in RevealImage
  - Spinner overlay (Loader2 icon) during loading/submission
  - isSubmitting prop to show loading during guess processing
  - Reset loading on imageUrl change
- Commit: 29a7c6e

**Task 2:** Ensured full keyboard support for autocomplete
- Files: AlbumGuessInput.tsx
- Changes:
  - Added inputRef for focus management
  - Escape key handler (close + blur)
  - Enter/Arrow key support (cmdk Command handles)
  - Refocus input after selection
  - aria-label for screen readers
  - Focus-visible rings on input and Skip button
- Commit: c6131b3

**Task 3:** Added focus ring and visual feedback
- Changes already included in Tasks 1 & 2:
  - Input focus ring: focus-visible:ring-2 focus-visible:ring-emerald-500
  - Dropdown highlight: data-[selected=true]:bg-zinc-700
  - Skip button focus: focus-visible:ring-2 focus-visible:ring-emerald-500
  - Disabled state: opacity-50 cursor-not-allowed
- No additional commit needed (covered in Task 2)

## Technical Details

**Loading State Architecture:**
```typescript
// RevealImage tracks loading internally
const [isImageLoading, setIsImageLoading] = useState(true);

// Reset on URL change
useEffect(() => {
  setIsImageLoading(true);
}, [imageUrl]);

// Show overlay for loading OR submission
{(isImageLoading || isSubmitting) && (
  <div className='absolute inset-0 flex items-center justify-center'>
    <Loader2 className='h-8 w-8 animate-spin' />
  </div>
)}
```

**Keyboard Handler:**
```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    setIsOpen(false);
    inputRef.current?.blur();
  }
  // Enter and arrow keys handled by cmdk
};
```

**Focus Management:**
```typescript
const handleSelect = (albumId: string) => {
  // ... submit guess ...
  setInputValue('');
  setIsOpen(false);
  
  // Refocus for next guess
  setTimeout(() => {
    inputRef.current?.focus();
  }, 100);
};
```

## Deviations from Plan

None — plan executed exactly as written.

## Requirements Satisfied

- UI-03: Loading states for image processing ✅
- UI-05: Keyboard support for guess input ✅
- WCAG 2.1: Keyboard accessibility (operable) ✅
- WCAG 2.1: Focus visible ✅

## Next Phase Readiness

**Phase 39 (Stats & Streaks) is ready:**
- Game UI is complete and polished
- Loading states provide smooth transitions
- Keyboard accessibility ensures inclusive play
- Ready for stats tracking and streak calculations

**Dependencies for 39:**
- Session completion data (already tracked)
- Attempt counts (already stored)
- Win/loss outcomes (already tracked)

## Testing Notes

**Keyboard Flow Verification:**
1. Type to search → arrows navigate → Enter selects → input refocused
2. Type to search → Escape closes → Tab moves to Skip button
3. Skip button → Tab moves to next element
4. All focus indicators visible with keyboard navigation

**Loading States Verification:**
1. Initial load: Spinner shows until image loads
2. Guess submission: Spinner overlays image during processing
3. Stage transition: Smooth transition without flicker

**Accessibility Verification:**
- Screen readers announce input purpose via aria-label
- cmdk provides aria attributes for dropdown
- Focus rings visible for all keyboard interactions
- No keyboard traps (can Tab through all elements)

## Lessons Learned

**cmdk Command Benefits:**
- Built-in keyboard navigation (no custom handlers needed)
- Automatic aria attributes for screen readers
- data-[selected=true] for visual feedback
- Less code, better accessibility

**Loading State Timing:**
- Separate loading for image vs. submission
- Image loading: internal to RevealImage (resets on URL change)
- Submission loading: passed as prop from game state
- Combined overlay for seamless UX

**Focus Management Pattern:**
- Refocus input after selection enables continuous play
- setTimeout(100ms) prevents race conditions
- Blur on Escape provides clear exit path
- Natural Tab order (no tabIndex manipulation needed)
