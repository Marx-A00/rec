// src/components/dashboard/PanelDropZones.tsx
'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface PanelDropZonesProps {
  panelId: string;
  isActive: boolean;
  onPreview: (zone: DropZoneType | null) => void;
}

export type DropZoneType = 'top' | 'bottom' | 'left' | 'right' | 'center';

interface DropZoneProps {
  id: string;
  type: DropZoneType;
  panelId: string;
  isActive: boolean;
  onEnter: () => void;
  onLeave: () => void;
}

function DropZone({
  id,
  type,
  panelId,
  isActive,
  onEnter,
  onLeave,
}: DropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      type: 'panel-drop-zone',
      zoneType: type,
      panelId,
    },
  });

  React.useEffect(() => {
    if (isOver) {
      onEnter();
    } else {
      onLeave();
    }
  }, [isOver, onEnter, onLeave]);

  const getZoneStyles = () => {
    const baseStyles =
      'absolute transition-all duration-200 pointer-events-auto';
    const activeStyles =
      isActive && isOver
        ? 'bg-emerald-500/20 border-2 border-emerald-500 border-dashed'
        : 'bg-transparent border-2 border-transparent';

    switch (type) {
      case 'top':
        return `${baseStyles} ${activeStyles} top-0 left-0 right-0 h-1/3`;
      case 'bottom':
        return `${baseStyles} ${activeStyles} bottom-0 left-0 right-0 h-1/3`;
      case 'left':
        return `${baseStyles} ${activeStyles} top-0 bottom-0 left-0 w-1/3`;
      case 'right':
        return `${baseStyles} ${activeStyles} top-0 bottom-0 right-0 w-1/3`;
      case 'center':
        return `${baseStyles} ${activeStyles} top-1/3 bottom-1/3 left-1/3 right-1/3`;
      default:
        return baseStyles;
    }
  };

  return <div ref={setNodeRef} className={getZoneStyles()} />;
}

export default function PanelDropZones({
  panelId,
  isActive,
  onPreview,
}: PanelDropZonesProps) {
  const [activeZone, setActiveZone] = React.useState<DropZoneType | null>(null);

  const handleZoneEnter = (zone: DropZoneType) => {
    setActiveZone(zone);
    onPreview(zone);
  };

  const handleZoneLeave = () => {
    setActiveZone(null);
    onPreview(null);
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className='absolute inset-0 pointer-events-none z-30'>
      {/* Top Zone - Creates vertical split above */}
      <DropZone
        id={`${panelId}-drop-top`}
        type='top'
        panelId={panelId}
        isActive={isActive}
        onEnter={() => handleZoneEnter('top')}
        onLeave={handleZoneLeave}
      />

      {/* Bottom Zone - Creates vertical split below */}
      <DropZone
        id={`${panelId}-drop-bottom`}
        type='bottom'
        panelId={panelId}
        isActive={isActive}
        onEnter={() => handleZoneEnter('bottom')}
        onLeave={handleZoneLeave}
      />

      {/* Left Zone - Creates horizontal split on left */}
      <DropZone
        id={`${panelId}-drop-left`}
        type='left'
        panelId={panelId}
        isActive={isActive}
        onEnter={() => handleZoneEnter('left')}
        onLeave={handleZoneLeave}
      />

      {/* Right Zone - Creates horizontal split on right */}
      <DropZone
        id={`${panelId}-drop-right`}
        type='right'
        panelId={panelId}
        isActive={isActive}
        onEnter={() => handleZoneEnter('right')}
        onLeave={handleZoneLeave}
      />

      {/* Center Zone - Replaces panel */}
      <DropZone
        id={`${panelId}-drop-center`}
        type='center'
        panelId={panelId}
        isActive={isActive}
        onEnter={() => handleZoneEnter('center')}
        onLeave={handleZoneLeave}
      />

      {/* Visual Preview Overlay - Show full split layout */}
      {activeZone && (
        <div className='absolute inset-0 pointer-events-none z-50'>
          {renderSplitPreview(activeZone)}
        </div>
      )}
    </div>
  );
}

