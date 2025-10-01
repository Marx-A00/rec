interface Activity {
  id: string;
  type: 'follow' | 'recommendation' | 'profile_update' | 'collection_add';
  actorId: string;
  actorName: string;
  actorImage: string | null;
  targetId?: string;
  targetName?: string;
  targetImage?: string | null;
  albumId?: string;
  albumTitle?: string;
  albumArtist?: string;
  albumImage?: string | null;
  createdAt: string;
  metadata?: any;
}

interface GroupedActivity {
  id: string;
  type: 'follow' | 'recommendation' | 'profile_update' | 'collection_add';
  actorId: string;
  actorName: string;
  actorImage: string | null;
  createdAt: string; // Latest activity timestamp
  earliestCreatedAt: string; // Earliest activity timestamp
  activities: Activity[]; // Individual activities in this group
  isGrouped: boolean;
}

// Time window in milliseconds (30 minutes)
const TIME_WINDOW = 30 * 60 * 1000;

export function groupActivities(activities: Activity[]): GroupedActivity[] {
  if (!activities || activities.length === 0) return [];

  const grouped: GroupedActivity[] = [];
  let currentGroup: Activity[] = [];
  let currentActor: string | null = null;
  let currentType: string | null = null;
  let groupStartTime: Date | null = null;

  for (const activity of activities) {
    const activityTime = new Date(activity.createdAt);

    // Check if this activity should be grouped with the previous ones
    const shouldGroup =
      currentActor === activity.actorId &&
      currentType === activity.type &&
      groupStartTime &&
      activityTime.getTime() - groupStartTime.getTime() <= TIME_WINDOW;

    if (shouldGroup) {
      // Add to current group
      currentGroup.push(activity);
    } else {
      // Process previous group if exists
      if (currentGroup.length > 0) {
        grouped.push(createGroupedActivity(currentGroup));
      }

      // Start new group
      currentGroup = [activity];
      currentActor = activity.actorId;
      currentType = activity.type;
      groupStartTime = activityTime;
    }
  }

  // Don't forget the last group
  if (currentGroup.length > 0) {
    grouped.push(createGroupedActivity(currentGroup));
  }

  return grouped;
}

function createGroupedActivity(activities: Activity[]): GroupedActivity {
  const latestActivity = activities[0];
  const earliestActivity = activities[activities.length - 1];

  return {
    id: `group-${latestActivity.actorId}-${latestActivity.type}-${Date.now()}`,
    type: latestActivity.type,
    actorId: latestActivity.actorId,
    actorName: latestActivity.actorName,
    actorImage: latestActivity.actorImage,
    createdAt: latestActivity.createdAt,
    earliestCreatedAt: earliestActivity.createdAt,
    activities: activities,
    isGrouped: activities.length > 1,
  };
}

// Helper to format time range for grouped activities
export function formatActivityTimeRange(group: GroupedActivity): string {
  if (!group.isGrouped) {
    return formatTimeAgo(group.createdAt);
  }

  const latest = new Date(group.createdAt);
  const earliest = new Date(group.earliestCreatedAt);
  const diffMinutes = Math.round(
    (latest.getTime() - earliest.getTime()) / (1000 * 60)
  );

  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `over ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  } else {
    const diffHours = Math.round(diffMinutes / 60);
    return `over ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
