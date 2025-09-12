// src/components/dashboard/PanelWrapper.tsx
'use client';

import React from 'react';
import { X, Settings, GripVertical } from 'lucide-react';
import { Panel, PanelComponentProps } from '@/types/dashboard';
import { useDashboard } from '@/contexts/DashboardContext';
import { getPanelDefinition } from '@/lib/dashboard/PanelRegistry';
import { Button } from '@/components/ui/button';

interface PanelWrapperProps {
  panel: Panel;
  children?: React.ReactNode;
}

export default function PanelWrapper({ panel, children }: PanelWrapperProps) {
  const { state, actions } = useDashboard();
  const { isEditMode, selectedPanelId } = state;
  const panelDefinition = getPanelDefinition(panel.type);
  
  const isSelected = selectedPanelId === panel.id;
  const showHeader = panel.config.showHeader !== false;

  if (!panelDefinition) {
    return (
      <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
        <p className="text-red-400">
          Unknown panel type: {panel.type}
        </p>
      </div>
    );
  }

  const handleRemovePanel = () => {
    actions.removePanel(panel.id);
  };

  const handleSelectPanel = () => {
    if (isEditMode) {
      actions.selectPanel(isSelected ? null : panel.id);
    }
  };

  const handleConfigChange = (newConfig: Panel['config']) => {
    actions.updatePanelConfig(panel.id, newConfig);
  };

  // Render the actual panel component
  const PanelComponent = panelDefinition.component;
  const panelProps: PanelComponentProps = {
    panelId: panel.id,
    config: panel.config,
    isEditMode,
    onConfigChange: handleConfigChange,
    onRemove: handleRemovePanel,
  };

  return (
    <div 
      className={`
        relative h-full flex flex-col group
        ${isEditMode ? 'border-2 border-dashed border-zinc-700 hover:border-zinc-600' : ''}
        ${isSelected ? 'border-emeraled-green' : ''}
        transition-all duration-200
      `}
      onClick={handleSelectPanel}
    >
      {/* Edit Mode Overlay */}
      {isEditMode && (
        <div className="absolute inset-0 bg-black/20 z-10 pointer-events-none" />
      )}

      {/* Panel Header - Show on hover in both normal and edit mode */}
      <div className={`
        absolute top-0 left-0 right-0 flex items-center justify-between p-3 z-20
        opacity-0 group-hover:opacity-100 transition-opacity duration-200
        ${isEditMode ? 'bg-zinc-800/80 border-b border-zinc-700 pointer-events-auto' : 'bg-zinc-900/90 pointer-events-none'}
      `}>
          {/* Left side - Drag handle */}
          <div className="flex items-center gap-2 w-20">
            {isEditMode && (
              <div className="cursor-grab hover:cursor-grabbing">
                <GripVertical className="w-4 h-4 text-zinc-400" />
              </div>
            )}
          </div>

          {/* Center - Title */}
          <div className="flex-1 flex justify-center">
            <h3 className="text-sm font-medium text-white">
              {panel.config.headerTitle || panelDefinition.displayName}
            </h3>
          </div>

          {/* Right side - Edit controls */}
          <div className="flex items-center gap-1 w-20 justify-end">
            {isEditMode && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-zinc-700 pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Open panel settings modal
                    console.log('Open settings for panel:', panel.id);
                  }}
                >
                  <Settings className="w-3 h-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-red-600/20 text-red-400 pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePanel();
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </div>

      {/* Panel Content */}
      <div className={`
        flex-1 overflow-hidden
        ${isEditMode ? 'relative z-10' : ''}
      `}>
        {children || <PanelComponent {...panelProps} />}
      </div>

      {/* Selection indicator */}
      {isEditMode && isSelected && (
        <div className="absolute inset-0 border-2 border-emeraled-green rounded-lg pointer-events-none z-30" />
      )}
    </div>
  );
}
