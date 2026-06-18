import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/Badge";
import { Card as CardType } from "@/types";
import { useBoardStore } from "@/hooks/useBoardStore";

interface CardProps {
  card: CardType;
  isOverlay?: boolean;
}

export const Card = ({ card, isOverlay }: CardProps) => {
  const { id, title, priority, dueDate, assignee, description } = card;
  const { setSelectedCardId, selectedCardId } = useBoardStore();
  const isSelected = selectedCardId === card.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const priorityVariant = {
    High: "error",
    Medium: "warning",
    Low: "info",
  } as const;

  // Format date helper (simplified)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isOverdue = dueDate ? new Date(dueDate) < new Date(new Date().setHours(0,0,0,0)) : false;

  // If this is the ghost placeholder in the list
  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-drag-over border-2 border-dashed border-accent rounded-[16px] p-[18px] opacity-40 min-h-[120px]"
      />
    );
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => !isOverlay && setSelectedCardId(card.id)}
      className={`bg-surface border ${
        isOverlay ? 'border-accent shadow-xl scale-105 opacity-90' : 
        isSelected ? 'border-accent ring-1 ring-accent/20' : 
        'border-border'
      } rounded-[16px] p-[18px] shadow-sm hover:border-accent/40 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group select-none`}
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={priorityVariant[priority]} className="px-2.5 py-0.5 font-bold uppercase tracking-wider text-[10px]">
            {priority}
          </Badge>
          {!isOverlay && (
            <button className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity p-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="space-y-1.5">
          <h3 className="text-[14px] font-bold text-text-black leading-[1.4] tracking-tight">
            {title}
          </h3>
          {description && (
            <p className="text-[12px] text-text-secondary line-clamp-2 leading-[1.5] font-medium">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            {dueDate && (
              <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-tight ${isOverdue ? 'text-error-foreground' : 'text-text-muted'}`}>
                <svg className={isOverdue ? 'text-error-foreground' : 'text-text-muted/70'} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
                </svg>
                {formatDate(dueDate)}
              </div>
            )}
          </div>

          {assignee && (
            <div 
              className={`w-6.5 h-6.5 rounded-full ${assignee.color || 'bg-avatar-1'} border-2 border-surface flex items-center justify-center text-[10px] font-bold text-text-dark shrink-0 shadow-sm`}
              title={assignee.name}
            >
              {assignee.name.split(' ').map(n => n[0]).join('')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
