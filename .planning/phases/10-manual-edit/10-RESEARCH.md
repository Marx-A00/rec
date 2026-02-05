# Phase 10: Manual Edit - Research

**Researched:** 2026-01-27
**Domain:** Inline editing UI, form validation, external ID format validation
**Confidence:** HIGH

## Summary

Phase 10 enables direct field editing for album corrections when MusicBrainz search doesn't yield suitable matches. This is a manual correction workflow where admins edit title, artist names, release date, release type, and external IDs without relying on external search results.

Research covered inline editing patterns in React, form validation with Zod, external ID format validation (UUID for MusicBrainz, base62 for Spotify, numeric for Discogs), and chip-based multi-value inputs. The existing codebase provides strong foundations: preview components are reusable, the apply mutation accepts any source, and Zod is already installed for validation.

**Primary recommendation:** Use controlled inputs with real-time Zod validation, badge-based chips for artists with keyboard navigation, and reuse existing preview/apply infrastructure with "manual_correction" as the source.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library         | Version       | Purpose                 | Why Standard                                                       |
| --------------- | ------------- | ----------------------- | ------------------------------------------------------------------ |
| Zod             | ^3.25.67      | Schema validation       | Already installed, TypeScript-first validation with type inference |
| React Hook Form | Not installed | Form state management   | Optional - controlled inputs may be simpler for inline editing     |
| Radix UI Select | ^2.2.6        | Release type dropdown   | Already installed, accessible dropdown component                   |
| Radix UI Dialog | ^1.1.14       | Unsaved changes warning | Already installed, accessible modal pattern                        |

### Supporting

| Library                  | Version   | Purpose                           | When to Use                                 |
| ------------------------ | --------- | --------------------------------- | ------------------------------------------- |
| class-variance-authority | Installed | Badge variants for chips          | Already used in Badge component for styling |
| lucide-react             | Installed | Icons (X for clear, Plus for add) | Consistent with existing UI                 |

### Alternatives Considered

| Instead of            | Could Use             | Tradeoff                                                                             |
| --------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| Controlled inputs     | react-contenteditable | contenteditable has accessibility issues and requires suppressContentEditableWarning |
| Custom chip component | Material UI Chip      | Adds large dependency for single component                                           |
| Zod validation        | Yup                   | Zod already installed, better TypeScript integration                                 |

**Installation:**

```bash
# No new dependencies needed - Zod already installed
# Optional if complex form state needed:
# pnpm install react-hook-form @hookform/resolvers
```

## Architecture Patterns

### Recommended Project Structure

```
src/components/admin/correction/
├── manual/
│   ├── ManualEditView.tsx         # Main container for manual edit step
│   ├── EditableField.tsx          # Inline editable text field
│   ├── ArtistChipsInput.tsx       # Multi-value artist input with chips
│   ├── DateInput.tsx              # Flexible date input (YYYY, YYYY-MM, YYYY-MM-DD)
│   ├── ExternalIdInput.tsx        # External ID input with format validation
│   └── validation.ts              # Zod schemas for field validation
├── preview/                       # Existing - reusable for manual edit preview
└── apply/                         # Existing - reusable for manual edit apply
```

### Pattern 1: Inline Editing with Controlled Inputs

**What:** Click-to-edit pattern using controlled inputs that swap between display and edit modes
**When to use:** For single-value fields (title, release date, release type)
**Example:**

```typescript
// Source: Research synthesis from LogRocket and emgoto.com patterns
const [isEditing, setIsEditing] = useState(false);
const [value, setValue] = useState(initialValue);
const [error, setError] = useState<string | null>(null);

const handleSave = () => {
  const result = fieldSchema.safeParse(value);
  if (!result.success) {
    setError(result.error.errors[0].message);
    return;
  }
  setError(null);
  setIsEditing(false);
  onSave(value);
};

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleSave();
  } else if (e.key === 'Escape') {
    setValue(initialValue);
    setError(null);
    setIsEditing(false);
  }
};

return isEditing ? (
  <div>
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleSave}
      autoFocus
    />
    {error && <span className="text-red-400 text-xs">{error}</span>}
  </div>
) : (
  <button onClick={() => setIsEditing(true)}>
    {value || 'Click to edit'}
  </button>
);
```

