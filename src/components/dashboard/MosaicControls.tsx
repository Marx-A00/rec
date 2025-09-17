'use client';

import React, { FC } from 'react';
import { Edit, Plus, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MosaicControlsProps {
  isEditMode: boolean;
  onToggleEdit: () => void;
  onAddTile: () => void;
  onSave: () => void;
  className?: string;
}

export const MosaicControls: FC<MosaicControlsProps> = ({
  isEditMode,
  onToggleEdit,
  onAddTile,
  onSave,
  className
}) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {isEditMode ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddTile}
            className="text-zinc-400 hover:text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Tile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            className="text-zinc-400 hover:text-white"
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleEdit}
            className="text-red-400 hover:text-red-300"
          >
            <X className="w-4 h-4 mr-1" />
            Exit Edit
          </Button>
        </>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleEdit}
          className="text-zinc-400 hover:text-white"
        >
          <Edit className="w-4 h-4 mr-1" />
          Edit Dashboard
        </Button>
      )}
    </div>
  );
};

export default MosaicControls;