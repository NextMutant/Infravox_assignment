import { useEffect, useRef } from "react";
import { useBoardStore } from "./useBoardStore";
import { loadBoard, saveBoard } from "@/lib/board-storage";

export const usePersistence = () => {
  const hydrateBoard = useBoardStore((state) => state.hydrateBoard);
  const isInitialMount = useRef(true);

  // Initial Hydration
  useEffect(() => {
    const savedBoard = loadBoard();
    if (savedBoard) {
      hydrateBoard(savedBoard);
    }
    // Set initial mount to false after a tiny delay to ensure 
    // the store subscription doesn't catch the hydration update
    setTimeout(() => {
      isInitialMount.current = false;
    }, 0);
  }, [hydrateBoard]);

  // Debounced Persistence
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Subscribe to state changes
    const unsub = useBoardStore.subscribe(
      (state) => state.board,
      (board) => {
        // Skip saving on the very first mount/hydration
        if (isInitialMount.current) return;

        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          saveBoard(board);
        }, 250);
      }
    );

    return () => {
      unsub();
      clearTimeout(timeoutId);
    };
  }, []);
};