### Pattern 2: Artist Chips Input

**What:** Tag-style input where artists are displayed as removable chips with an add button
**When to use:** For multi-value artist credits field
**Example:**

```typescript
// Source: Synthesized from MUI Chip and DEV Community patterns
const [artists, setArtists] = useState<string[]>(initialArtists);
const [inputValue, setInputValue] = useState('');

const handleAddArtist = () => {
  if (!inputValue.trim()) return;
  setArtists([...artists, inputValue.trim()]);
  setInputValue('');
};

const handleRemoveArtist = (index: number) => {
  setArtists(artists.filter((_, i) => i !== index));
};

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleAddArtist();
  }
};

return (
  <div className="flex flex-wrap gap-2">
    {artists.map((artist, index) => (
      <Badge key={index} variant="secondary" className="gap-1">
        {artist}
        <button onClick={() => handleRemoveArtist(index)}>
          <X className="h-3 w-3" />
        </button>
      </Badge>
    ))}
    <div className="flex items-center gap-1">
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add artist"
        className="w-32"
      />
      <button onClick={handleAddArtist}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  </div>
);
```

### Pattern 3: Real-Time Validation with Zod

**What:** Validate field values on blur or change using Zod schemas
**When to use:** All editable fields, especially external IDs
**Example:**

```typescript
// Source: Official Zod documentation and Contentful blog
import { z } from 'zod';

// Define schemas
const titleSchema = z.string().min(1, 'Title is required').max(500);
const mbidSchema = z.string().uuid('Must be a valid UUID').nullable();
const spotifyIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9]{22}$/, 'Must be 22 character base62 ID')
  .nullable();
const discogsIdSchema = z.string().regex(/^\d+$/, 'Must be numeric').nullable();

// Partial date schema accepting YYYY, YYYY-MM, or YYYY-MM-DD
const partialDateSchema = z
  .string()
  .regex(
    /^(\d{4})(-((0[1-9]|1[0-2])(-((0[1-9]|[12]\d|3[01])))?)?)?$/,
    'Must be YYYY, YYYY-MM, or YYYY-MM-DD'
  )
  .nullable();

// Use in component
const result = titleSchema.safeParse(value);
if (!result.success) {
  setError(result.error.errors[0].message);
}
```

### Pattern 4: Unsaved Changes Warning

**What:** Warn before switching tabs if manual edit fields have unsaved changes
**When to use:** When switching from manual edit to search, or closing modal
**Example:**

```typescript
// Source: DEV Community and Medium - React Router useBlocker patterns
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
const [showWarning, setShowWarning] = useState(false);
const [pendingAction, setPendingAction] = useState<() => void>();

const handleTabSwitch = (action: () => void) => {
  if (hasUnsavedChanges) {
    setPendingAction(() => action);
    setShowWarning(true);
  } else {
    action();
  }
};

const handleConfirmLeave = () => {
  setShowWarning(false);
  setHasUnsavedChanges(false);
  pendingAction?.();
};

// In modal
{showWarning && (
  <Dialog open={showWarning} onOpenChange={setShowWarning}>
    <DialogContent>
      <DialogTitle>Unsaved Changes</DialogTitle>
      <p>You have unsaved edits. Discard changes?</p>
      <Button onClick={handleConfirmLeave}>Discard</Button>
      <Button onClick={() => setShowWarning(false)}>Keep Editing</Button>
    </DialogContent>
  </Dialog>
)}
```

### Pattern 5: Preview Before Apply (Reuse Existing)

**What:** Show same diff view as search flow before applying manual edits
**When to use:** After admin finishes editing and clicks preview
**Example:**

