import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { BoardState, Board, ActivityLogEntry, ActivityAction, Card, CommentItem, TabInfo } from "@/types";
import { generateId } from "@/lib/ids";
import { createSeedBoard, TEAM_MEMBERS, getRandomAlias } from "@/lib/board-storage";
import { broadcastMessage } from "@/lib/broadcast";

const MAX_LOG_ENTRIES = 20;

const addLogEntry = (
  log: ActivityLogEntry[],
  action: ActivityAction,
  entityType: 'card' | 'column' | 'board',
  entityTitle: string,
  tabId: string
): ActivityLogEntry[] => {
  const newEntry: ActivityLogEntry = {
    id: generateId(),
    action,
    entityType,
    entityTitle,
    tabId,
    timestamp: new Date().toISOString(),
  };
  return [newEntry, ...log].slice(0, MAX_LOG_ENTRIES);
};

export const useBoardStore = create<BoardState>()(
  subscribeWithSelector((set, get) => ({
    board: createSeedBoard(),
    searchQuery: "",
    priorityFilter: "All",
    tabId: typeof window !== "undefined" ? generateId() : "server",
    tabAlias: typeof window !== "undefined" ? getRandomAlias() : "System",
    activeTabs: {},
    selectedCardId: null,
    remoteDrags: {},
    isDragging: false,

    setSearchQuery: (query) => set({ searchQuery: query }),
    setPriorityFilter: (filter) => set({ priorityFilter: filter }),
    setSelectedCardId: (id) => set({ selectedCardId: id }),
    setIsDragging: (dragging) => set({ isDragging: dragging }),

    addCard: (columnId, title, prebuiltCard, originTabId) => set((state) => {
      const cardId = prebuiltCard?.id || generateId();
      const newCard: Card = prebuiltCard || {
        id: cardId,
        columnId,
        title,
        description: "",
        priority: "Medium",
        dueDate: null,
        assignee: null,
        comments: [],
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        color: "default",
      };

      const newCards = { ...state.board.cards, [cardId]: newCard };
      const newColumn = {
        ...state.board.columns[columnId],
        cardIds: [...state.board.columns[columnId].cardIds, cardId],
      };
      const newColumns = { ...state.board.columns, [columnId]: newColumn };

      const newLog = addLogEntry(
        state.board.activityLog,
        "created",
        "card",
        newCard.title,
        originTabId || state.tabId
      );

      const newState = {
        board: {
          ...state.board,
          cards: newCards,
          columns: newColumns,
          activityLog: newLog,
          lastUpdatedAt: new Date().toISOString(),
        },
      };

      if (!prebuiltCard) {
        broadcastMessage({
          type: "card:create",
          originTabId: state.tabId,
          card: newCard,
          columnId,
          index: newColumn.cardIds.length - 1,
        });
      }

      return newState;
    }),

    updateCard: (cardId, updates, remote, originTabId) => set((state) => {
      const card = state.board.cards[cardId];
      if (!card) return state;

      const updatedCard = { ...card, ...updates, updatedAt: new Date().toISOString() };
      const newCards = { ...state.board.cards, [cardId]: updatedCard };

      // If archived status changed, log it specifically
      let action: ActivityAction = "edited";
      if (updates.isArchived === true && card.isArchived === false) action = "archived";

      const newLog = addLogEntry(
        state.board.activityLog,
        action,
        "card",
        updatedCard.title,
        originTabId || state.tabId
      );

      const newState = {
        board: {
          ...state.board,
          cards: newCards,
          activityLog: newLog,
          lastUpdatedAt: new Date().toISOString(),
        },
      };

      if (!remote) {
        broadcastMessage({
          type: "card:update",
          originTabId: state.tabId,
          card: updatedCard,
        });
      }

      return newState;
    }),

    addComment: (cardId, text, remote, originTabId) => set((state) => {
      const card = state.board.cards[cardId];
      if (!card) return state;

      const newComment: CommentItem = {
        id: generateId(),
        text,
        author: state.tabAlias,
        createdAt: new Date().toISOString(),
      };

      const updatedCard = {
        ...card,
        comments: [...card.comments, newComment],
        updatedAt: new Date().toISOString(),
      };

      const newCards = { ...state.board.cards, [cardId]: updatedCard };

      const newLog = addLogEntry(
        state.board.activityLog,
        "edited",
        "card",
        `${card.title} (new comment)`,
        originTabId || state.tabId
      );

      const newState = {
        board: {
          ...state.board,
          cards: newCards,
          activityLog: newLog,
          lastUpdatedAt: new Date().toISOString(),
        },
      };

      if (!remote) {
        broadcastMessage({
          type: "card:update",
          originTabId: state.tabId,
          card: updatedCard,
        });
      }

      return newState;
    }),

    deleteCard: (cardId, remote, originTabId) => set((state) => {
      const card = state.board.cards[cardId];
      if (!card) return state;

      const { [cardId]: deletedCard, ...newCards } = state.board.cards;
      const column = state.board.columns[card.columnId];
      const newColumn = {
        ...column,
        cardIds: column.cardIds.filter((id) => id !== cardId),
      };
      const newColumns = { ...state.board.columns, [card.columnId]: newColumn };

      const newLog = addLogEntry(
        state.board.activityLog,
        "deleted",
        "card",
        card.title,
        originTabId || state.tabId
      );

      const newState = {
        board: {
          ...state.board,
          cards: newCards,
          columns: newColumns,
          activityLog: newLog,
          lastUpdatedAt: new Date().toISOString(),
        },
      };

      if (!remote) {
        broadcastMessage({
          type: "card:delete",
          originTabId: state.tabId,
          cardId,
          columnId: card.columnId,
        });
      }

      return newState;
    }),

    moveCard: (cardId, fromColumnId, toColumnId, fromIndex, toIndex, silent, originTabId) => set((state) => {
      const card = state.board.cards[cardId];
      if (!card) return state;

      const newColumns = { ...state.board.columns };

      // 1. Remove cardId from all columns to prevent any duplicate references
      Object.keys(newColumns).forEach((colId) => {
        newColumns[colId] = {
          ...newColumns[colId],
          cardIds: (newColumns[colId]?.cardIds || []).filter((id) => id !== cardId),
        };
      });

      // 2. Safely insert into target column at toIndex
      const destCardIds = [...(newColumns[toColumnId]?.cardIds || [])];
      const targetIndex = Math.min(Math.max(0, toIndex), destCardIds.length);
      destCardIds.splice(targetIndex, 0, cardId);
      newColumns[toColumnId] = { ...newColumns[toColumnId], cardIds: destCardIds };

      // Update card's columnId
      const newCards = {
        ...state.board.cards,
        [cardId]: { ...card, columnId: toColumnId, updatedAt: new Date().toISOString() },
      };

      if (silent) {
        return {
          board: {
            ...state.board,
            columns: newColumns,
            cards: newCards,
          },
        };
      }

      const newLog = addLogEntry(
        state.board.activityLog,
        "moved",
        "card",
        card.title,
        originTabId || state.tabId
      );

      if (!originTabId) {
        broadcastMessage({
          type: "card:move",
          originTabId: state.tabId,
          cardId,
          fromColumnId,
          toColumnId,
          fromIndex,
          toIndex,
        });
      }

      return {
        board: {
          ...state.board,
          columns: newColumns,
          cards: newCards,
          activityLog: newLog,
          lastUpdatedAt: new Date().toISOString(),
        },
      };
    }),

    renameColumn: (columnId, title, remote, originTabId) => set((state) => {
      const column = state.board.columns[columnId];
      if (!column) return state;

      const newColumns = {
        ...state.board.columns,
        [columnId]: { ...column, title },
      };

      const newLog = addLogEntry(
        state.board.activityLog,
        "renamed",
        "column",
        title,
        originTabId || state.tabId
      );

      const newState = {
        board: {
          ...state.board,
          columns: newColumns,
          activityLog: newLog,
          lastUpdatedAt: new Date().toISOString(),
        },
      };

      if (!remote) {
        broadcastMessage({
          type: "column:rename",
          originTabId: state.tabId,
          columnId,
          title,
        });
      }

      return newState;
    }),

    renameBoard: (title, remote, originTabId) => set((state) => {
      const newLog = addLogEntry(
        state.board.activityLog,
        "renamed",
        "board",
        title,
        originTabId || state.tabId
      );

      const newState = {
        board: {
          ...state.board,
          title,
          activityLog: newLog,
          lastUpdatedAt: new Date().toISOString(),
        },
      };

      if (!remote) {
        broadcastMessage({
          type: "board:rename",
          originTabId: state.tabId,
          title,
        });
      }

      return newState;
    }),

    resetBoard: (remote, originTabId) => set((state) => {
      const seedBoard = createSeedBoard();
      const newLog = addLogEntry(
        [],
        "created",
        "board",
        seedBoard.title,
        originTabId || state.tabId
      );

      const newBoard = {
        ...seedBoard,
        activityLog: newLog,
        lastUpdatedAt: new Date().toISOString(),
      };

      if (!remote) {
        broadcastMessage({
          type: "board:reset",
          originTabId: state.tabId,
          board: newBoard,
        });
      }

      return {
        board: newBoard,
        selectedCardId: null,
      };
    }),

    hydrateBoard: (board) => set({ board }),

    setRemoteDrag: (entry) => set((state) => ({
      remoteDrags: {
        ...state.remoteDrags,
        [entry.cardId]: {
          ...entry,
          lastUpdatedAt: Date.now(),
        },
      },
    })),

    updateRemoteDragPreview: (cardId, toColumnId, toIndex) => set((state) => {
      const existing = state.remoteDrags[cardId];
      if (!existing) return state;

      return {
        remoteDrags: {
          ...state.remoteDrags,
          [cardId]: {
            ...existing,
            previewColumnId: toColumnId,
            previewIndex: toIndex,
            lastUpdatedAt: Date.now(),
          },
        },
      };
    }),

    clearRemoteDrag: (cardId) => set((state) => {
      if (!state.remoteDrags[cardId]) return state;
      const { [cardId]: _, ...rest } = state.remoteDrags;
      return { remoteDrags: rest };
    }),

    clearRemoteDragsByTab: (originTabId) => set((state) => {
      const next: typeof state.remoteDrags = {};
      let changed = false;

      Object.entries(state.remoteDrags).forEach(([cardId, drag]) => {
        if (drag.originTabId === originTabId) {
          changed = true;
        } else {
          next[cardId] = drag;
        }
      });

      return changed ? { remoteDrags: next } : state;
    }),

    pruneStaleRemoteDrags: (maxAgeMs) => set((state) => {
      const now = Date.now();
      const next: typeof state.remoteDrags = {};
      let changed = false;

      Object.entries(state.remoteDrags).forEach(([cardId, drag]) => {
        if (now - drag.lastUpdatedAt >= maxAgeMs) {
          changed = true;
        } else {
          next[cardId] = drag;
        }
      });

      return changed ? { remoteDrags: next } : state;
    }),

    registerTab: (tabId, alias) => set((state) => ({
      activeTabs: {
        ...state.activeTabs,
        [tabId]: {
          id: tabId,
          alias: alias || state.activeTabs[tabId]?.alias || "Unknown",
          lastSeen: Date.now()
        },
      },
    })),

    unregisterTab: (tabId) => set((state) => {
      const { [tabId]: _, ...newTabs } = state.activeTabs;
      return { activeTabs: newTabs };
    }),

    pruneTabs: (threshold) => set((state) => {
      const newTabs: Record<string, TabInfo> = {};
      let changed = false;
      const now = Date.now();

      Object.entries(state.activeTabs).forEach(([id, info]) => {
        if (now - info.lastSeen < threshold) {
          newTabs[id] = info;
        } else {
          changed = true;
        }
      });

      return changed ? { activeTabs: newTabs } : state;
    }),
  }))
);
