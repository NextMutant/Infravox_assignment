"use client";

import * as React from "react";
import { useBoardStore } from "@/hooks/useBoardStore";

export const ActivityLog = () => {
  const activityLog = useBoardStore((state) => state.board.activityLog);
  const activeTabs = useBoardStore((state) => state.activeTabs);
  const currentTabId = useBoardStore((state) => state.tabId);

  // Simple relative time helper
  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return then.toLocaleDateString();
  };

  return (
    <aside className="w-80 border-l border-border bg-surface flex flex-col shrink-0 overflow-hidden">
      <div className="h-16 flex items-center px-6 border-b border-border shrink-0">
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Activity Log</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {activityLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-xs text-text-muted font-medium">No activity yet</p>
          </div>
        ) : (
          activityLog.map((activity) => {
            const isMe = activity.tabId === currentTabId;
            const alias = isMe ? "You" : (activeTabs[activity.tabId]?.alias || `Tab ${activity.tabId.slice(0, 4)}`);
            
            return (
              <div key={activity.id} className="bg-surface border border-border-light rounded-xl p-3 shadow-sm hover:border-accent/20 transition-all">
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full ${isMe ? 'bg-accent text-white' : 'bg-accent-light text-accent'} flex items-center justify-center text-[10px] font-bold shrink-0 uppercase`}>
                      {alias.slice(0, 2)}
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-text-dark leading-snug">
                        <span className="font-bold">
                          {activity.tabId === "system" ? "System" : alias}
                        </span> {activity.action} <span className="font-semibold text-accent">{activity.entityTitle}</span>
                      </p>
                      <span className="text-[10px] text-text-muted font-medium uppercase tracking-tight">{getRelativeTime(activity.timestamp)}</span>
                    </div>
                  </div>
              </div>
            );
          })
        )}

        <div className="mt-4 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-border-light rounded-2xl bg-surface-secondary/50">
          <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center mb-2">
            <svg className="text-text-muted" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20v-6M9 20v-10M15 20v-2M12 4v4" />
            </svg>
          </div>
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">End Of History</p>
        </div>
      </div>
    </aside>
  );
};
