"use client";

import * as React from "react";
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent, 
  DragOverEvent, 
  DragEndEvent,
  defaultDropAnimationSideEffects
} from "@dnd-kit/core";
import { 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from "@dnd-kit/sortable";
import { Column } from "./Column";
import { Card } from "./Card";
import { useBoardStore } from "@/hooks/useBoardStore";
import { broadcastMessage } from "@/lib/broadcast";

export const BoardColumns = () => {
  const { board, searchQuery, priorityFilter, moveCard, tabId } = useBoardStore();
  const { columnOrder, columns, cards } = board;

  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredCards = React.useMemo(() => {
    return Object.values(cards).filter((card) => {
      // Don't show archived cards
      if (card.isArchived) return false;

      const matchesSearch = 
        card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPriority = 
        priorityFilter === "All" || card.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [cards, searchQuery, priorityFilter]);

  const findContainer = (id: string) => {
    if (id in columns) return id;
    const card = cards[id];
    return card ? card.columnId : null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    const activeIndex = columns[activeContainer].cardIds.indexOf(activeId);
    const overIndex = columns[overContainer].cardIds.indexOf(overId);

    let newIndex: number;
    if (overId in columns) {
      newIndex = columns[overContainer].cardIds.length;
    } else {
      const isBelowLastItem = 
        over &&
        active.rect.current.translated &&
        active.rect.current.translated.top > over.rect.top + over.rect.height;
      
      const modifier = isBelowLastItem ? 1 : 0;
      newIndex = overIndex >= 0 ? overIndex + modifier : columns[overContainer].cardIds.length;
    }

    // Update local state during drag for visual feedback
    // Note: We use silent: true to avoid flooding the activity log.
    moveCard(activeId, activeContainer, overContainer, activeIndex, newIndex, true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (activeContainer && overContainer) {
      const activeIndex = columns[activeContainer].cardIds.indexOf(activeId);
      let overIndex = columns[overContainer].cardIds.indexOf(overId);

      if (overIndex === -1) {
        // Dropped over the container itself
        overIndex = columns[overContainer].cardIds.length;
      }

      // Final move: Not silent (logs to activity) and will trigger broadcast internally
      moveCard(activeId, activeContainer, overContainer, activeIndex, overIndex, false);
    }

    setActiveId(null);
  };

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-x-auto p-8 flex gap-8 items-start scrollbar-hide">
        {columnOrder.map((columnId) => {
          const column = columns[columnId];
          const columnCards = filteredCards.filter((card) => card.columnId === columnId);
          // Maintain relative order from column.cardIds
          const orderedCards = column.cardIds
            .map(id => columnCards.find(c => c.id === id))
            .filter((c): c is typeof cards[string] => !!c);

          return (
            <SortableContext 
              key={columnId} 
              id={columnId}
              items={orderedCards.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <Column 
                id={columnId}
                title={column.title} 
                count={orderedCards.length}
              >
                {orderedCards.map((card) => (
                  <Card key={card.id} card={card} />
                ))}
              </Column>
            </SortableContext>
          );
        })}

        {/* Add Column Button (Placeholder for now) */}
        <button className="h-[54px] px-6 flex items-center gap-3 rounded-2xl text-text-muted hover:text-accent hover:bg-accent-muted/30 transition-all shrink-0 border-2 border-dashed border-border/60 font-bold text-sm tracking-tight">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Column
        </button>
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeId ? (
          <Card card={cards[activeId]} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
