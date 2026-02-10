import React from 'react';
import {
  Trash2,
  Wand2,
  Maximize,
  Plus,
  MousePointer2,
  Undo2,
  Redo2,
  Workflow,
  StickyNote,
  Group,
  Layout,
  Hand,
  Square,
} from 'lucide-react';
import { Tooltip } from './Tooltip';

interface ToolbarProps {
  onClear: () => void;
  onCommandBar: () => void;
  onFitView: () => void;
  onAddNode: () => void;
  onAddAnnotation: () => void;
  onAddSection: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onLayout: () => void;
  onTemplates: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSelectMode: boolean;
  isCommandBarOpen: boolean;
  onToggleSelectMode: () => void;
  onTogglePanMode: () => void;
}

const ToolbarDivider = () => <div className="w-px h-5 bg-slate-200 mx-1.5 self-center" />;

export const Toolbar: React.FC<ToolbarProps> = ({
  onClear,
  onCommandBar,
  onFitView,
  onAddNode,
  onAddAnnotation,
  onAddSection,
  onUndo,
  onRedo,
  onLayout,
  onTemplates,
  canUndo,
  canRedo,
  isSelectMode,
  isCommandBarOpen,
  onToggleSelectMode,
  onTogglePanMode
}) => {
  const [showAddMenu, setShowAddMenu] = React.useState(false);

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 transform-gpu">
      <div className="flex items-center p-1.5 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl border border-slate-100 ring-1 ring-slate-900/5">

        {/* Group 1: Undo/Redo */}
        <div className="flex items-center gap-0.5 px-1">
          <Tooltip text="Undo (Ctrl+Z)">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-2 rounded-xl transition-all active:scale-95 ${!canUndo ? 'text-slate-300' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
            >
              <Undo2 className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip text="Redo (Ctrl+Y)">
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-2 rounded-xl transition-all active:scale-95 ${!canRedo ? 'text-slate-300' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>

        <ToolbarDivider />

        {/* Group 2: Mode Selection */}
        <div className="flex bg-slate-100/80 p-1 rounded-xl gap-0.5 mx-1">
          <Tooltip text="Select Mode">
            <button
              onClick={onToggleSelectMode}
              className={`p-1.5 rounded-lg transition-all ${isSelectMode ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <MousePointer2 className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip text="Pan Mode">
            <button
              onClick={onTogglePanMode}
              className={`p-1.5 rounded-lg transition-all ${!isSelectMode ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <Hand className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>

        <ToolbarDivider />

        {/* Group 3: Core Actions */}
        <div className="flex items-center gap-0.5 px-1">
          <Tooltip text="Command Bar">
            <button
              onClick={onCommandBar}
              className={`p-2 rounded-xl transition-all active:scale-95 relative overflow-hidden group ${isCommandBarOpen ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
            >
              <Wand2 className="w-4 h-4" />
              <div className="absolute inset-0 bg-indigo-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </Tooltip>

          <div className="relative">
            <Tooltip text="Add Item">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className={`p-2 rounded-xl transition-all active:scale-95 ${showAddMenu ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </Tooltip>

            {showAddMenu && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-40 bg-white rounded-xl shadow-xl border border-slate-100 p-1 flex flex-col gap-0.5 z-50 animate-in slide-in-from-bottom-2 zoom-in-95 duration-200">
                <button onClick={() => { onAddNode(); setShowAddMenu(false); }} className="px-2 py-1.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors flex items-center gap-2">
                  <Square className="w-4 h-4 text-slate-400" /> Node
                </button>
                <button onClick={() => { onAddAnnotation(); setShowAddMenu(false); }} className="px-2 py-1.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-yellow-500" /> Note
                </button>
                <button onClick={() => { onAddSection(); setShowAddMenu(false); }} className="px-2 py-1.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors flex items-center gap-2">
                  <Group className="w-4 h-4 text-blue-500" /> Section
                </button>
              </div>
            )}
          </div>

          <Tooltip text="Templates">
            <button onClick={onTemplates} className="p-2 hover:bg-slate-100 rounded-xl transition-all active:scale-95 text-slate-500 hover:text-slate-900">
              <Layout className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>

        <ToolbarDivider />

        {/* Group 4: Layout & View */}
        <div className="flex items-center gap-0.5 px-1">
          <Tooltip text="Auto Layout">
            <button onClick={onLayout} className="p-2 hover:bg-slate-100 rounded-xl transition-all active:scale-95 text-slate-500 hover:text-slate-900">
              <Workflow className="w-4 h-4" />
            </button>
          </Tooltip>

          <Tooltip text="Fit View">
            <button onClick={onFitView} className="p-2 hover:bg-slate-100 rounded-xl transition-all active:scale-95 text-slate-500 hover:text-slate-900">
              <Maximize className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>

        <ToolbarDivider />

        {/* Clear */}
        <div className="flex items-center px-1">
          <Tooltip text="Clear Canvas">
            <button onClick={onClear} className="p-2 hover:bg-red-50 rounded-xl transition-all active:scale-95 text-slate-400 hover:text-red-600 group">
              <Trash2 className="w-4 h-4 group-hover:stroke-red-600 transition-colors" />
            </button>
          </Tooltip>
        </div>

      </div>
    </div>
  );
};