import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoveRight, MoveLeft, ChevronUp, ChevronDown } from 'lucide-react';

export interface SortableDashboardWidgetProps {
  id: string;
  index: number;
  totalInZone: number;
  zone: 'main' | 'sidebar';
  title: string;
  children: React.ReactNode;
  onMoveZone?: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const SortableDashboardWidget: React.FC<SortableDashboardWidgetProps> = ({
  id,
  index,
  totalInZone,
  zone,
  title,
  children,
  onMoveZone,
  onMoveUp,
  onMoveDown,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const positionNumber = index + 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`dashboard-widget-${id}`}
      className={`group/widget relative transition-all duration-150 ${
        isDragging 
          ? 'opacity-35 scale-[0.99] ring-2 ring-blue-500 ring-offset-2 rounded-2xl' 
          : ''
      }`}
    >
      {/* Widget Drag & Position Header Bar */}
      <div className="flex items-center justify-between pb-1.5 pt-0.5 px-1 select-none">
        {/* Left: Drag Handle & Position Badge */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center gap-2 cursor-grab active:cursor-grabbing text-slate-500 hover:text-blue-600 py-0.5 px-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          title={`Drag to reorder "${title}" (Current Position: #${positionNumber})`}
        >
          <GripVertical className="w-3.5 h-3.5 text-slate-400 group-hover/widget:text-blue-500 shrink-0" />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black tracking-tight px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
              #{positionNumber}
            </span>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hidden sm:inline truncate max-w-[200px]">
              {title}
            </span>
          </div>
        </div>

        {/* Right: Quick Rearrange Nudge Controls */}
        <div className="flex items-center gap-1 opacity-70 group-hover/widget:opacity-100 transition-opacity">
          {/* Move Up */}
          {onMoveUp && (
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              className={`p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                index === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
              }`}
              title="Move Widget Up (Upar Karein)"
              aria-label="Move Up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Move Down */}
          {onMoveDown && (
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index >= totalInZone - 1}
              className={`p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                index >= totalInZone - 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
              }`}
              title="Move Widget Down (Neechay Karein)"
              aria-label="Move Down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Switch Zone Column */}
          {onMoveZone && (
            <button
              type="button"
              onClick={() => onMoveZone(id)}
              className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer"
              title={zone === 'main' ? 'Move to Sidebar Column (4-Col)' : 'Move to Main Column (8-Col)'}
            >
              {zone === 'main' ? (
                <>
                  <span className="hidden lg:inline">To Sidebar</span>
                  <MoveRight className="w-3 h-3" />
                </>
              ) : (
                <>
                  <MoveLeft className="w-3 h-3" />
                  <span className="hidden lg:inline">To Main</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Widget Body */}
      <div>
        {children}
      </div>
    </div>
  );
};