function renderSplitPreview(zone: DropZoneType): React.ReactNode {
  const existingPanelStyles =
    'absolute bg-zinc-700/80 border-4 border-zinc-300 border-dashed rounded-lg transition-all duration-300 backdrop-blur-sm';
  const newPanelStyles =
    'absolute bg-blue-500/80 border-4 border-blue-200 border-dashed rounded-lg transition-all duration-300 backdrop-blur-sm';

  switch (zone) {
    case 'top':
      return (
        <>
          {/* New dragged panel - top half (FULL 50% height) */}
          <div
            className={`${newPanelStyles} top-0 left-0 right-0`}
            style={{ height: '50%' }}
          >
            <div className='absolute inset-0 flex items-center justify-center'>
              <span className='text-blue-100 font-semibold text-lg'>
                New Panel
              </span>
            </div>
          </div>
          {/* Existing panel - bottom half (FULL 50% height) */}
          <div
            className={`${existingPanelStyles} bottom-0 left-0 right-0`}
            style={{ height: '50%' }}
          >
            <div className='absolute inset-0 flex items-center justify-center'>
              <span className='text-zinc-200 font-semibold text-lg'>
                Current Panel
              </span>
            </div>
          </div>
        </>
      );
    case 'bottom':
      return (
        <>
          {/* Existing panel - top half (FULL 50% height) */}
          <div
            className={`${existingPanelStyles} top-0 left-0 right-0`}
            style={{ height: '50%' }}
          >
            <div className='absolute inset-0 flex items-center justify-center'>
              <span className='text-zinc-200 font-semibold text-lg'>
                Current Panel
              </span>
            </div>
          </div>
          {/* New dragged panel - bottom half (FULL 50% height) */}
          <div
            className={`${newPanelStyles} bottom-0 left-0 right-0`}
            style={{ height: '50%' }}
          >
            <div className='absolute inset-0 flex items-center justify-center'>
              <span className='text-blue-100 font-semibold text-lg'>
                New Panel
              </span>
            </div>
          </div>
        </>
      );
    case 'left':
      return (
        <>
          {/* New dragged panel - left half (FULL 50% width) */}
          <div
            className={`${newPanelStyles} top-0 bottom-0 left-0`}
            style={{ width: '50%' }}
          >
            <div className='absolute inset-0 flex items-center justify-center'>
              <span className='text-blue-100 font-semibold text-lg'>
                New Panel
              </span>
            </div>
          </div>
          {/* Existing panel - right half (FULL 50% width) */}
          <div
            className={`${existingPanelStyles} top-0 bottom-0 right-0`}
            style={{ width: '50%' }}
          >
            <div className='absolute inset-0 flex items-center justify-center'>
              <span className='text-zinc-200 font-semibold text-lg'>
                Current Panel
              </span>
            </div>
          </div>
        </>
      );
    case 'right':
      return (
        <>
          {/* Existing panel - left half (FULL 50% width) */}
          <div
            className={`${existingPanelStyles} top-0 bottom-0 left-0`}
            style={{ width: '50%' }}
          >
            <div className='absolute inset-0 flex items-center justify-center'>
              <span className='text-zinc-200 font-semibold text-lg'>
                Current Panel
              </span>
            </div>
          </div>
          {/* New dragged panel - right half (FULL 50% width) */}
          <div
            className={`${newPanelStyles} top-0 bottom-0 right-0`}
            style={{ width: '50%' }}
          >
            <div className='absolute inset-0 flex items-center justify-center'>
              <span className='text-blue-100 font-semibold text-lg'>
                New Panel
              </span>
            </div>
          </div>
        </>
      );
    case 'center':
      return (
        <>
          {/* New dragged panel replaces entirely */}
          <div className={`${newPanelStyles} inset-0`}>
            <div className='absolute inset-0 flex items-center justify-center'>
              <span className='text-blue-100 font-semibold text-lg'>
                Replacement Panel
              </span>
            </div>
          </div>
        </>
      );
    default:
      return null;
  }
}
