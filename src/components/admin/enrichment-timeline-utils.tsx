/**
 * Utility functions for mapping EnrichmentLog data to timeline component props.
 * Used by EnrichmentTimeline to convert database records to UI components.
 */

import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Cloud,
  Database,
  Disc,
  Eye,
  Music,
  Search,
  SkipForward,
  User,
} from 'lucide-react';

import type { TimelineLayoutItem } from '@/components/ui/timeline';
import { EnrichmentLogStatus, type EnrichmentLog } from '@/generated/graphql';

// ============================================================================
// Type Definitions
// ============================================================================

/** Status values for timeline items */
export type TimelineStatus = 'completed' | 'in-progress' | 'pending';

/** Color variants for timeline icons */
export type TimelineIconColor =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'accent'
  | 'success'
  | 'error'
  | 'warning';

// ============================================================================
// Status Mapping
// ============================================================================

/**
 * Maps EnrichmentLogStatus to timeline status.
 *
 * @param status - The EnrichmentLog status value
 * @returns Timeline status for rendering
 */
export function mapEnrichmentStatus(
  status: EnrichmentLogStatus
): TimelineStatus {
  switch (status) {
    case EnrichmentLogStatus.Success:
    case EnrichmentLogStatus.PartialSuccess:
    case EnrichmentLogStatus.Failed:
    case EnrichmentLogStatus.NoDataAvailable:
    case EnrichmentLogStatus.Skipped:
      return 'completed';
    case EnrichmentLogStatus.Preview:
      return 'pending';
    default:
      // Safeguard for unknown statuses
      return 'in-progress';
  }
}

/**
 * Maps EnrichmentLogStatus to timeline icon color.
 *
 * @param status - The EnrichmentLog status value
 * @returns Color variant for the timeline icon
 */
export function getStatusColor(status: EnrichmentLogStatus): TimelineIconColor {
  switch (status) {
    case EnrichmentLogStatus.Success:
      return 'success'; // green
    case EnrichmentLogStatus.PartialSuccess:
      return 'warning'; // amber
    case EnrichmentLogStatus.Failed:
      return 'error'; // red
    case EnrichmentLogStatus.NoDataAvailable:
    case EnrichmentLogStatus.Skipped:
      return 'muted'; // gray
    case EnrichmentLogStatus.Preview:
      return 'accent'; // preview state
    default:
      return 'muted';
  }
}

// ============================================================================
// Operation Icons
// ============================================================================

/**
 * Icon mapping for enrichment operations.
 * Keys are operation strings from JOB_TYPES.
 */
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
  'musicbrainz:search-releases': Search,
  'musicbrainz:search-recordings': Search,
  'musicbrainz:lookup-artist': Database,
  'musicbrainz:lookup-release': Database,
  'musicbrainz:lookup-recording': Database,
  'musicbrainz:lookup-release-group': Database,
  'musicbrainz:browse-release-groups-by-artist': Database,

  // Sync operations
  'spotify:sync-new-releases': Database,
  'musicbrainz:sync-new-releases': Database,

  // Preview operations
  PREVIEW_ENRICHMENT: Eye,
};

/**
 * Status-specific icons (override operation icons for certain statuses)
 */
const STATUS_ICONS: Partial<Record<EnrichmentLogStatus, LucideIcon>> = {
  [EnrichmentLogStatus.Success]: CheckCircle,
  [EnrichmentLogStatus.Failed]: AlertCircle,
  [EnrichmentLogStatus.Skipped]: SkipForward,
  [EnrichmentLogStatus.Preview]: Eye,
  [EnrichmentLogStatus.NoDataAvailable]: Clock,
};

/**
 * Gets the appropriate icon for an enrichment operation.
 *
 * @param operation - The operation string from EnrichmentLog
 * @param status - Optional status to determine status-specific icons
 * @returns The Lucide icon component
 */
export function getOperationIcon(
  operation: string,
  status?: EnrichmentLogStatus
): LucideIcon {
  // For certain statuses, prefer status-specific icons
  if (status && STATUS_ICONS[status]) {
    return STATUS_ICONS[status]!;
  }

  return OPERATION_ICONS[operation] ?? Database;
}

// ============================================================================
// Operation Formatting
// ============================================================================

/** Helper to capitalize first letter */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Helper to format action strings (hyphen-separated) */
function formatAction(action: string): string {
  return action.split('-').map(capitalize).join(' ');
}

/**
 * Formats an operation string into a human-readable title.
 *
 * @param operation - The operation string from EnrichmentLog
 * @param _entityType - Optional entity type for context (currently unused)
 * @returns Formatted operation title
 */
