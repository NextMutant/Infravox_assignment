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
  DragCancelEvent,
  defaultDropAnimationSideEffects
} from "@dnd-kit/core";
import { 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from "@dnd-kit/sortable";
import { Column } from "./Column";
import { Card } from "./Card";
import { RemoteDragSlot } from "./RemoteDragSlot";
import { useBoardStore } from "@/hooks/useBoardStore";
import { broadcastMessage } from "@/lib/broadcast";
import { buildColumnRenderItems } from "@/lib/remote-drag-render";

const DRAG_PREVIEW_THROTTLE_MS = 80;

export const BoardColumns = () => {
  const { board, searchQuery, priorityFilter, moveCard, tabId, remoteDrags, activeTabs, setIsDragging } = useBoardStore();
  const { columnOrder, columns, cards } = board;

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const lastPreviewRef = React.useRef<{
    cardId: string;
    toColumnId: string;
    toIndex: number;
  } | null>(null);
  const previewThrottleRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the TRUE origin of the drag — never mutated by silent drag-over moves
  const dragSourceRef = React.useRef<{
    cardId: string;
    columnId: string;
    index: number;
  } | null>(null);

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

  const broadcastDragEnd = (cardId: string) => {
    broadcastMessage({
      type: "card:drag-end",
      originTabId: tabId,
      cardId,
    });
    lastPreviewRef.current = null;
    if (previewThrottleRef.current) {
      clearTimeout(previewThrottleRef.current);
      previewThrottleRef.current = null;
    }
  };

  const sendDragPreview = (
    cardId: string,
    toColumnId: string,
    toIndex: number
  ) => {
    const last = lastPreviewRef.current;
    if (
      last &&
      last.cardId === cardId &&
      last.toColumnId === toColumnId &&
      last.toIndex === toIndex
    ) {
      return;
    }

    lastPreviewRef.current = { cardId, toColumnId, toIndex };
    broadcastMessage({
      type: "card:drag-preview",
      originTabId: tabId,
      cardId,
      toColumnId,
      toIndex,
    });
  };

  const scheduleDragPreview = (
    cardId: string,
    toColumnId: string,
    toIndex: number
  ) => {
    if (previewThrottleRef.current) {
      clearTimeout(previewThrottleRef.current);
    }

    previewThrottleRef.current = setTimeout(() => {
      sendDragPreview(cardId, toColumnId, toIndex);
      previewThrottleRef.current = null;
    }, DRAG_PREVIEW_THROTTLE_MS);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = event.active.id as string;
    const columnId = findContainer(cardId);

    if (!columnId) return;

    const fromIndex = columns[columnId].cardIds.indexOf(cardId);
    setActiveId(cardId);
    setIsDragging(true);

    // Capture the original source — drag-over silent moves will shift findContainer
    // away from this column, so we must freeze it here.
    dragSourceRef.current = { cardId, columnId, index: fromIndex };

    broadcastMessage({
      type: "card:drag-start",
      originTabId: tabId,
      cardId,
      fromColumnId: columnId,
      fromIndex,
    });
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) {
      return;
    }

    const activeIndex = columns[activeContainer].cardIds.indexOf(activeId);
    const overIndex = columns[overContainer].cardIds.indexOf(overId);

    let newIndex: number;
    if (overId in columns) {
      newIndex = activeContainer === overContainer
        ? columns[overContainer].cardIds.length - 1
        : columns[overContainer].cardIds.length;
    } else {
      const isBelowLastItem = 
          over &&
          active.rect.current.translated &&
          active.rect.current.translated.top > over.rect.top + over.rect.height;
      
      const modifier = isBelowLastItem ? 1 : 0;
      newIndex = overIndex >= 0 ? overIndex + modifier : columns[overContainer].cardIds.length;
    }

    if (activeIndex === newIndex && activeContainer === overContainer) {
      return;
    }

    moveCard(activeId, activeContainer, overContainer, activeIndex, newIndex, true);
    scheduleDragPreview(activeId, overContainer, newIndex);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeCardId = active.id as string;
    const origin = dragSourceRef.current;
    dragSourceRef.current = null;

    if (!over) {
      // Revert silent drag-over moves if drag is cancelled
      if (origin) {
        const currentContainer = findContainer(activeCardId);
        if (currentContainer) {
          const currentIndex = columns[currentContainer].cardIds.indexOf(activeCardId);
          moveCard(activeCardId, currentContainer, origin.columnId, currentIndex, origin.index, true);
        }
      }
      setIsDragging(false);
      broadcastDragEnd(activeCardId);
      setActiveId(null);
      return;
    }

    const overId = over.id as string;

    const activeContainer = findContainer(activeCardId); // current column (may be destination after silent moves)
    const overContainer = findContainer(overId);

    if (activeContainer && overContainer) {
      const activeIndex = columns[activeContainer].cardIds.indexOf(activeCardId);
      let overIndex = columns[overContainer].cardIds.indexOf(overId);

      if (overIndex === -1) {
        overIndex = columns[overContainer].cardIds.length;
      }

      setIsDragging(false);

      // Update local state — pass tabId as originTabId to SUPPRESS the internal
      // broadcast, because it would emit the wrong fromColumnId (already destination).
      moveCard(activeCardId, activeContainer, overContainer, activeIndex, overIndex, false, tabId);

      // Manually broadcast with the ORIGINAL source column captured at drag-start.
      // This is the only position remote tabs know about — they never applied the
      // silent drag-over moves, so their card is still at origin.columnId.
      broadcastMessage({
        type: "card:move",
        originTabId: tabId,
        cardId: activeCardId,
        fromColumnId: origin?.columnId ?? activeContainer,
        toColumnId: overContainer,
        fromIndex: origin?.index ?? activeIndex,
        toIndex: overIndex,
      });
    } else {
      setIsDragging(false);
    }

    broadcastDragEnd(activeCardId);
    setActiveId(null);
  };

  const handleDragCancel = (event: DragCancelEvent) => {
    const activeCardId = event.active.id as string;
    const origin = dragSourceRef.current;
    dragSourceRef.current = null;

    if (origin) {
      const currentContainer = findContainer(activeCardId);
      if (currentContainer) {
        const currentIndex = columns[currentContainer].cardIds.indexOf(activeCardId);
        moveCard(activeCardId, currentContainer, origin.columnId, currentIndex, origin.index, true);
      }
    }

    setIsDragging(false);
    broadcastDragEnd(activeCardId);
    setActiveId(null);
  };

  React.useEffect(() => {
    return () => {
      if (previewThrottleRef.current) {
        clearTimeout(previewThrottleRef.current);
      }
    };
  }, []);

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  // Derive banner info from active remote drags (other tabs only)
  const remoteDragEntries = Object.values(remoteDrags).filter(
    (drag) => drag.originTabId !== tabId
  );
  const showRemoteBanner = remoteDragEntries.length > 0;

  // Build a readable label for single-drag banner
  const buildBannerLabel = (): string => {
    if (remoteDragEntries.length === 0) return "";
    if (remoteDragEntries.length > 1) {
      return `${remoteDragEntries.length} tabs are moving cards…`;
    }
    const drag = remoteDragEntries[0];
    const tabLabel = activeTabs[drag.originTabId]?.alias ?? "Another tab";
    const cardTitle = cards[drag.cardId]?.title;
    return cardTitle
      ? `${tabLabel} is moving "${cardTitle.length > 30 ? cardTitle.slice(0, 30) + "…" : cardTitle}"…`
      : `${tabLabel} is moving a card…`;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Live cross-tab drag activity banner — slides in when another tab starts dragging */}
      {showRemoteBanner && (
        <div className="flex items-center justify-center gap-3 px-6 py-2.5 bg-accent-muted border-b border-accent/20 animate-in slide-in-from-top-1 duration-300">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
          <span className="text-[12px] font-semibold text-accent">
            {buildBannerLabel()}
          </span>
        </div>
      )}
      <div className="flex-1 overflow-x-auto p-8 flex gap-8 items-start scrollbar-hide">
        {columnOrder.map((columnId) => {
          const column = columns[columnId];
          const columnCards = filteredCards.filter((card) => card.columnId === columnId);
          const orderedCards = column.cardIds
            .map(id => columnCards.find(c => c.id === id))
            .filter((c): c is typeof cards[string] => !!c);

          const renderItems = buildColumnRenderItems(
            columnId,
            column.cardIds,
            remoteDrags,
            tabId
          );

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
                {renderItems.map((item) => {
                  if (item.type === "card") {
                    const card = cards[item.cardId];
                    if (!card || card.isArchived) return null;
                    const matchesSearch = 
                      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      card.description.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesPriority = 
                      priorityFilter === "All" || card.priority === priorityFilter;
                    if (!matchesSearch || !matchesPriority) return null;
                    return <Card key={item.cardId} card={card} />;
                  }

                  if (item.type === "remote-source-ghost") {
                    return (
                      <RemoteDragSlot
                        key={`ghost-${item.drag.cardId}`}
                        drag={item.drag}
                        variant="source-ghost"
                      />
                    );
                  }

                  return (
                    <RemoteDragSlot
                      key={`preview-${item.drag.cardId}-${item.drag.previewIndex}`}
                      drag={item.drag}
                      variant="preview-slot"
                    />
                  );
                })}
              </Column>
            </SortableContext>
          );
        })}

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
