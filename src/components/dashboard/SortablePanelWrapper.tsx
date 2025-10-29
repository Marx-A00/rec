// src/components/dashboard/SortablePanelWrapper.tsx
'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  X,
  Settings,
  GripVertical,
  Ungroup,
  ArrowRightLeft,
  ArrowUpDown,
} from 'lucide-react';

import { Panel, PanelComponentProps } from '@/types/mosaic';
import { useDashboard } from '@/contexts/DashboardContext';
import { getPanelDefinition } from '@/lib/dashboard/PanelRegistry';
import { Button } from '@/components/ui/button';

import PanelDropZones, { DropZoneType } from './PanelDropZones';

interface SortablePanelWrapperProps {
  panel: Panel;
  children?: React.ReactNode;
  isDragActive?: boolean;
}

export default function SortablePanelWrapper({
  panel,
  children,
  isDragActive = false,
}: SortablePanelWrapperProps) {
  const { state, actions } = useDashboard();
  const { isEditMode, selectedPanelId } = state;
  const panelDefinition = getPanelDefinition(panel.type);
  const [previewZone, setPreviewZone] = React.useState<DropZoneType | null>(
    null
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: panel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSelected = selectedPanelId === panel.id;
  const showHeader = panel.config.showHeader !== false;

  if (!panelDefinition) {
    return (
      <div className='bg-red-900/20 border border-red-600 rounded-lg p-4'>
        <p className='text-red-400'>Unknown panel type: {panel.type}</p>
      </div>
    );
  }

  const handleRemovePanel = () => {
    actions.removePanel(panel.id);
  };

  const handleUngroupPanel = () => {
    actions.ungroupPanel(panel.id);
  };

  const handleCreateHorizontalGroup = () => {
    // Find the next available panel to group with
    const otherPanels = state.layout.panels.filter(p => p.id !== panel.id);
    if (otherPanels.length > 0) {
      actions.createGroup([panel.id, otherPanels[0].id], 'horizontal');
      actions.selectPanel(null); // Clear selection
    }
  };

  const handleCreateVerticalGroup = () => {
    // Find the next available panel to group with
    const otherPanels = state.layout.panels.filter(p => p.id !== panel.id);
    if (otherPanels.length > 0) {
      actions.createGroup([panel.id, otherPanels[0].id], 'vertical');
      actions.selectPanel(null); // Clear selection
    }
  };

  const handleDropZonePreview = (zone: DropZoneType | null) => {
    setPreviewZone(zone);
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
      ref={setNodeRef}
      style={style}
      className={`
        relative h-full flex flex-col ${isEditMode ? 'group' : ''}
        ${isEditMode ? 'border-2 border-dashed border-zinc-700 hover:border-zinc-600' : ''}
        ${isSelected ? 'border-emerald-500' : ''}
        ${isDragging ? 'opacity-30 scale-95' : ''}
        ${isDragActive ? 'transition-none' : 'transition-all duration-200'}
      `}
      onClick={isEditMode ? handleSelectPanel : undefined}
      {...(isEditMode ? attributes : {})}
    >
      {/* Edit Mode Overlay */}
      {isEditMode && (
        <div className='absolute inset-0 bg-black/20 z-10 pointer-events-none' />
      )}

      {/* Panel Header - Show on hover only in edit mode */}
      {isEditMode && (
        <div
          className={`
          absolute top-0 left-0 right-0 flex items-center justify-between p-3 z-20
          opacity-0 group-hover:opacity-100 transition-opacity duration-200
          bg-zinc-800/80 border-b border-zinc-700 pointer-events-auto
        `}
        >
        {/* Left side - Drag handle */}
        <div className='flex items-center gap-2 w-24'>
          {isEditMode && (
            <div
              className='cursor-grab hover:cursor-grabbing pointer-events-auto'
              {...listeners}
            >
              <GripVertical className='w-4 h-4 text-zinc-400' />
            </div>
          )}
        </div>

        {/* Center - Title */}
        <div className='flex-1 flex justify-center'>
          <h3 className='text-sm font-medium text-white'>
            {panel.config.headerTitle || panelDefinition.displayName}
          </h3>
        </div>

        {/* Right side - Edit controls */}
        <div className='flex items-center gap-1 w-24 justify-end'>
          {isEditMode && (
            <>
              <Button
                variant='ghost'
                size='sm'
                className='h-6 w-6 p-0 hover:bg-blue-600/20 text-blue-400 pointer-events-auto'
                onClick={e => {
                  e.stopPropagation();
                  handleUngroupPanel();
                }}
                title='Move to main layout'
              >
                <Ungroup className='w-3 h-3' />
              </Button>

              <Button
                variant='ghost'
                size='sm'
                className='h-6 w-6 p-0 hover:bg-zinc-700 pointer-events-auto'
                onClick={e => {
                  e.stopPropagation();
                  // TODO: Open panel settings modal
                  console.log('Open settings for panel:', panel.id);
                }}
              >
                <Settings className='w-3 h-3' />
              </Button>

              <Button
                variant='ghost'
                size='sm'
                className='h-6 w-6 p-0 hover:bg-red-600/20 text-red-400 pointer-events-auto'
                onClick={e => {
                  e.stopPropagation();
                  handleRemovePanel();
                }}
              >
                <X className='w-3 h-3' />
              </Button>
            </>
          )}
        </div>
        </div>
      )}

      {/* Panel Content */}
      <div
        className={`
        flex-1 overflow-hidden
        ${isEditMode ? 'relative z-10' : ''}
      `}
      >
        {children || <PanelComponent {...panelProps} />}
      </div>

      {/* Selection indicator */}
      {isEditMode && isSelected && (
        <div className='absolute inset-0 border-2 border-emerald-500 rounded-lg pointer-events-none z-30' />
      )}

      {/* Drag overlay - shown when this panel is being dragged */}
      {isDragging && (
        <div className='absolute inset-0 bg-emerald-500/10 border-2 border-dashed border-emerald-500/30 rounded-lg pointer-events-none z-40'>
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='bg-emerald-500/20 rounded-full px-3 py-1'>
              <span className='text-emerald-300 text-xs font-medium'>
                Dragging...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Drop Zones - Show when dragging is active and this panel is not being dragged */}
      {isEditMode && isDragActive && !isDragging && (
        <PanelDropZones
          panelId={panel.id}
          isActive={true}
          onPreview={handleDropZonePreview}
        />
      )}

      {/* Group Creation Controls - Show when panel is selected */}
      {isEditMode && isSelected && (
        <div className='absolute bottom-2 left-2 right-2 flex gap-2 justify-center z-30'>
          <Button
            variant='ghost'
            size='sm'
            className='h-8 px-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30'
            onClick={e => {
              e.stopPropagation();
              handleCreateHorizontalGroup();
            }}
          >
            <ArrowRightLeft className='w-3 h-3 mr-1' />
            Horizontal Group
          </Button>

          <Button
            variant='ghost'
            size='sm'
            className='h-8 px-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30'
            onClick={e => {
              e.stopPropagation();
              handleCreateVerticalGroup();
            }}
          >
            <ArrowUpDown className='w-3 h-3 mr-1' />
            Vertical Group
          </Button>
        </div>
      )}
    </div>
  );
}
