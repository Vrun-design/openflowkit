import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Layout,
  Sparkles,
  Trash2,
  Workflow,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Tooltip } from './Tooltip';
import { ToolbarAddMenu } from './toolbar/ToolbarAddMenu';
import { ToolbarHistoryControls } from './toolbar/ToolbarHistoryControls';
import { ToolbarModeControls } from './toolbar/ToolbarModeControls';

interface ToolbarProps {
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  onToggleSelectMode: () => void;
  isSelectMode: boolean;
  onTogglePanMode: () => void;
  onCommandBar: () => void;
  isCommandBarOpen: boolean;
  onDesignSystemPanel: () => void;
  isDesignSystemPanelOpen: boolean;
  onAddNode: (position: { x: number, y: number }) => void;
  onAddAnnotation: (position: { x: number, y: number }) => void;
  onAddSection: (position: { x: number, y: number }) => void;
  onAddText: (position: { x: number, y: number }) => void;
  onAddImage: (imageUrl: string, position: { x: number, y: number }) => void;
  onAddWireframes: () => void;
  onTemplates: () => void;
  onLayout: () => void;

  onClear: () => void;
  getCenter: () => { x: number, y: number };
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  onToggleSelectMode,
  isSelectMode,
  onTogglePanMode,
  onCommandBar,
  isCommandBarOpen,
  onDesignSystemPanel,
  isDesignSystemPanelOpen,
  onAddNode,
  onAddAnnotation,
  onAddSection,
  onAddText,
  onAddImage,
  onAddWireframes,
  onTemplates,
  onLayout,

  onClear,
  getCenter
}) => {
  const { t } = useTranslation();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Close add menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as globalThis.Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Interaction guard: If command bar is open, disable all toolbar interactions
  const isInteractive = !isCommandBarOpen;

  const containerClasses = `flex items-center p-1.5 bg-white/90 backdrop-blur-xl shadow-2xl rounded-[var(--radius-lg)] border border-white/20 ring-1 ring-black/5 transition-all duration-300 ${!isInteractive ? 'opacity-50 pointer-events-none grayscale' : ''}`;

  return (
    <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-40 ${containerClasses}`}>
      {/* Group 1: Tools */}
      <ToolbarModeControls
        isInteractive={isInteractive}
        isSelectMode={isSelectMode}
        onToggleSelectMode={onToggleSelectMode}
        onTogglePanMode={onTogglePanMode}
      />

      <div className="w-px h-6 bg-slate-200/50 mx-2" />

      {/* Group 2: Actions */}
      <div className="flex items-center gap-1">
        <Tooltip text={t('toolbar.flowpilot')}>
          <Button
            onClick={onCommandBar}
            disabled={!isInteractive}
            variant="ghost"
            size="icon"
            className={`h-9 w-9 transition-all group relative overflow-hidden ${isCommandBarOpen ? 'bg-[var(--brand-primary-50)] text-[var(--brand-primary)] ring-1 ring-[var(--brand-primary-200)]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <Sparkles className={`w-4 h-4 transition-transform ${isCommandBarOpen ? 'scale-110' : 'group-hover:scale-110'}`} />
          </Button>
        </Tooltip>

        <Tooltip text={t('toolbar.templates')}>
          <Button
            onClick={onTemplates}
            disabled={!isInteractive}
            variant="ghost"
            size="icon"
            className="rounded-[var(--radius-sm)] h-9 w-9 text-slate-500 hover:text-slate-900"
            icon={<Layout className="w-4 h-4" />}
          />
        </Tooltip>

        <div ref={addMenuRef}>
          <ToolbarAddMenu
            isInteractive={isInteractive}
            showAddMenu={showAddMenu}
            onToggleMenu={() => setShowAddMenu(!showAddMenu)}
            onCloseMenu={() => setShowAddMenu(false)}
            onAddNode={onAddNode}
            onAddAnnotation={onAddAnnotation}
            onAddSection={onAddSection}
            onAddText={onAddText}
            onAddImage={onAddImage}
            onAddWireframes={onAddWireframes}
            getCenter={getCenter}
          />
        </div>

        <Tooltip text={t('toolbar.autoLayout')}>
          <Button
            onClick={() => onLayout()}
            disabled={!isInteractive}
            variant="ghost"
            size="icon"
            className="rounded-[var(--radius-sm)] h-9 w-9 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
            icon={<Workflow className="w-4 h-4" />}
          />
        </Tooltip>

        <Tooltip text={t('toolbar.clearCanvas')}>
          <Button
            onClick={onClear}
            disabled={!isInteractive}
            variant="ghost"
            size="icon"
            className="rounded-[var(--radius-sm)] h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50"
            icon={<Trash2 className="w-4 h-4" />}
          />
        </Tooltip>
      </div>

      <div className="w-px h-6 bg-slate-200/50 mx-2" />

      {/* Group 3: History */}
      <ToolbarHistoryControls
        isInteractive={isInteractive}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
      />

    </div>
  );
};
