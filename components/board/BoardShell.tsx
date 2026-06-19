"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { TopBar } from "@/components/layout/TopBar";
import { useState } from "react";
import { useBoardStore } from "@/hooks/useBoardStore";
import { usePersistence } from "@/hooks/usePersistence";
import { useSync } from "@/hooks/useSync";

const BoardColumns = dynamic(() => import("./BoardColumns").then(mod => mod.BoardColumns), {
  ssr: false,
  loading: () => <div className="flex-1 bg-surface-secondary/30 animate-pulse" />
});

const ActivityLog = dynamic(() => import("./ActivityLog").then(mod => mod.ActivityLog), {
  ssr: false
});

const CardEditor = dynamic(() => import("./CardEditor").then(mod => mod.CardEditor), {
  ssr: false
});

export const BoardShell = () => {
  const [showLog, setShowLog] = useState(true);
  const selectedCardId = useBoardStore((state) => state.selectedCardId);
  usePersistence();
  useSync();

  return (
    <div className="flex flex-col h-screen bg-textured font-sans overflow-hidden">
      <TopBar onToggleLog={() => setShowLog(!showLog)} />
      
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col max-w-[1440px] mx-auto w-full overflow-hidden">
          <main className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex-1 bg-surface border border-border rounded-[24px] shadow-sm overflow-hidden flex flex-col relative">
              <BoardColumns />
            </div>
          </main>
        </div>

        {selectedCardId && <CardEditor key={selectedCardId} />}
        {showLog && <ActivityLog />}
      </div>
    </div>
  );
};
