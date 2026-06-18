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

  setSearchQuery: (query) => set({ searchQuery: query }),
  setPriorityFilter: (filter) => set({ priorityFilter: filter }),
  setSelectedCardId: (id) => set({ selectedCardId: id }),

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
    
    // Remove from source and ensure no duplicates or leftover instances remain anywhere in the source column
    const sourceCardIds = (newColumns[fromColumnId]?.cardIds || []).filter((id) => id !== cardId);
    newColumns[fromColumnId] = { ...newColumns[fromColumnId], cardIds: sourceCardIds };

    // If target column is different, defensively clear any accidental presence of this cardId there first
    const destCardIds = fromColumnId === toColumnId 
      ? [...sourceCardIds] 
      : (newColumns[toColumnId]?.cardIds || []).filter((id) => id !== cardId);
    
    // Safely insert into correct index
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

  hydrateBoard: (board) => set({ board }),

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
