// src/components/dashboard/panels/ActivityFeedPanel.tsx
'use client';

import { Suspense } from 'react';
import { PanelComponentProps } from '@/types/dashboard';
import SocialActivityFeed from '@/components/feed/SocialActivityFeed';

export default function ActivityFeedPanel({ 
  panelId, 
  config, 
  isEditMode 
}: PanelComponentProps) {
  
  // Show preview content in edit mode
  if (isEditMode) {
    return (
      <div className="bg-zinc-900/50 p-6 h-full flex flex-col overflow-hidden">
        <div className="mb-3 flex-shrink-0">
          <p className="text-sm text-zinc-400 mb-2">Panel Preview</p>
          <h3 className="text-lg font-semibold text-white">
            Recent Activity
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-700/50">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-zinc-700 rounded-full animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-zinc-700 rounded animate-pulse w-3/4" />
                    <div className="h-2 bg-zinc-700 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 p-6 h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <Suspense
          fallback={
            <div className="text-zinc-400">Loading activity...</div>
          }
        >
          <SocialActivityFeed />
        </Suspense>
      </div>
    </div>
  );
}
