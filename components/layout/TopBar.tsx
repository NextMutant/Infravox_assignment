"use client";

import * as React from "react";
import { Input } from "@/components/ui/Input";
import { TabCounter } from "@/components/board/TabCounter";
import { Button } from "@/components/ui/Button";
import { useBoardStore } from "@/hooks/useBoardStore";
import { Priority } from "@/types";
import { useTheme } from "@/hooks/useTheme";

interface TopBarProps {
  onToggleLog: () => void;
}

export const TopBar = ({ onToggleLog }: TopBarProps) => {
  const { board, searchQuery, setSearchQuery, priorityFilter, setPriorityFilter, renameBoard, resetBoard } = useBoardStore();
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [tempTitle, setTempTitle] = React.useState(board.title);
  const { theme, setTheme } = useTheme();

  const handleResetBoard = () => {
    const confirmReset = window.confirm(
      "Are you sure you want to reset the board? This will erase all cards and columns and restore the default template board."
    );
    if (confirmReset) {
      resetBoard();
    }
  };

  const handleTitleSubmit = () => {
    if (tempTitle.trim() && tempTitle !== board.title) {
      renameBoard(tempTitle.trim());
    }
    setTempTitle(tempTitle.trim() || board.title);
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleTitleSubmit();
    if (e.key === "Escape") {
      setTempTitle(board.title);
      setIsEditingTitle(false);
    }
  };

  return (
    <header className="h-16 w-full bg-surface border-b border-border flex items-center justify-between px-6 z-40 shrink-0">
      <div className="flex items-center gap-10 flex-1">
        <div className="flex items-center gap-3 shrink-0 min-w-[200px]">
          <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shadow-sm shadow-accent/20">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </div>
          <div className="flex-1 relative group">
            {isEditingTitle ? (
              <input
                autoFocus
                className="text-[19px] font-bold text-text-black tracking-tight bg-transparent border-b-2 border-accent outline-none w-full animate-in fade-in duration-200"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleTitleKeyDown}
              />
            ) : (
              <h1 
                className="text-[19px] font-bold text-text-black tracking-tight cursor-text hover:bg-surface-secondary px-1 -mx-1 rounded transition-colors whitespace-nowrap overflow-hidden text-ellipsis"
                onClick={() => {
                  setTempTitle(board.title);
                  setIsEditingTitle(true);
                }}
              >
                {board.title}
              </h1>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 max-w-xl w-full">
          <div className="relative w-full group">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <Input 
              placeholder="Search across all cards..." 
              className="pl-11 w-full h-10 bg-surface border-border-light shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <select 
            className="h-10 px-4 bg-surface border border-border-light rounded-md text-sm font-semibold text-text-dark shadow-sm outline-none focus:ring-1 focus:ring-accent focus:border-accent"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | "All")}
          >
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <TabCounter />
        
        <button 
          onClick={handleResetBoard}
          className="w-11 h-11 flex items-center justify-center rounded-lg text-error hover:bg-error-light/40 dark:hover:bg-error-light/15 shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
          title="Reset Board"
          aria-label="Reset Board"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>

        <div className="flex items-center gap-0.5 p-1 bg-surface-secondary border border-border-light rounded-full shadow-sm shrink-0">
          <button 
            onClick={() => setTheme("light")}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
              theme === "light" 
                ? "bg-surface text-accent shadow-sm scale-100 font-semibold" 
                : "text-text-secondary hover:text-text-primary hover:bg-surface/50"
            }`}
            aria-label="Light Theme"
            title="Light Theme"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
          </button>
          <button 
            onClick={() => setTheme("dark")}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
              theme === "dark" 
                ? "bg-surface text-accent shadow-sm scale-100 font-semibold" 
                : "text-text-secondary hover:text-text-primary hover:bg-surface/50"
            }`}
            aria-label="Dark Theme"
            title="Dark Theme"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          </button>
        </div>

        <div className="h-8 w-px bg-border" />
        <Button 
          variant="ghost" 
          onClick={onToggleLog}
          className="gap-2.5 px-3 h-10 text-text-secondary hover:text-text-primary group"
        >
          <svg className="group-hover:rotate-12 transition-transform" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <span className="font-bold text-[13px] uppercase tracking-wider">Log</span>
        </Button>
      </div>
    </header>
  );
};
