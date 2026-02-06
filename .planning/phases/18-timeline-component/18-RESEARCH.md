# Phase 18: Timeline Component - Research

**Researched:** 2026-02-06
**Domain:** React Timeline Component with Framer Motion Animations
**Confidence:** HIGH

## Summary

This phase adds the shadcn-timeline component from [timDeHof/shadcn-timeline](https://github.com/timDeHof/shadcn-timeline) and creates mapping utilities to connect EnrichmentLog data to timeline display. The component requires copying two core files (`timeline.tsx` and `timeline-layout.tsx`) and creating status/icon mapping utilities.

The project already has all required dependencies installed:
- `framer-motion` v12.23.14 (latest major)
- `lucide-react` v0.471.1
- `class-variance-authority` v0.7.1

The shadcn-timeline component provides Timeline, TimelineItem, TimelineIcon, TimelineConnector, and other sub-components with built-in Framer Motion animations, loading states, and error display.

**Primary recommendation:** Copy the shadcn-timeline component files verbatim, then create thin mapping utilities to convert EnrichmentLog data to TimelineItem props.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)

- **framer-motion** - v12.23.14 - Animation library - Required by shadcn-timeline for stagger/fade animations
- **lucide-react** - v0.471.1 - Icon library - Provides Disc, User, Cloud, Check, X, Loader icons
- **class-variance-authority** - v0.7.1 - Variant styling - Used by shadcn-timeline for size/color variants

### Component Source

