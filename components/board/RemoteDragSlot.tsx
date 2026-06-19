"use client";

import * as React from "react";
import { RemoteDragEntry } from "@/types";
import { useBoardStore } from "@/hooks/useBoardStore";

interface RemoteDragSlotProps {
  drag: RemoteDragEntry;
  variant: "source-ghost" | "preview-slot";
}

export const RemoteDragSlot = ({ drag, variant }: RemoteDragSlotProps) => {
  const tabAlias = useBoardStore(
    (state) => state.activeTabs[drag.originTabId]?.alias ?? "Another tab"
  );

  if (variant === "source-ghost") {
    return (
      <div className="bg-drag-over border-2 border-dashed border-accent rounded-[16px] p-[18px] min-h-[120px] flex flex-col items-center justify-center gap-2 animate-pulse">
        <div className="flex items-center gap-1.5">
          {/* Animated transit dot */}
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
          <span className="bg-accent-muted text-accent text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
            In Transit
          </span>
        </div>
        <span className="text-[10px] font-medium text-text-muted">
          by <span className="text-accent font-semibold">{tabAlias}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="relative min-h-[120px] flex flex-col justify-center">
      {/* Drop indicator bar */}
      <div className="absolute top-0 left-2 right-2 h-[3px] rounded-full bg-accent shadow-[0_0_6px_var(--color-accent)]" />
      <div className="border-2 border-dashed border-accent/60 bg-drag-over/50 rounded-[16px] p-[18px] min-h-[120px] flex flex-col items-center justify-center gap-2 mt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="bg-accent-muted text-accent text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
            Drop Here
          </span>
        </div>
        <span className="text-[10px] font-medium text-text-muted">
          from <span className="text-accent font-semibold">{tabAlias}</span>
        </span>
      </div>
    </div>
  );
};
