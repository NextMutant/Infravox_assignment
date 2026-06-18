import { Board, Card, Column, Assignee } from "@/types";
import { generateId } from "./ids";

const STORAGE_KEY = "infravox-board-state";

export const TEAM_MEMBERS: Assignee[] = [
  { id: "tm-1", name: "John Doe", color: "bg-avatar-1" },
  { id: "tm-2", name: "Jane Smith", color: "bg-avatar-2" },
  { id: "tm-3", name: "Mike Johnson", color: "bg-avatar-3" },
  { id: "tm-4", name: "Sarah Williams", color: "bg-avatar-4" },
  { id: "tm-5", name: "Alex Brown", color: "bg-avatar-1" },
];

export const getRandomAlias = () => {
  const randomIndex = Math.floor(Math.random() * TEAM_MEMBERS.length);
  return TEAM_MEMBERS[randomIndex].name;
};

export const saveBoard = (board: Board) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  } catch (error) {
    console.error("Failed to save board to localStorage:", error);
  }
};

export const loadBoard = (): Board | null => {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Failed to load board from localStorage:", error);
    return null;
  }
};

export const createSeedBoard = (): Board => {
  const col1Id = generateId();
  const col2Id = generateId();
  const col3Id = generateId();
  const col4Id = generateId();

  const card1Id = generateId();
  const card2Id = generateId();

  const cards: Record<string, Card> = {
    [card1Id]: {
      id: card1Id,
      columnId: col1Id,
      title: "Welcome to Infravox",
      description: "This is your new collaborative Kanban board. You can drag cards, edit details, and see changes in real-time across tabs.",
      priority: "Medium",
      dueDate: null,
      assignee: null,
      comments: [],
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    [card2Id]: {
      id: card2Id,
      columnId: col1Id,
      title: "Try dragging me",
      description: "Move this card to another column to see the activity log update.",
      priority: "Low",
      dueDate: null,
      assignee: null,
      comments: [],
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  const columns: Record<string, Column> = {
    [col1Id]: { id: col1Id, title: "To Do", cardIds: [card1Id, card2Id] },
    [col2Id]: { id: col2Id, title: "In Progress", cardIds: [] },
    [col3Id]: { id: col3Id, title: "In Review", cardIds: [] },
    [col4Id]: { id: col4Id, title: "Done", cardIds: [] },
  };

  return {
    id: generateId(),
    title: "Project Board",
    columnOrder: [col1Id, col2Id, col3Id, col4Id],
    columns,
    cards,
    activityLog: [
      {
        id: generateId(),
        action: "created",
        entityType: "board",
        entityTitle: "Project Board",
        tabId: "system",
        timestamp: new Date().toISOString(),
      },
    ],
    lastUpdatedAt: new Date().toISOString(),
  };
};