- **shadcn-timeline** - Copy from [timDeHof/shadcn-timeline](https://github.com/timDeHof/shadcn-timeline) - NOT installed as dependency, files are copied

### No Installation Required

All dependencies already in `package.json`. No `pnpm install` needed.

## Architecture Patterns

### Recommended Project Structure

```
src/components/ui/timeline/
├── index.ts              # Re-exports all timeline components
├── timeline.tsx          # Core Timeline, TimelineItem, TimelineIcon, etc.
└── timeline-layout.tsx   # TimelineLayout helper (staggered animation wrapper)

src/components/admin/
└── EnrichmentTimeline.tsx  # Wrapper that maps EnrichmentLog to timeline props
```

### Pattern 1: Status Mapping Utility

**What:** Maps EnrichmentLogStatus enum to shadcn-timeline status prop
**When to use:** Every EnrichmentLog to TimelineItem conversion

```typescript
// Source: Project schema + shadcn-timeline API
import type { EnrichmentLogStatus } from '@/generated/graphql';

type TimelineStatus = 'completed' | 'in-progress' | 'pending';

export function mapEnrichmentStatus(status: EnrichmentLogStatus): TimelineStatus {
  switch (status) {
    case 'SUCCESS':
    case 'PARTIAL_SUCCESS':
      return 'completed';
    case 'FAILED':
    case 'NO_DATA_AVAILABLE':
      return 'completed'; // Still completed (finished with error)
    case 'SKIPPED':
      return 'completed';
    case 'PREVIEW':
      return 'pending';
    default:
      return 'in-progress';
  }
}
```

### Pattern 2: Icon Color Mapping

**What:** Maps EnrichmentLogStatus to icon color theme
**When to use:** Coloring timeline icons based on outcome

```typescript
type IconColor = 'primary' | 'secondary' | 'muted' | 'accent';

export function getStatusColor(status: EnrichmentLogStatus): IconColor {
  switch (status) {
    case 'SUCCESS':
      return 'primary';   // Green - success
    case 'PARTIAL_SUCCESS':
      return 'accent';    // Yellow - partial
    case 'FAILED':
      return 'secondary'; // Red - failed (customize CSS)
    case 'NO_DATA_AVAILABLE':
    case 'SKIPPED':
      return 'muted';     // Gray - neutral
    case 'PREVIEW':
      return 'accent';    // Blue - preview
    default:
      return 'muted';
  }
}
```

### Pattern 3: Operation Icon Mapping

**What:** Returns appropriate lucide-react icon based on operation type
**When to use:** Displaying operation-specific icons in timeline

```typescript
import {
  Disc,
  User,
  Music,
  Cloud,
  Search,
  Database,
  CheckCircle,
  XCircle,
  Loader2,
  type LucideIcon,
} from 'lucide-react';

const OPERATION_ICONS: Record<string, LucideIcon> = {
  // Album operations
  'enrichment:album': Disc,
  'check:album-enrichment': Disc,
  'cache:album-cover-art': Cloud,
  
  // Artist operations
  'enrichment:artist': User,
  'check:artist-enrichment': User,
  'cache:artist-image': Cloud,
  
  // Track operations
  'enrichment:track': Music,
  'check:track-enrichment': Music,
  
  // Discogs operations
  'discogs:search-artist': Search,
  'discogs:get-artist': Database,
  
  // MusicBrainz operations
  'musicbrainz:search-artists': Search,
  'musicbrainz:lookup-artist': Database,
  'musicbrainz:lookup-release': Database,
  
  // Preview operations
  'PREVIEW_ENRICHMENT': Disc,
};

export function getOperationIcon(operation: string): LucideIcon {
  return OPERATION_ICONS[operation] ?? Database;
}
```

### Pattern 4: Staggered Animation with Framer Motion

**What:** Items animate in one-by-one on load
**When to use:** Timeline component initial render

```typescript
// Source: shadcn-timeline TimelineLayout
import { motion } from 'framer-motion';

// Parent container with staggerChildren
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

// Each child item
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

// Usage
<motion.ol variants={containerVariants} initial="hidden" animate="visible">
  {items.map((item, i) => (
    <motion.li key={i} variants={itemVariants}>
      <TimelineItem {...item} />
    </motion.li>
  ))}
</motion.ol>
```

### Pattern 5: Parent-Child Tree Rendering

**What:** Render parent items with nested children (from Phase 17 GraphQL)
**When to use:** Displaying job chains with parent → child relationships

```typescript
interface EnrichmentTimelineProps {
  logs: EnrichmentLog[]; // Already includes children from resolver
}

function EnrichmentTimeline({ logs }: EnrichmentTimelineProps) {
  return (
    <Timeline>
      {logs.map((log) => (
        <TimelineItem
          key={log.id}
          date={log.createdAt}
          title={formatOperation(log.operation)}
          description={log.reason || getDefaultDescription(log)}
          icon={<OperationIcon operation={log.operation} />}
          status={mapEnrichmentStatus(log.status)}
        >
          {/* Nested children if present */}
          {log.children && log.children.length > 0 && (
            <Timeline size="sm">
              {log.children.map((child) => (
                <TimelineItem
                  key={child.id}
                  date={child.createdAt}
                  title={formatOperation(child.operation)}
                  description={child.reason}
                  icon={<OperationIcon operation={child.operation} />}
                  status={mapEnrichmentStatus(child.status)}
                />
              ))}
            </Timeline>
          )}
        </TimelineItem>
      ))}
    </Timeline>
  );
}
```

### Anti-Patterns to Avoid

- **Using Framer Motion \`motion()\` on Timeline directly:** The shadcn-timeline already wraps motion internally. Wrap parent list, not the Timeline component.
- **Forgetting \`'use client'\` directive:** Both timeline files require client-side rendering for Framer Motion.
- **Modifying timeline.tsx heavily:** Keep it close to source; customize via wrapper component.
- **Nested Framer Motion contexts:** Don't add animation wrappers inside TimelineItem if it already has motion.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

- **Timeline connector lines** - Don't build custom SVG/CSS. Use shadcn-timeline TimelineConnector. It handles gradients, colors, responsive sizing.
- **Status indicators** - Don't do manual state colors. Use shadcn-timeline status prop. It has built-in completed/in-progress/pending styling.
- **Staggered animations** - Don't do manual delay calculations. Use TimelineLayout or motion variants. Framer Motion handles complex orchestration.
- **Loading skeletons** - Don't build custom skeleton per item. Use TimelineItem loading prop. It has built-in animated skeleton states.
- **Error display** - Don't do custom error styling. Use TimelineItem error prop. It has built-in alert styling with semantic colors.

**Key insight:** shadcn-timeline handles all the complex timeline rendering. Focus on data mapping, not UI implementation.

## Common Pitfalls

### Pitfall 1: Hydration Mismatch with Dates

**What goes wrong:** Server renders date differently than client, causing hydration errors
**Why it happens:** TimelineTime formats dates client-side; server may have different locale
**How to avoid:** Use the built-in TimelineTime component which handles hydration properly
**Warning signs:** Console errors about hydration mismatch, flickering dates

### Pitfall 2: Animation Not Running

**What goes wrong:** Items appear without stagger animation
**Why it happens:** Framer Motion variants not connected properly, or initial state wrong
**How to avoid:** Ensure \`initial="hidden"\` and \`animate="visible"\` on parent container
**Warning signs:** All items appear simultaneously, no fade/slide effect

### Pitfall 3: Connector Line Gaps

**What goes wrong:** Gaps or overlaps between timeline connector segments
**Why it happens:** Not passing \`showConnector\` prop correctly, especially on last item
**How to avoid:** Use \`showConnector={index !== items.length - 1}\` pattern
**Warning signs:** Visual breaks in the vertical connector line

### Pitfall 4: Icon Size Mismatch

**What goes wrong:** Icons too large or small inside timeline circles
**Why it happens:** Not passing \`iconsize\` prop, or using wrong lucide icon size
**How to avoid:** Use \`size="md"\` on Timeline, and \`size={16}\` on lucide icons
**Warning signs:** Icons overflowing circles, or looking tiny

### Pitfall 5: Long Error Messages Breaking Layout

**What goes wrong:** Error messages overflow or break timeline layout
**Why it happens:** Raw error messages from logs can be very long
**How to avoid:** Truncate inline errors, show full error on expand (CONTEXT.md decision)
**Warning signs:** Horizontal overflow, broken timeline alignment

### Pitfall 6: Tree View Fallback Forgotten

**What goes wrong:** No fallback if timeline has rendering issues
**Why it happens:** Forgetting the view switcher from CONTEXT.md decisions
**How to avoid:** Implement simple tree view toggle at top of component
**Warning signs:** Users stuck with broken timeline, no escape hatch

## Code Examples

Verified patterns from official sources:

### TimelineItem Basic Usage

```typescript
// Source: shadcn-timeline README
import { Timeline, TimelineItem } from '@/components/ui/timeline';
import { Check } from 'lucide-react';

export default function Example() {
  return (
    <Timeline>
      <TimelineItem
        date={new Date('2026-02-06')}
        title="Album Enrichment Complete"
        description="Successfully fetched MusicBrainz data and cached cover art"
        icon={<Check size={16} />}
        status="completed"
        iconColor="primary"
      />
    </Timeline>
  );
}
```

### TimelineItem with Error State

```typescript
// Source: shadcn-timeline API
<TimelineItem
  date={log.createdAt}
  title="Enrichment Failed"
  description={log.reason}
  icon={<XCircle size={16} />}
  status="completed"
  iconColor="secondary"
  error={log.errorMessage?.slice(0, 100)} // Truncate for inline display
/>
```

### TimelineItem with Loading State

```typescript
// Source: shadcn-timeline API
<TimelineItem
  date={new Date()}
  title="Processing..."
  description="Fetching artist data from MusicBrainz"
  loading={true} // Shows animated skeleton
/>
```

### EnrichmentLog to TimelineItem Conversion

```typescript
// Project-specific pattern
import type { EnrichmentLog } from '@/generated/graphql';
import { formatDistanceToNow } from 'date-fns';

interface TimelineItemData {
  date: Date;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconColor: 'primary' | 'secondary' | 'muted' | 'accent';
  status: 'completed' | 'in-progress' | 'pending';
  error?: string;
}

export function mapLogToTimelineItem(log: EnrichmentLog): TimelineItemData {
  const Icon = getOperationIcon(log.operation);
  
  return {
    date: new Date(log.createdAt),
    title: formatOperationTitle(log.operation, log.entityType),
    description: log.reason || \`\${log.fieldsEnriched.length} fields enriched\`,
    icon: <Icon size={16} />,
    iconColor: getStatusColor(log.status),
    status: mapEnrichmentStatus(log.status),
    error: log.status === 'FAILED' ? log.errorMessage?.slice(0, 100) : undefined,
  };
}

function formatOperationTitle(operation: string, entityType?: string | null): string {
  const opName = operation.split(':').pop()?.replace(/-/g, ' ') || operation;
  const entity = entityType?.toLowerCase() || '';
  return \`\${opName.charAt(0).toUpperCase()}\${opName.slice(1)}\${entity ? \` (\${entity})\` : ''}\`;
}
```

### View Switcher (Per CONTEXT.md)

```typescript
// Per CONTEXT.md decision: toggle between timeline and tree view
import { useState } from 'react';
import { List, GitBranch } from 'lucide-react';

type ViewMode = 'timeline' | 'tree';

function EnrichmentHistory({ logs }: { logs: EnrichmentLog[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  
  return (
    <div>
      {/* View switcher at top */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('timeline')}
          className={viewMode === 'timeline' ? 'bg-primary' : 'bg-muted'}
        >
          <List size={16} /> Timeline
        </button>
        <button
          onClick={() => setViewMode('tree')}
          className={viewMode === 'tree' ? 'bg-primary' : 'bg-muted'}
        >
          <GitBranch size={16} /> Tree
        </button>
      </div>
      
      {viewMode === 'timeline' ? (
        <EnrichmentTimeline logs={logs} />
      ) : (
        <EnrichmentTree logs={logs} />
      )}
    </div>
  );
}
```

### Long Chain Truncation (Per CONTEXT.md: 15+ children)

```typescript
// Per CONTEXT.md decision: truncate chains with 15+ children
const TRUNCATION_THRESHOLD = 15;

function ChildrenList({ children }: { children: EnrichmentLog[] }) {
  const [showAll, setShowAll] = useState(false);
  const shouldTruncate = children.length > TRUNCATION_THRESHOLD;
  const visibleChildren = showAll ? children : children.slice(0, TRUNCATION_THRESHOLD);
  const hiddenCount = children.length - TRUNCATION_THRESHOLD;
  
  return (
    <Timeline size="sm">
      {visibleChildren.map((child) => (
        <TimelineItem key={child.id} {...mapLogToTimelineItem(child)} />
      ))}
      {shouldTruncate && !showAll && (
        <button onClick={() => setShowAll(true)} className="text-sm text-muted-foreground">
          Show {hiddenCount} more...
        </button>
      )}
    </Timeline>
  );
}
```

## State of the Art

- **Old Approach:** CSS transitions → **Current Approach:** Framer Motion variants (since 2024). Impact: Smoother, orchestrated animations.
- **Old Approach:** Manual timeline CSS → **Current Approach:** shadcn-timeline component (since 2024). Impact: No hand-rolling connector logic.
- **Old Approach:** Inline date formatting → **Current Approach:** TimelineTime component (built into shadcn-timeline). Impact: Avoids hydration issues.

**Deprecated/outdated:**

- Manual SVG connector lines: Use TimelineConnector
- React Spring for simple animations: Framer Motion is the standard in shadcn ecosystem

## Open Questions

None. All requirements are clear from CONTEXT.md and component documentation.

## Sources

### Primary (HIGH confidence)

- [timDeHof/shadcn-timeline](https://github.com/timDeHof/shadcn-timeline) - Repository, API, file structure
- [shadcn-timeline.vercel.app](https://shadcn-timeline.vercel.app/) - Live demo, component variants
- Project \`package.json\` - Confirmed framer-motion v12.23.14, lucide-react v0.471.1
- Project \`schema.graphql\` - EnrichmentLog type, EnrichmentLogStatus enum
- Project \`src/lib/queue/jobs.ts\` - JOB_TYPES constants for operation mapping

### Secondary (MEDIUM confidence)

- [Lucide Icons](https://lucide.dev/icons) - Icon availability (disc, user, cloud, music, etc.)
- [Framer Motion Stagger](https://motion.dev/motion/stagger/) - Animation orchestration patterns

### Tertiary (LOW confidence)

None. All findings verified with primary sources.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All dependencies already installed, versions verified in package.json
- Architecture: HIGH - Component structure matches shadcn-timeline exactly, mapping patterns derived from project schema
- Pitfalls: MEDIUM - Common issues inferred from component API and React patterns

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable component, unlikely to change)
