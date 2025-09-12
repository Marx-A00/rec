// src/components/dashboard/DashboardHeaderControls.tsx
'use client';

import React from 'react';
import { Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardHeaderControlsProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onShowWidgetLibrary: () => void;
}

export default function DashboardHeaderControls({
  isEditMode,
  onToggleEditMode,
  onShowWidgetLibrary,
}: DashboardHeaderControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Edit Mode Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleEditMode}
        className={`
          h-8 px-3 transition-all duration-200
          ${isEditMode 
            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30' 
            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
          }
        `}
        title={isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
      >
        <Settings className="w-4 h-4 mr-2" />
        {isEditMode ? 'Exit Edit' : 'Edit'}
      </Button>

      {/* Add Panel Button - Only show in edit mode */}
      {isEditMode && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowWidgetLibrary}
          className="h-8 px-3 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30"
          title="Add Panel"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Panel
        </Button>
      )}
    </div>
  );
}
