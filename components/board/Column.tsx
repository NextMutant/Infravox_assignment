import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { useBoardStore } from "@/hooks/useBoardStore";

interface ColumnProps {
  id: string;
  title: string;
  count: number;
  children?: React.ReactNode;
}

export const Column = ({ id, title, count, children }: ColumnProps) => {
  const [isAdding, setIsAdding] = React.useState(false);
  const [newCardTitle, setNewCardTitle] = React.useState("");
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [tempTitle, setTempTitle] = React.useState(title);
  
  const inputRef = React.useRef<HTMLInputElement>(null);
  const editInputRef = React.useRef<HTMLInputElement>(null);
  
  const addCard = useBoardStore((state) => state.addCard);
  const renameColumn = useBoardStore((state) => state.renameColumn);

  const { setNodeRef } = useDroppable({
    id,
  });

  React.useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  React.useEffect(() => {
    if (isEditingTitle && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleAddCard = () => {
    if (newCardTitle.trim()) {
      addCard(id, newCardTitle.trim());
      setNewCardTitle("");
      setIsAdding(false);
    }
  };

  const handleRenameSubmit = () => {
    if (tempTitle.trim() && tempTitle !== title) {
      renameColumn(id, tempTitle.trim());
    }
    setTempTitle(tempTitle.trim() || title);
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAddCard();
    if (e.key === "Escape") {
      setIsAdding(false);
      setNewCardTitle("");
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRenameSubmit();
    if (e.key === "Escape") {
      setTempTitle(title);
      setIsEditingTitle(false);
    }
  };

  return (
    <div 
      ref={setNodeRef}
      className="flex flex-col bg-board-muted/50 border border-border-light rounded-[20px] p-4 w-[310px] min-w-[310px] shrink-0 h-full"
    >
      <div className="flex items-center justify-between mb-5 px-1 group/header">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {isEditingTitle ? (
            <input
              ref={editInputRef}
              className="text-[14px] font-bold text-text-darker tracking-tight bg-transparent border-b border-accent outline-none w-full"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
            />
          ) : (
            <div 
              className="flex items-center gap-2 cursor-text group/title min-w-0 flex-1"
              onDoubleClick={() => setIsEditingTitle(true)}
            >
              <h2 className="text-[14px] font-bold text-text-darker tracking-tight truncate">
                {title}
              </h2>
              <svg 
                className="opacity-0 group-hover/title:opacity-100 transition-opacity text-text-muted shrink-0" 
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </div>
          )}
          <span className="flex items-center justify-center min-w-[22px] h-5.5 px-1.5 rounded-full bg-surface border border-border text-[11px] font-bold text-text-secondary shrink-0">
            {count}
          </span>
        </div>
        <button className="text-text-muted hover:text-text-primary transition-colors p-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto pr-1 -mr-1 scrollbar-hide">
        {children}
        
        {count === 0 && !isAdding && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-border/40 rounded-2xl bg-surface-secondary/30 min-h-[120px] animate-in fade-in duration-500">
            <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center mb-3">
              <svg className="text-text-muted/60" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Empty Column</p>
            <p className="text-[10px] text-text-muted/80 mt-1">Drop cards here</p>
          </div>
        )}
        
        {isAdding && (
          <div className="bg-surface border border-accent rounded-[16px] p-[18px] shadow-md ring-1 ring-accent/20 animate-in fade-in slide-in-from-top-2 duration-200">
            <input
              ref={inputRef}
              className="w-full bg-transparent border-none outline-none text-[14px] font-bold text-text-black placeholder:text-text-muted"
              placeholder="What needs to be done?"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newCardTitle.trim()) setIsAdding(false);
              }}
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <button 
                onClick={() => setIsAdding(false)}
                className="text-[11px] font-bold text-text-muted hover:text-text-primary px-2 py-1"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddCard}
                className="text-[11px] font-bold bg-accent text-white px-3 py-1 rounded-md"
              >
                Add Card
              </button>
            </div>
          </div>
        )}
      </div>
      
      {!isAdding && (
        <button 
          onClick={() => setIsAdding(true)}
          className="mt-4 group flex items-center gap-2.5 w-full py-2.5 px-1 text-text-muted hover:text-accent transition-colors"
        >
          <div className="w-5 h-5 rounded-md border-2 border-dashed border-border group-hover:border-accent flex items-center justify-center transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span className="text-[13px] font-bold tracking-tight">Add new card</span>
        </button>
      )}
    </div>
  );
};
