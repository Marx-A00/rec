'use client';

interface FeedTabsProps {
  activeTab: 'all' | 'following';
  onTabChange: (tab: 'all' | 'following') => void;
  followingCount?: number;
  className?: string;
}

export default function FeedTabs({
  activeTab,
  onTabChange,
  followingCount = 0,
  className = '',
}: FeedTabsProps) {
  return (
    <div
      className={`flex space-x-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 ${className}`}
    >
      <button
        onClick={() => onTabChange('all')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 ${
          activeTab === 'all'
            ? 'bg-emeraled-green text-black'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
        }`}
      >
        All Recommendations
      </button>
      <button
        onClick={() => onTabChange('following')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 ${
          activeTab === 'following'
            ? 'bg-emeraled-green text-black'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
        }`}
      >
        Following
        {followingCount > 0 && (
          <span
            className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'following'
                ? 'bg-black/20 text-black'
                : 'bg-zinc-700 text-zinc-300'
            }`}
          >
            {followingCount}
          </span>
        )}
      </button>
    </div>
  );
}
