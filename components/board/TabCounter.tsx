"use client";

import * as React from "react";
import { useBoardStore } from "@/hooks/useBoardStore";

export const TabCounter = () => {
  const activeTabs = useBoardStore((state) => state.activeTabs);
  const currentTabId = useBoardStore((state) => state.tabId);
  
  const allTabs = Object.values(activeTabs);
  const count = allTabs.length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {allTabs.map((tab) => {
          const isMe = tab.id === currentTabId;
          return (
            <div 
              key={tab.id}
              className={`w-8 h-8 rounded-full ${isMe ? 'bg-accent text-white' : 'bg-accent-light text-accent'} border-2 border-surface flex items-center justify-center text-[10px] font-bold uppercase shadow-sm`}
              title={isMe ? `${tab.alias} (You)` : tab.alias}
            >
              {isMe ? 'YOU' : tab.alias.slice(0, 2)}
            </div>
          );
        })}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider leading-none">Live Now</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-sync-live animate-pulse" />
          <span className="text-sm font-semibold text-text-primary leading-tight">{count} {count === 1 ? 'Collaborator' : 'Collaborators'}</span>
        </div>
      </div>
    </div>
  );
};
