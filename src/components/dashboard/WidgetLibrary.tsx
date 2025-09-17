// src/components/dashboard/WidgetLibrary.tsx
'use client';

import React, { useState } from 'react';
import { X, Plus, Grip } from 'lucide-react';
import { useMosaic } from '@/contexts/MosaicContext';
import { getAllPanelDefinitions, getPanelsByCategory } from '@/lib/dashboard/PanelRegistry';
import { PanelDefinition } from '@/types/mosaic';
import { Button } from '@/components/ui/button';

interface WidgetLibraryProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WidgetLibrary({ isOpen, onClose }: WidgetLibraryProps) {
  const { actions } = useMosaic();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const allPanels = getAllPanelDefinitions();
  const categories = ['all', 'music', 'social', 'analytics', 'tools'];
  
  const filteredPanels = selectedCategory === 'all' 
    ? allPanels 
    : getPanelsByCategory(selectedCategory as PanelDefinition['category']);

  const handleAddPanel = (panelType: PanelDefinition['type']) => {
    actions.addTile(panelType);
    onClose(); // Close after adding
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed top-0 right-0 h-full w-80 bg-zinc-900 border-l border-zinc-700 z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-white">Widget Library</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Category Filter */}
        <div className="p-4 border-b border-zinc-700">
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`
                  px-3 py-1 rounded-full text-xs font-medium transition-colors
                  ${selectedCategory === category
                    ? 'bg-emeraled-green text-black'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }
                `}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Panel List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredPanels.map((panel) => (
            <div
              key={panel.type}
              className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 hover:border-zinc-600 transition-colors group"
            >
              {/* Panel Info */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-8 h-8 bg-zinc-700 rounded-lg flex items-center justify-center">
                  <panel.icon className="w-4 h-4 text-emeraled-green" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white mb-1">
                    {panel.displayName}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {panel.description}
                  </p>
                  
                  {/* Panel metadata */}
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`
                      text-xs px-2 py-0.5 rounded-full
                      ${panel.category === 'music' ? 'bg-blue-500/20 text-blue-400' :
                        panel.category === 'social' ? 'bg-purple-500/20 text-purple-400' :
                        panel.category === 'analytics' ? 'bg-green-500/20 text-green-400' :
                        'bg-orange-500/20 text-orange-400'
                      }
                    `}>
                      {panel.category}
                    </span>
                    
                    {panel.requiresAuth && (
                      <span className="text-xs text-zinc-500">
                        Requires sign-in
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Add Button */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAddPanel(panel.type)}
                  size="sm"
                  className="flex-1 bg-emeraled-green hover:bg-emeraled-green/90 text-black"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Panel
                </Button>
                
                {/* Drag Handle for future drag & drop */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab hover:cursor-grabbing"
                  title="Drag to add panel"
                >
                  <Grip className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-700">
          <p className="text-xs text-zinc-500 text-center">
            Click "Add Panel" to add widgets to your dashboard
          </p>
        </div>
      </div>
    </>
  );
}
