import React, { useState, useEffect, useRef } from 'react';
import {
  Undo2, Redo2, MousePointer2, Hand, Wand2, Plus,
  Square, StickyNote, Group, Type, Layout, Workflow,
  Trash2, Image as ImageIcon, Palette, Sparkles, X
} from 'lucide-react';
import { Button } from './ui/Button';
import { Tooltip } from './Tooltip';
import { Node as FlowNode, Edge } from 'reactflow';

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
  onTemplates,
  onLayout,

  onClear,
  getCenter
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        if (imageUrl) {
          onAddImage(imageUrl, getCenter());
          setShowAddMenu(false);
        }
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  };

  const containerClasses = `flex items-center p-1.5 bg-white/90 backdrop-blur-xl shadow-2xl rounded-[var(--radius-lg)] border border-white/20 ring-1 ring-black/5 transition-all duration-300 ${!isInteractive ? 'opacity-50 pointer-events-none grayscale' : ''}`;

  return (
    <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-40 ${containerClasses}`}>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleImageUpload}
      />

      {/* Group 1: Tools */}
      <div className="flex bg-slate-100/50 p-1 rounded-[var(--radius-md)] gap-0.5 border border-slate-200/60">
        <Tooltip text="Select Mode (V)">
          <Button
            onClick={onToggleSelectMode}
            disabled={!isInteractive}
            variant="ghost"
            size="icon"
            className={`h-8 w-8 transition-all ${isSelectMode ? 'bg-white shadow text-[var(--brand-primary)]' : 'text-slate-500 hover:text-slate-900'}`}
            icon={<MousePointer2 className="w-4 h-4" />}
          />
        </Tooltip>
        <Tooltip text="Pan Mode (H)">
          <Button
            onClick={onTogglePanMode}
            disabled={!isInteractive}
            variant="ghost"
            size="icon"
            className={`h-8 w-8 transition-all ${!isSelectMode ? 'bg-white shadow text-[var(--brand-primary)]' : 'text-slate-500 hover:text-slate-900'}`}
            icon={<Hand className="w-4 h-4" />}
          />
        </Tooltip>
      </div>

      <div className="w-px h-6 bg-slate-200/50 mx-2" />

      {/* Group 2: Actions */}
      <div className="flex items-center gap-1">
        <Tooltip text="Flowpilot (Cmd+K)">
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

        <Tooltip text="Templates">
          <Button
            onClick={onTemplates}
            disabled={!isInteractive}
            variant="ghost"
            size="icon"
            className="rounded-[var(--radius-sm)] h-9 w-9 text-slate-500 hover:text-slate-900"
            icon={<Layout className="w-4 h-4" />}
          />
        </Tooltip>

        <div className="relative" ref={addMenuRef}>
          <Tooltip text="Add Item">
            <Button
              onClick={() => setShowAddMenu(!showAddMenu)}
              disabled={!isInteractive}
              variant="primary"
              size="icon"
              className={`h-10 w-10 shadow-lg shadow-[var(--brand-primary)]/20 transition-all hover:scale-105 active:scale-95 ${showAddMenu ? 'rotate-45 bg-slate-800 hover:bg-slate-900' : 'bg-[var(--brand-primary)] hover:brightness-110'}`}
              icon={<Plus className="w-5 h-5 text-white" />}
            />
          </Tooltip>

          {showAddMenu && isInteractive && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-white/95 backdrop-blur-md rounded-[var(--radius-lg)] shadow-xl border border-white/20 ring-1 ring-black/5 p-1 flex flex-col gap-0.5 z-50 animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 origin-bottom pointer-events-auto">
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Add to Canvas</div>

              <Button onClick={() => { onAddNode(getCenter()); setShowAddMenu(false); }} variant="ghost" className="w-full justify-start h-9 px-3 text-sm rounded-[var(--radius-sm)] hover:bg-indigo-50 hover:text-[var(--brand-primary)] transition-colors" icon={<Square className="w-4 h-4 mr-2" />}>
                Node
              </Button>
              <Button onClick={() => { onAddAnnotation(getCenter()); setShowAddMenu(false); }} variant="ghost" className="w-full justify-start h-9 px-3 text-sm rounded-[var(--radius-sm)] hover:bg-yellow-50 hover:text-yellow-600 transition-colors" icon={<StickyNote className="w-4 h-4 mr-2" />}>
                Sticky Note
              </Button>
              <Button onClick={() => { onAddSection(getCenter()); setShowAddMenu(false); }} variant="ghost" className="w-full justify-start h-9 px-3 text-sm rounded-[var(--radius-sm)] hover:bg-blue-50 hover:text-blue-600 transition-colors" icon={<Group className="w-4 h-4 mr-2" />}>
                Section
              </Button>
              <Button onClick={() => { onAddText(getCenter()); setShowAddMenu(false); }} variant="ghost" className="w-full justify-start h-9 px-3 text-sm rounded-[var(--radius-sm)] hover:bg-slate-100 transition-colors" icon={<Type className="w-4 h-4 mr-2" />}>
                Text
              </Button>
              <div className="h-px bg-slate-100 my-1 mx-2" />
              <Button onClick={() => fileInputRef.current?.click()} variant="ghost" className="w-full justify-start h-9 px-3 text-sm rounded-[var(--radius-sm)] hover:bg-pink-50 hover:text-pink-600 transition-colors" icon={<ImageIcon className="w-4 h-4 mr-2" />}>
                Image
              </Button>
            </div>
          )}
        </div>

        <Tooltip text="Auto Layout">
          <Button
            onClick={() => onLayout()}
            disabled={!isInteractive}
            variant="ghost"
            size="icon"
            className="rounded-[var(--radius-sm)] h-9 w-9 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
            icon={<Workflow className="w-4 h-4" />}
          />
        </Tooltip>

        <Tooltip text="Clear Canvas">
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
      <div className="flex items-center gap-0.5">
        <Tooltip text="Undo (Ctrl+Z)">
          <Button
            onClick={onUndo}
            disabled={!canUndo || !isInteractive}
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            icon={<Undo2 className="w-4 h-4" />}
          />
        </Tooltip>
        <Tooltip text="Redo (Ctrl+Y)">
          <Button
            onClick={onRedo}
            disabled={!canRedo || !isInteractive}
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            icon={<Redo2 className="w-4 h-4" />}
          />
        </Tooltip>
      </div>

    </div>
  );
};