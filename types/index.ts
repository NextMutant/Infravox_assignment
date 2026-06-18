export type Priority = 'Low' | 'Medium' | 'High';

export type Assignee = {
  id: string;
  name: string;
  avatar?: string;
  color?: string; // For initials background
};

export type CommentItem = {
  id: string;
  text: string;
  author: string;
  createdAt: string;
};

export type Card = {
  id: string;
  columnId: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  assignee: Assignee | null;
  comments: CommentItem[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Column = {
  id: string;
  title: string;
  cardIds: string[];
};

export type ActivityAction = 'created' | 'moved' | 'edited' | 'deleted' | 'renamed' | 'archived';

export type ActivityLogEntry = {
  id: string;
  action: ActivityAction;
  entityType: 'card' | 'column' | 'board';
  entityTitle: string;
  tabId: string;
  timestamp: string;
};

export type Board = {
  id: string;
  title: string;
  columnOrder: string[];
  columns: Record<string, Column>;
  cards: Record<string, Card>;
  activityLog: ActivityLogEntry[];
  lastUpdatedAt: string;
};

export type TabInfo = {
  id: string;
  alias: string;
  lastSeen: number;
};

export type BroadcastMessage =
  | { type: "board:init"; originTabId: string; board: Board }
  | { type: "board:update"; originTabId: string; board: Board }
  | { type: "card:create"; originTabId: string; card: Card; columnId: string; index: number }
  | { type: "card:update"; originTabId: string; card: Card }
  | { type: "card:delete"; originTabId: string; cardId: string; columnId: string }
  | { type: "card:move"; originTabId: string; cardId: string; fromColumnId: string; toColumnId: string; fromIndex: number; toIndex: number }
  | { type: "column:rename"; originTabId: string; columnId: string; title: string }
  | { type: "board:rename"; originTabId: string; title: string }
  | { type: "activity:add"; originTabId: string; entry: ActivityLogEntry }
  | { type: "tab:register"; tabId: string; tabAlias: string; isInitial?: boolean; targetTabId?: string }
  | { type: "tab:unregister"; tabId: string };

export type BoardState = {
  board: Board;
  searchQuery: string;
  priorityFilter: Priority | 'All';
  tabId: string;
  tabAlias: string;
  activeTabs: Record<string, TabInfo>;
  selectedCardId: string | null;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setPriorityFilter: (filter: Priority | 'All') => void;
  setSelectedCardId: (id: string | null) => void;
  
  // Board Actions
  addCard: (columnId: string, title: string, prebuiltCard?: Card, originTabId?: string) => void;
  updateCard: (cardId: string, updates: Partial<Card>, remote?: boolean, originTabId?: string) => void;
  deleteCard: (cardId: string, remote?: boolean, originTabId?: string) => void;
  addComment: (cardId: string, text: string, remote?: boolean, originTabId?: string) => void;
  moveCard: (cardId: string, fromColumnId: string, toColumnId: string, fromIndex: number, toIndex: number, silent?: boolean, originTabId?: string) => void;
  renameColumn: (columnId: string, title: string, remote?: boolean, originTabId?: string) => void;
  renameBoard: (title: string, remote?: boolean, originTabId?: string) => void;
  
  // Sync Actions
  hydrateBoard: (board: Board) => void;
  registerTab: (tabId: string, alias?: string) => void;
  unregisterTab: (tabId: string) => void;
  pruneTabs: (threshold: number) => void;
};
