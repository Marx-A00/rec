// src/components/dashboard/panels/RecommendationsPanel.tsx
'use client';

import { Suspense } from 'react';
import { PanelComponentProps } from '@/types/dashboard';
import RecommendationsList from '@/components/recommendations/RecommendationsList';

export default function RecommendationsPanel({ 
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
          <h2 className="text-lg font-semibold text-white">
            Recent Recommendations
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-zinc-700 rounded animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-700 rounded animate-pulse" />
                    <div className="h-3 bg-zinc-700 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-zinc-700 rounded animate-pulse w-1/2" />
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
            <div className="text-zinc-400">
              Loading recommendations...
            </div>
          }
        >
          <RecommendationsList title="" />
        </Suspense>
      </div>
    </div>
  );
}