export function formatOperationTitle(
  operation: string,
  _entityType?: string | null
): string {
  // Handle preview operation specially
  if (operation === 'PREVIEW_ENRICHMENT') {
    return 'Preview Enrichment';
  }

  // Parse operation format: "category:entity-action" or "category:action"
  const parts = operation.split(':');

  if (parts.length !== 2) {
    // Fallback: capitalize and clean up
    return operation
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  const [category, action] = parts;

  // Format based on category
  switch (category) {
    case 'enrichment':
      return capitalize(action) + ' Enrichment';

    case 'check': {
      // check:album-enrichment -> Album Enrichment Check
      const checkTarget = action.replace('-enrichment', '');
      return capitalize(checkTarget) + ' Enrichment Check';
    }

    case 'cache': {
      // cache:album-cover-art -> Album Cover Art (cache)
      const cacheTarget = action.split('-').map(capitalize).join(' ');
      return cacheTarget + ' (cache)';
    }

    case 'discogs':
      // discogs:search-artist -> Discogs: Search Artist
      return 'Discogs: ' + formatAction(action);

    case 'musicbrainz':
      // musicbrainz:lookup-release -> MusicBrainz: Lookup Release
      return 'MusicBrainz: ' + formatAction(action);

    case 'spotify':
      // spotify:sync-new-releases -> Spotify: Sync New Releases
      return 'Spotify: ' + formatAction(action);

    default:
      // Generic fallback
      return capitalize(category) + ': ' + formatAction(action);
  }
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Truncates an error message for inline display.
 * Returns the first line of the error, truncated to maxLength.
 *
 * @param error - The error message string
 * @param maxLength - Maximum length before truncation (default: 100)
 * @returns Truncated error or undefined if no error
 */
export function truncateError(
  error: string | null | undefined,
  maxLength = 100
): string | undefined {
  if (!error) return undefined;

  // Get first line
  const firstLine = error.split('\n')[0].trim();

  if (firstLine.length <= maxLength) {
    return firstLine;
  }

  return firstLine.slice(0, maxLength - 3) + '...';
}

// ============================================================================
// Description Generation
// ============================================================================

/**
 * Generates a description string for a timeline item.
 *
 * @param log - Partial EnrichmentLog with reason, fieldsEnriched, status
 * @returns Description string
 */
export function getItemDescription(
  log: Pick<EnrichmentLog, 'reason' | 'fieldsEnriched' | 'status'>
): string {
  // If there is an explicit reason, use it
  if (log.reason) {
    return log.reason;
  }

  // For skipped items
  if (log.status === EnrichmentLogStatus.Skipped) {
    return 'Skipped - no changes needed';
  }

  // For no data available
  if (log.status === EnrichmentLogStatus.NoDataAvailable) {
    return 'No data found from sources';
  }

  // For items with enriched fields
  const fieldCount = log.fieldsEnriched?.length ?? 0;
  if (fieldCount > 0) {
    const fieldLabel = fieldCount === 1 ? 'field' : 'fields';
    return fieldCount + ' ' + fieldLabel + ' enriched';
  }

  // Default fallback based on status
  switch (log.status) {
    case EnrichmentLogStatus.Success:
      return 'Completed successfully';
    case EnrichmentLogStatus.PartialSuccess:
      return 'Partially completed';
    case EnrichmentLogStatus.Failed:
      return 'Operation failed';
    case EnrichmentLogStatus.Preview:
      return 'Preview pending application';
    default:
      return 'Processing';
  }
}

// ============================================================================
// Full Mapping Function
// ============================================================================

/**
 * Maps an EnrichmentLog record to a TimelineLayoutItem.
 *
 * @param log - The EnrichmentLog record from GraphQL
 * @returns TimelineLayoutItem for use with TimelineLayout component
 */
export function mapLogToTimelineItem(log: EnrichmentLog): TimelineLayoutItem {
  const Icon = getOperationIcon(log.operation, log.status);

  return {
    id: log.id,
    title: formatOperationTitle(log.operation, log.entityType),
    description: getItemDescription(log),
    date: log.createdAt,
    icon: <Icon className='h-4 w-4' />,
    iconColor: getStatusColor(log.status),
    status: mapEnrichmentStatus(log.status),
    loading: false,
    error: log.status === EnrichmentLogStatus.Failed,
    content: log.errorMessage ? truncateError(log.errorMessage) : undefined,
    children: log.children?.map(mapLogToTimelineItem),
  };
}