```typescript
// Reuse existing PreviewView component with manually constructed preview data
const manualPreview: CorrectionPreview = {
  currentAlbum: album,
  sourceResult: {
    // Construct from manual edits - no actual MBID
    id: 'manual',
    title: editedTitle,
    artistCredit: editedArtists,
    // ... other edited fields
  },
  fieldDiffs: computeManualDiffs(album, editedFields),
  // ... other preview fields
};

<PreviewView
  albumId={album.id}
  manualPreview={manualPreview} // New prop for manual mode
  onApplyClick={handleApplyManual}
/>
```

### Anti-Patterns to Avoid

- **Using contenteditable for inline editing:** Accessibility issues, requires suppressContentEditableWarning, harder to control. Use controlled inputs instead.
- **Validating only on submit:** Poor UX - validate on blur for immediate feedback
- **Empty string to clear external IDs:** Ambiguous - use explicit clear button (X icon)
- **Global form state for simple inline edits:** Overkill - local useState is simpler

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                   | Don't Build           | Use Instead                              | Why                                         |
| ------------------------- | --------------------- | ---------------------------------------- | ------------------------------------------- |
| UUID validation           | Custom regex          | Zod `.uuid()` method                     | Handles edge cases, better error messages   |
| Date parsing              | String manipulation   | Zod regex with capture groups            | Validates partial dates correctly           |
| Chip component            | Custom div styling    | Extend existing Badge component          | Consistent with design system               |
| Unsaved changes detection | Manual dirty tracking | React Hook Form's isDirty (if using RHF) | Automatic tracking, less error-prone        |
| Dropdown component        | Custom select         | Radix UI Select (already installed)      | Accessibility, keyboard navigation built-in |

**Key insight:** External ID validation formats are specific and error-prone. Use established patterns rather than custom validation.

## Common Pitfalls

### Pitfall 1: Uncontrolled to Controlled Input Warning

**What goes wrong:** React warning "A component is changing an uncontrolled input to be controlled" when initial value is null/undefined
**Why it happens:** Input value prop transitions from undefined to defined value during state updates
**How to avoid:** Always initialize state with empty string, not null: `const [value, setValue] = useState(initialValue ?? '')`
**Warning signs:** Console warnings about controlled/uncontrolled inputs

### Pitfall 2: Losing Focus on Validation Error

**What goes wrong:** When validation fails, input loses focus and user must click again to continue editing
**Why it happens:** Re-rendering on error state change without proper focus management
**How to avoid:** Use onBlur for validation, not onChange. Keep edit mode active on validation errors.
**Warning signs:** User must click multiple times to correct input

### Pitfall 3: Spotify ID Confusion with Internal Format

**What goes wrong:** Accepting Spotify's internal hex format (32-character) instead of public base62 ID (22-character)
**Why it happens:** Spotify API returns both formats in different contexts
**How to avoid:** Validate for 22-character base62 format only: `/^[a-zA-Z0-9]{22}$/`
**Warning signs:** User pastes long hex string and it passes validation

### Pitfall 4: Partial Date Edge Cases

**What goes wrong:** Accepting invalid dates like "2026-13-45" that match regex but aren't real dates
**Why it happens:** Regex validates format but not semantic validity
**How to avoid:** Regex already constrains month (01-12) and day (01-31). For full validation, parse with Date constructor after regex check.
**Warning signs:** User enters "2026-02-30" and it's accepted

### Pitfall 5: Missing Accessibility on Chips

**What goes wrong:** Screen readers don't announce chip removals, keyboard users can't navigate chips
**Why it happens:** Chips are styled divs without proper ARIA attributes or keyboard handlers
**How to avoid:** Add `role="button"`, `tabIndex={0}`, `aria-label="Remove {artist}"` to remove buttons. Support Tab navigation and Enter/Space to remove.
**Warning signs:** Can't tab to remove buttons, screen reader doesn't announce removals

### Pitfall 6: Forgetting to Track Unsaved Changes

**What goes wrong:** User makes edits, switches tabs, loses all changes without warning
**Why it happens:** No dirty state tracking or navigation guards
**How to avoid:** Set `hasUnsavedChanges` flag whenever field values differ from initial state. Check flag before navigation.
**Warning signs:** Users complain about lost edits

