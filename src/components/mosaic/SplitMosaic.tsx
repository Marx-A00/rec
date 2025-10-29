'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import {
  Plus,
  X,
  Maximize2,
  Minimize2,
  Columns,
  Rows,
  ChevronDown,
} from 'lucide-react';

import { SplitNode, SplitDirection, PanelContent } from '@/types/split-mosaic';
import {
  panelRegistry,
  getAllPanelDefinitions,
} from '@/lib/dashboard/PanelRegistry';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import PanelSelector from './PanelSelector';

interface SplitMosaicProps {
  root: SplitNode | null;
  isEditMode: boolean;
  onLayoutChange: (root: SplitNode | null) => void;
  onSplitPanel: (
    panelId: string,
    direction: SplitDirection,
    newPanel: PanelContent
  ) => void;
  onRemovePanel: (panelId: string) => void;
}

interface PanelProps {
  node: SplitNode;
  isEditMode: boolean;
  onSplit: (direction: SplitDirection, newPanel: PanelContent) => void;
  onRemove: () => void;
  onChangeType: (newType: string) => void;
}

const Panel: React.FC<PanelProps> = ({
  node,
  isEditMode,
  onSplit,
  onRemove,
  onChangeType,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showPanelSelector, setShowPanelSelector] = useState(false);
  const [pendingSplit, setPendingSplit] = useState<SplitDirection | null>(null);

  const handleSplitClick = (direction: SplitDirection) => {
    setPendingSplit(direction);
    setShowPanelSelector(true);
  };

  const handlePanelSelect = (panelType: string) => {
    if (pendingSplit) {
      const newPanel: PanelContent = {
        id: `panel-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        type: panelType,
        title: panelRegistry.get(panelType as any)?.displayName || panelType,
      };
      onSplit(pendingSplit, newPanel);
    }
    setShowPanelSelector(false);
    setPendingSplit(null);
  };

  if (!node.content) return null;

  const PanelComponent = panelRegistry.get(node.content.type as any)?.component;
  if (!PanelComponent) {
    return (
      <div className='h-full bg-zinc-900/50 rounded-lg border border-zinc-800 p-4'>
        <p className='text-zinc-400'>Unknown panel type: {node.content.type}</p>
      </div>
    );
  }

  return (
    <div className={`relative h-full bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden transition-all duration-200 ${isEditMode ? 'group' : ''}`}>
      {/* Edit Mode Controls */}
      {isEditMode && (
        <div className='absolute top-2 right-2 z-10 flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity'>
          {/* Split Horizontal */}
          <button
            onClick={() => handleSplitClick('horizontal')}
            className='p-1.5 rounded bg-zinc-800/80 hover:bg-zinc-700 transition-colors'
            title='Split Horizontal'
          >
            <Rows className='w-4 h-4 text-zinc-400' />
          </button>

          {/* Split Vertical */}
          <button
            onClick={() => handleSplitClick('vertical')}
            className='p-1.5 rounded bg-zinc-800/80 hover:bg-zinc-700 transition-colors'
            title='Split Vertical'
          >
            <Columns className='w-4 h-4 text-zinc-400' />
          </button>

          {/* Maximize/Minimize */}
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className='p-1.5 rounded bg-zinc-800/80 hover:bg-zinc-700 transition-colors'
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <Minimize2 className='w-4 h-4 text-zinc-400' />
            ) : (
              <Maximize2 className='w-4 h-4 text-zinc-400' />
            )}
          </button>

          {/* Remove */}
          <button
            onClick={onRemove}
            className='p-1.5 rounded bg-zinc-800/80 hover:bg-red-900 transition-colors'
            title='Remove Panel'
          >
            <X className='w-4 h-4 text-zinc-400 hover:text-red-400' />
          </button>
        </div>
      )}

      {/* Panel Title with Dropdown */}
      {node.content.title && (
        <div className='absolute top-2 left-2 z-10'>
          {isEditMode ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className='flex items-center gap-1 px-2 py-1 bg-zinc-800/80 hover:bg-zinc-700/80 rounded text-sm text-zinc-300 transition-colors'>
                  {node.content.title}
                  <ChevronDown className='w-3 h-3' />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='w-48 bg-zinc-800 border-zinc-700'>
                {getAllPanelDefinitions().map(panelDef => (
                  <DropdownMenuItem
                    key={panelDef.type}
                    onClick={() => onChangeType(panelDef.type)}
                    className='text-zinc-300 hover:bg-zinc-700 hover:text-white focus:bg-zinc-700 focus:text-white'
                  >
                    {panelDef.displayName}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className='px-2 py-1 bg-zinc-800/80 rounded text-sm text-zinc-300'>
              {node.content.title}
            </div>
          )}
        </div>
      )}

      {/* Panel Content */}
      <div className={`h-full ${isEditMode ? 'pt-12' : 'pt-8'} p-4`}>
        <PanelComponent
          panelId={node.id}
          config={node.content.config || {}}
          isEditMode={isEditMode}
        />
      </div>

      {/* Panel Selector Modal */}
      {showPanelSelector && (
        <PanelSelector
          onSelect={handlePanelSelect}
          onClose={() => {
            setShowPanelSelector(false);
            setPendingSplit(null);
          }}
        />
      )}
    </div>
  );
};

const SplitMosaic: React.FC<SplitMosaicProps> = ({
  root,
  isEditMode,
  onLayoutChange,
  onSplitPanel,
  onRemovePanel,
}) => {
  const [showInitialPanelSelector, setShowInitialPanelSelector] =
    useState(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleResize = useCallback(
    (sizes: number[], nodeId: string) => {
      // Clear any existing timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      // Debounce the resize update to prevent infinite loops
      resizeTimeoutRef.current = setTimeout(() => {
        if (!root) return;

        const updateSizes = (node: SplitNode): SplitNode => {
          if (node.id === nodeId && node.type === 'split') {
            return { ...node, sizes };
          }
          if (node.children) {
            return {
              ...node,
              children: node.children.map(updateSizes),
            };
          }
          return node;
        };

        onLayoutChange(updateSizes(root));
      }, 50); // 50ms debounce
    },
    [root, onLayoutChange]
  );

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  const renderNode = useCallback(
    (node: SplitNode): React.ReactNode => {
      if (node.type === 'panel') {
        return (
          <Panel
            key={node.id}
            node={node}
            isEditMode={isEditMode}
            onSplit={(direction, newPanel) => {
              onSplitPanel(node.id, direction, newPanel);
            }}
            onRemove={() => onRemovePanel(node.id)}
            onChangeType={newType => {
              if (node.content) {
                const updatedPanel: PanelContent = {
                  ...node.content,
                  type: newType,
                  title:
                    panelRegistry.get(newType as any)?.displayName || newType,
                };
                // Update the node in the root tree
                if (!root) return;
                const updateNodeType = (currentNode: SplitNode): SplitNode => {
                  if (currentNode.id === node.id) {
                    return { ...currentNode, content: updatedPanel };
                  }
                  if (currentNode.children) {
                    return {
                      ...currentNode,
                      children: currentNode.children.map(updateNodeType),
                    };
                  }
                  return currentNode;
                };
                onLayoutChange(updateNodeType(root));
              }
            }}
          />
        );
      }

      // Split node
      if (node.children && node.children.length > 0) {
        return (
          <Allotment
            key={node.id}
            vertical={node.direction === 'horizontal'}
            proportionalLayout={false}
            onChange={sizes => handleResize(sizes, node.id)}
            defaultSizes={node.sizes}
          >
            {node.children.map(child => (
              <Allotment.Pane
                key={child.id}
                minSize={child.minSize || 100}
                maxSize={child.maxSize}
              >
                {renderNode(child)}
              </Allotment.Pane>
            ))}
          </Allotment>
        );
      }

      return null;
    },
    [isEditMode, onSplitPanel, onRemovePanel, handleResize]
  );

  // Empty state
  if (!root) {
    return (
      <>
        <div className='h-full flex items-center justify-center bg-zinc-900/50 rounded-lg border-2 border-dashed border-zinc-800'>
          <div className='text-center'>
            <Plus className='w-12 h-12 text-zinc-600 mx-auto mb-4' />
            <p className='text-zinc-400 mb-4'>No panels yet</p>
            {isEditMode && (
              <button
                onClick={() => setShowInitialPanelSelector(true)}
                className='px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors'
              >
                Add First Panel
              </button>
            )}
          </div>
        </div>

        {/* Initial Panel Selector */}
        {showInitialPanelSelector && (
          <PanelSelector
            onSelect={panelType => {
              const newPanel: PanelContent = {
                id: `panel-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                type: panelType,
                title:
                  panelRegistry.get(panelType as any)?.displayName || panelType,
              };
              const newRoot: SplitNode = {
                id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                type: 'panel',
                content: newPanel,
              };
              onLayoutChange(newRoot);
              setShowInitialPanelSelector(false);
            }}
            onClose={() => setShowInitialPanelSelector(false)}
          />
        )}
      </>
    );
  }

  return <div className='h-full'>{renderNode(root)}</div>;
};

export default SplitMosaic;
