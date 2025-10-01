// src/components/dashboard/MosaicHeaderControls.tsx
'use client';

import React from 'react';
import { Settings, Plus, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSplitMosaic } from '@/contexts/SplitMosaicContext';
import Toast from '@/components/ui/toast';

interface MosaicHeaderControlsProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onShowWidgetLibrary: () => void;
}

export default function MosaicHeaderControls({
  isEditMode,
  onToggleEditMode,
  onShowWidgetLibrary,
}: MosaicHeaderControlsProps) {
  const { actions } = useSplitMosaic();
  const [isSaving, setIsSaving] = React.useState(false);
  const [toast, setToast] = React.useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const handleSaveLayout = async () => {
    setIsSaving(true);
    try {
      actions.saveLayout();
      setToast({
        show: true,
        message: 'Layout saved successfully! 🎉',
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to save layout:', error);
      setToast({
        show: true,
        message: 'Failed to save layout. Please try again.',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetLayout = () => {
    if (confirm('Are you sure you want to reset the layout to default?')) {
      actions.resetLayout();
      setToast({
        show: true,
        message: 'Layout reset to default',
        type: 'success'
      });
    }
  };

  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.show}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
        duration={3000}
      />

      <div className="flex items-center gap-2">
      {/* Save Layout Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSaveLayout}
        disabled={isSaving}
        className="h-8 px-3 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
        title="Save Mosaic Layout"
      >
        <Save className="w-4 h-4 mr-2" />
        {isSaving ? 'Saving...' : 'Save Layout'}
      </Button>

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
        <>
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

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetLayout}
            className="h-8 px-3 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
            title="Reset Layout"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </>
      )}
      </div>
    </>
  );
}
