'use client';

import React from 'react';
import {
  X,
  TrendingUp,
  Users,
  Music,
  BarChart3,
  Activity,
  Library,
  Radio,
  Heart,
  Clock,
  Star,
} from 'lucide-react';

import { PanelDefinition } from '@/types/mosaic';
import { getAllPanelDefinitions } from '@/lib/dashboard/PanelRegistry';

interface PanelSelectorProps {
  onSelect: (panelType: string) => void;
  onClose: () => void;
}

// Panel type configurations with icons and descriptions
const panelConfigs = {
  'quick-stats': {
    icon: TrendingUp,
    name: 'Quick Stats',
    description: 'Overview of your music activity',
    color: 'text-emerald-400',
  },
  recommendations: {
    icon: Star,
    name: 'Recommendations',
    description: 'Personalized music recommendations',
    color: 'text-yellow-400',
  },
  'social-feed': {
    icon: Users,
    name: 'Social Feed',
    description: 'Activity from people you follow',
    color: 'text-blue-400',
  },
  'recent-albums': {
    icon: Clock,
    name: 'Recent Albums',
    description: 'Your recently played albums',
    color: 'text-purple-400',
  },
  'listening-history': {
    icon: Activity,
    name: 'Listening History',
    description: 'Track your listening patterns',
    color: 'text-pink-400',
  },
  'genre-distribution': {
    icon: BarChart3,
    name: 'Genre Distribution',
    description: 'Breakdown of your music tastes',
    color: 'text-orange-400',
  },
  'collection-overview': {
    icon: Library,
    name: 'Collection Overview',
    description: 'Your music collection stats',
    color: 'text-indigo-400',
  },
  'now-playing': {
    icon: Radio,
    name: 'Now Playing',
    description: 'Currently playing track',
    color: 'text-red-400',
  },
  favorites: {
    icon: Heart,
    name: 'Favorites',
    description: 'Your favorite albums',
    color: 'text-rose-400',
  },
  discovery: {
    icon: Music,
    name: 'Discovery',
    description: 'Discover new music',
    color: 'text-teal-400',
  },
};

export default function PanelSelector({
  onSelect,
  onClose,
}: PanelSelectorProps) {
  const allPanels = getAllPanelDefinitions();

  return (
    <div
      className='fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4'
      onClick={onClose}
    >
      <div
        className='bg-zinc-900 rounded-lg border border-zinc-800 w-full max-w-4xl max-h-[80vh] overflow-hidden'
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-zinc-800'>
          <h2 className='text-xl font-semibold text-white'>
            Select Panel Type
          </h2>
          <button
            onClick={onClose}
            className='p-2 rounded-lg hover:bg-zinc-800 transition-colors'
            aria-label='Close'
          >
            <X className='w-5 h-5 text-zinc-400' />
          </button>
        </div>

        {/* Panel Grid */}
        <div className='p-4 overflow-y-auto max-h-[calc(80vh-80px)]'>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {allPanels.map(panel => {
              const config = panelConfigs[
                panel.type as keyof typeof panelConfigs
              ] || {
                icon: Activity,
                name: panel.displayName,
                description: panel.description || 'Custom panel',
                color: 'text-zinc-400',
              };

              const Icon = config.icon;

              return (
                <button
                  key={panel.type}
                  onClick={() => onSelect(panel.type)}
                  className='group relative p-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 text-left'
                >
                  <div className='flex items-start gap-3'>
                    <div
                      className={`p-2 rounded-lg bg-zinc-900 ${config.color} group-hover:scale-110 transition-transform`}
                    >
                      <Icon className='w-5 h-5' />
                    </div>
                    <div className='flex-1'>
                      <h3 className='font-medium text-white mb-1'>
                        {config.name}
                      </h3>
                      <p className='text-sm text-zinc-400'>
                        {config.description}
                      </p>
                    </div>
                  </div>

                  {/* Hover overlay */}
                  <div className='absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none' />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
