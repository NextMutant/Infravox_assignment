"use client";

import * as React from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useBoardStore } from "@/hooks/useBoardStore";
import { Priority, CommentItem } from "@/types";
import { TEAM_MEMBERS } from "@/lib/board-storage";
const CARD_COLORS = [
  { value: "default", className: "bg-white border" },
  { value: "blue", className: "bg-blue-400" },
  { value: "green", className: "bg-green-400" },
  { value: "yellow", className: "bg-yellow-300" },
  { value: "red", className: "bg-red-400" },
] as const;

export const CardEditor = () => {
  const { selectedCardId, setSelectedCardId, board, updateCard, deleteCard, addComment } = useBoardStore();
  const card = selectedCardId ? board.cards[selectedCardId] : null;

  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);
  const [newComment, setNewComment] = React.useState("");
  
  // Local state for inputs to avoid store/log spam
  // Initialized on mount (key reset ensures this runs when selection changes)
  const [localTitle, setLocalTitle] = React.useState(card?.title || "");
  const [localDesc, setLocalDesc] = React.useState(card?.description || "");

  if (!card) return null;

  const isOverdue = card.dueDate ? new Date(card.dueDate) < new Date(new Date().setHours(0,0,0,0)) : false;

  const handleTitleBlur = () => {
    if (localTitle !== card.title) {
      updateCard(card.id, { title: localTitle });
    }
  };

  const handleDescBlur = () => {
    if (localDesc !== card.description) {
      updateCard(card.id, { description: localDesc });
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      addComment(card.id, newComment.trim());
      setNewComment("");
    }
  };

  const handleDelete = () => {
    deleteCard(card.id);
    setSelectedCardId(null);
    setIsConfirmingDelete(false);
  };

  const handleArchive = () => {
    updateCard(card.id, { isArchived: true });
    setSelectedCardId(null);
  };

  return (
    <div className="w-96 border-l border-border bg-surface flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right duration-300 ease-out">
      <div className="h-16 flex items-center justify-between px-6 border-b border-border shrink-0">
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Card Details</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-8 h-8 p-0"
          onClick={() => setSelectedCardId(null)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scrollbar-hide">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Title</label>
          <Input 
            value={localTitle} 
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="w-full text-sm font-semibold py-2" 
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Description</label>
          <textarea 
            className="w-full h-32 bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-none"
            placeholder="Add a more detailed description..."
            value={localDesc}
            onChange={(e) => setLocalDesc(e.target.value)}
            onBlur={handleDescBlur}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Priority</label>
            <select 
              className="w-full h-9 px-3 bg-surface border border-border rounded-md text-sm font-medium text-text-secondary outline-none focus:ring-1 focus:ring-accent"
              value={card.priority}
              onChange={(e) => updateCard(card.id, { priority: e.target.value as Priority })}
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Due Date</label>
            <Input 
              type="date" 
              className={`w-full h-9 ${isOverdue ? 'text-error-foreground bg-error-lightest border-error/20' : ''}`} 
              value={card.dueDate || ""} 
              onChange={(e) => updateCard(card.id, { dueDate: e.target.value || null })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Assignee</label>
          <select 
            className="w-full h-11 px-3 bg-surface border border-border rounded-lg text-sm font-semibold text-text-dark outline-none focus:ring-1 focus:ring-accent"
            value={card.assignee?.id || ""}
            onChange={(e) => {
              const member = TEAM_MEMBERS.find(m => m.id === e.target.value);
              updateCard(card.id, { assignee: member || null });
            }}
          >
            <option value="">Unassigned</option>
            {TEAM_MEMBERS.map(member => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
            Card Color
          </label>

        <div className="flex gap-3">
         {CARD_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() =>
          updateCard(card.id, {
            color: color.value,
          })
        }
        className={`
          h-8
          w-8
          rounded-full
          transition-all
          ${color.className}
          ${
            card.color === color.value
              ? "ring-2 ring-accent ring-offset-2"
              : "hover:scale-110"
          }
        `}
      />
    ))}
          </div>
        </div>

        {/* Comments Section */}
        <div className="space-y-4 pt-4 border-t border-border">
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Comments</label>
          
          <div className="flex flex-col gap-3">
            {card.comments.map((comment) => (
              <div key={comment.id} className="bg-surface-secondary border border-border-light rounded-xl p-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-text-dark">{comment.author}</span>
                  <span className="text-[10px] text-text-muted">{new Date(comment.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-[13px] text-text-secondary leading-relaxed">{comment.text}</p>
              </div>
            ))}
          </div>

          <div className="relative">
            <textarea 
              className="w-full h-24 bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent resize-none"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            <Button 
              size="sm" 
              className="absolute bottom-3 right-3 h-8 px-3 rounded-lg text-[11px] font-bold"
              onClick={handleAddComment}
              disabled={!newComment.trim()}
            >
              Post
            </Button>
          </div>
        </div>

        <div className="mt-4 pt-6 border-t border-border flex flex-col gap-3">
          {isConfirmingDelete ? (
            <div className="bg-error-lightest border border-error/20 rounded-xl p-4 animate-in fade-in zoom-in-95 duration-200">
              <p className="text-[13px] font-bold text-error-foreground mb-3 text-center">Are you sure you want to delete this card?</p>
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  className="flex-1 text-[12px] h-9 rounded-lg" 
                  onClick={() => setIsConfirmingDelete(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1 text-[12px] h-9 rounded-lg" 
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button 
                variant="secondary" 
                className="w-full justify-start gap-3 text-text-secondary rounded-lg"
                onClick={handleArchive}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 8v13H3V8" /><path d="M1 3h22v5H1z" /><path d="M10 12h4" />
                </svg>
                Archive Card
              </Button>
              <Button 
                variant="destructive" 
                className="w-full justify-start gap-3 rounded-lg"
                onClick={() => setIsConfirmingDelete(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                Delete Card
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