## Code Examples

Verified patterns from official sources:

### External ID Validation Schemas

```typescript
// Source: Zod official docs (zod.dev), Spotify Community, MusicBrainz practices
import { z } from 'zod';

// MusicBrainz ID - standard UUID v4 format
const musicbrainzIdSchema = z
  .string()
  .uuid('MusicBrainz ID must be a valid UUID')
  .nullable()
  .optional();

// Spotify ID - 22-character base62 (alphanumeric)
const spotifyIdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9]{22}$/, 'Spotify ID must be 22 alphanumeric characters')
  .nullable()
  .optional();

// Discogs ID - numeric only
const discogsIdSchema = z
  .string()
  .regex(/^\d+$/, 'Discogs ID must be numeric')
  .nullable()
  .optional();

// Partial date validation - YYYY, YYYY-MM, or YYYY-MM-DD
const partialDateSchema = z
  .string()
  .regex(
    /^(\d{4})(-((0[1-9]|1[0-2])(-((0[1-9]|[12]\d|3[01])))?)?)?$/,
    'Date must be YYYY, YYYY-MM, or YYYY-MM-DD format'
  )
  .nullable()
  .optional();

// Complete manual edit schema
const manualEditSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  artists: z.array(z.string().min(1)).min(1, 'At least one artist required'),
  releaseDate: partialDateSchema,
  releaseType: z
    .enum([
      'Album',
      'EP',
      'Single',
      'Compilation',
      'Soundtrack',
      'Live',
      'Remix',
      'Other',
    ])
    .nullable(),
  musicbrainzId: musicbrainzIdSchema,
  spotifyId: spotifyIdSchema,
  discogsId: discogsIdSchema,
});

type ManualEditFormData = z.infer<typeof manualEditSchema>;
```

### Editable Field with Clear Button

```typescript
// Source: Research synthesis - controlled input with explicit clear
interface ExternalIdInputProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  schema: z.ZodType;
  placeholder: string;
  hint: string;
}

export function ExternalIdInput({ label, value, onChange, schema, placeholder, hint }: ExternalIdInputProps) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const validate = (val: string) => {
    if (!val.trim()) {
      setError(null);
      return true;
    }
    const result = schema.safeParse(val);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return false;
    }
    setError(null);
    return true;
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (validate(localValue)) {
      onChange(localValue.trim() || null);
    }
  };

  const handleClear = () => {
    setLocalValue('');
    setError(null);
    onChange(null);
  };

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      <div className="relative">
        <Input
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={error ? 'border-red-500' : ''}
        />
        {localValue && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            type="button"
            aria-label={`Clear ${label}`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {isFocused && !error && (
        <p className="text-xs text-zinc-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
```

### Artist Chips with Keyboard Navigation

```typescript
// Source: MUI Chip docs, PrimeReact accessibility patterns
interface ArtistChipsInputProps {
  artists: string[];
  onChange: (artists: string[]) => void;
}

export function ArtistChipsInput({ artists, onChange }: ArtistChipsInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || artists.includes(trimmed)) return;

    onChange([...artists, trimmed]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleRemove = (index: number) => {
    onChange(artists.filter((_, i) => i !== index));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Backspace' && !inputValue && artists.length > 0) {
      // Backspace on empty input removes last artist
      handleRemove(artists.length - 1);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300">Artists</label>
      <div className="flex flex-wrap gap-2 p-2 border border-zinc-700 rounded-md bg-zinc-800">
        {artists.map((artist, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="gap-1.5 pl-2.5 pr-1.5"
          >
            <span>{artist}</span>
            <button
              onClick={() => handleRemove(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRemove(index);
                }
              }}
              className="hover:bg-zinc-700 rounded-sm p-0.5"
              type="button"
              tabIndex={0}
              aria-label={`Remove ${artist}`}
              role="button"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={artists.length === 0 ? 'Add artist name' : 'Add another'}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-zinc-100"
        />
      </div>
      {artists.length === 0 && (
        <p className="text-xs text-red-400">At least one artist required</p>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach                    | Current Approach          | When Changed | Impact                                                       |
| ------------------------------- | ------------------------- | ------------ | ------------------------------------------------------------ |
| react-hook-form only            | Zod + optional RHF        | 2023-2024    | Better type inference, simpler validation for inline editing |
| contenteditable for inline edit | Controlled inputs         | Ongoing      | Better accessibility, simpler state management               |
| Complex validation libraries    | Zod with built-in methods | 2023-present | .uuid(), .regex() more maintainable than custom functions    |

**Deprecated/outdated:**

- react-contenteditable: Not recommended for forms due to accessibility issues and React warnings
- Manual UUID regex: Zod's `.uuid()` method is more reliable
- onChange validation only: onBlur validation provides better UX (per research)

## Open Questions

Things that couldn't be fully resolved:

1. **Should manual edits fetch MusicBrainz data for preview?**
   - What we know: Manual edit never uses search results per CONTEXT.md
   - What's unclear: For preview diff, should we construct synthetic "source" data from manual edits, or fetch minimal MB data by ID if available?
   - Recommendation: Construct synthetic source data from manual edits. If admin provides valid MBID, they can verify it separately.

2. **Chip reordering - drag vs arrow buttons**
   - What we know: CONTEXT.md mentions "reorder if needed" in specifics
   - What's unclear: Whether reordering is required, and if so, which interaction pattern
   - Recommendation: Defer reordering to future enhancement. Artist order typically matches artist credits, which is manually typed in desired order.

3. **Release type - exact enum values**
   - What we know: Schema should list predefined types (Album, EP, Single, Compilation, etc.)
   - What's unclear: Complete list of valid release types for this system
   - Recommendation: Check Prisma schema for releaseType enum or existing album data for used values.

## Sources

### Primary (HIGH confidence)

- Zod Official Documentation - https://zod.dev/ - Schema definition and validation methods
- Spotify Developer Documentation - https://developer.spotify.com/documentation/web-api/concepts/spotify-uris-ids - ID format specification
- Radix UI Select Documentation - Component API for release type dropdown
- Existing codebase - Badge, Input, Select components, apply mutation pattern

### Secondary (MEDIUM confidence)

- [How to build an inline editable UI in React - LogRocket](https://blog.logrocket.com/build-inline-editable-ui-react/)
- [Mastering Zod Validation in React - Medium](https://medium.com/@roman_j/mastering-zod-validation-in-react-a-comprehensive-guide-7c1b046547ac)
- [Type-Safe Form Validation in Next.js 15 - AbstractAPI](https://www.abstractapi.com/guides/email-validation/type-safe-form-validation-in-next-js-15-with-zod-and-react-hook-form)
- [React Chip component - Material UI](https://mui.com/material-ui/react-chip/)
- [How to Create Unsaved Changes Alerts in React - Medium](https://medium.com/@ignatovich.dm/how-to-create-a-custom-hook-for-unsaved-changes-alerts-in-react-b1441f0ae712)
- [ARIA: textbox role - MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/textbox_role)
- [Developing a Keyboard Interface - W3C](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)

### Tertiary (LOW confidence)

- [UUID Regex Validator - iHateRegex](https://ihateregex.io/expr/uuid/) - Pattern reference only, Zod preferred
- [Spotify ID Format - Community Discussion](https://community.spotify.com/t5/Spotify-for-Developers/API-What-defines-a-valid-Spotify-ID/td-p/5069603) - Base62 22-char confirmed
- [Discogs Database Guidelines - Discogs Support](https://support.discogs.com/hc/en-us/articles/360005006654-Database-Guidelines-6-Format) - General format info, not ID-specific

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Zod already installed, patterns verified in docs
- Architecture: HIGH - Controlled input patterns well-established, existing components reusable
- External ID validation: HIGH - Official docs for Spotify, UUID standard for MB, numeric for Discogs
- Inline editing UX: MEDIUM - Patterns from blog posts, need testing for this specific flow
- Pitfalls: HIGH - Well-documented issues in React forms and controlled inputs

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days - stable domain)
